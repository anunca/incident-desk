import Fastify, { type FastifyRequest } from "fastify";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import staticPlugin from "@fastify/static";
import { resolve } from "node:path";
import { Registry, Counter, Histogram } from "@prometheus-io/client";
import {
  DomainError,
  type Store,
  type Actor,
  type Status,
  type Incident,
} from "./domain.js";
import {
  newToken,
  tokenHash,
  hashPassword,
  verifyPassword,
} from "./security.js";
export async function buildApp(
  store: Store,
  options: { logger?: boolean; secureCookies?: boolean } = {},
) {
  const app = Fastify({
    bodyLimit: 16384,
    logger: options.logger
      ? {
          level: process.env.LOG_LEVEL ?? "info",
          redact: [
            "req.headers.authorization",
            "req.headers.cookie",
            "req.body.password",
            'res.headers["set-cookie"]',
          ],
        }
      : false,
    trustProxy: false,
    ajv: { customOptions: { removeAdditional: false } },
  });
  const registry = new Registry();
  const requests = new Counter({
    name: "incident_http_requests_total",
    help: "Completed HTTP requests",
    labelNames: ["method", "route", "status"],
    registers: [registry],
  });
  const duration = new Histogram({
    name: "incident_http_duration_seconds",
    help: "HTTP latency",
    labelNames: ["route"],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
    registers: [registry],
  });
  const starts = new WeakMap<FastifyRequest, bigint>();
  const actors = new WeakMap<FastifyRequest, Actor>();
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
  });
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });
  app.addHook("onRequest", async (req) => {
    starts.set(req, process.hrtime.bigint());
  });
  app.addHook("onResponse", async (req, reply) => {
    const route = req.routeOptions.url ?? "unmatched";
    requests.inc({
      method: req.method,
      route,
      status: String(reply.statusCode),
    });
    const start = starts.get(req);
    if (start)
      duration.observe(
        { route },
        Number(process.hrtime.bigint() - start) / 1e9,
      );
  });
  const bearer = (req: FastifyRequest) => {
    const auth = req.headers.authorization;
    return auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
  };
  const sessionToken = (req: FastifyRequest) =>
    bearer(req) ??
    req.headers.cookie
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("session="))
      ?.slice(8);
  const authenticate = async (req: FastifyRequest) => {
    const token = sessionToken(req);
    const actor = token ? await store.session(tokenHash(token)) : undefined;
    if (!actor) throw new DomainError(401, "Authentication required");
    actors.set(req, actor);
  };
  const writeAccess = async (req: FastifyRequest) => {
    await authenticate(req);
    if (actors.get(req)!.role === "reader")
      throw new DomainError(403, "Write access required");
    if (!bearer(req) && req.headers["x-requested-with"] !== "incident-desk")
      throw new DomainError(403, "Missing CSRF header");
  };
  app.setErrorHandler((error, req, reply) => {
    const e = error as Error & { validation?: unknown; statusCode?: number };
    const status =
      e instanceof DomainError
        ? e.status
        : e.validation
          ? 400
          : e.statusCode && e.statusCode < 500
            ? e.statusCode
            : 500;
    if (status >= 500) req.log.error({ err: e }, "Request failed");
    reply.code(status).send({
      error:
        status >= 500
          ? "Internal server error"
          : e.validation
            ? "Invalid request"
            : e.message,
      requestId: req.id,
    });
  });
  app.get("/health/live", async () => ({ status: "ok" }));
  app.get("/health/ready", async (_req, reply) => {
    try {
      await store.ready();
      return { status: "ok" };
    } catch {
      return reply.code(503).send({ status: "unavailable" });
    }
  });
  app.get("/metrics", { preHandler: authenticate }, async (req, reply) => {
    if (actors.get(req)!.role !== "admin")
      throw new DomainError(403, "Admin access required");
    return reply.type(registry.contentType).send(await registry.metrics());
  });
  const dummy = await hashPassword(newToken());
  app.post<{ Body: { email: string; password: string } }>(
    "/api/session",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["email", "password"],
          properties: {
            email: { type: "string", minLength: 3, maxLength: 254 },
            password: { type: "string", minLength: 1, maxLength: 128 },
          },
        },
      },
    },
    async (req, reply) => {
      if (
        req.headers.origin &&
        req.headers["x-requested-with"] !== "incident-desk"
      )
        throw new DomainError(403, "Missing CSRF header");
      const user = await store.user(req.body.email.toLowerCase());
      const valid = await verifyPassword(
        req.body.password,
        user?.passwordHash ?? dummy,
      );
      if (!user || !valid) throw new DomainError(401, "Invalid credentials");
      const token = newToken();
      await store.saveSession(
        tokenHash(token),
        user,
        new Date(Date.now() + 8 * 3600 * 1000),
      );
      reply.header("Cache-Control", "no-store");
      reply.header(
        "Set-Cookie",
        `session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${options.secureCookies ? "; Secure" : ""}`,
      );
      return { token, role: user.role };
    },
  );
  app.delete(
    "/api/session",
    { preHandler: authenticate },
    async (req, reply) => {
      if (!bearer(req) && req.headers["x-requested-with"] !== "incident-desk")
        throw new DomainError(403, "Missing CSRF header");
      await store.deleteSession(tokenHash(sessionToken(req)!));
      return reply
        .header(
          "Set-Cookie",
          "session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
        )
        .code(204)
        .send();
    },
  );
  app.addHook("preHandler", async (req, reply) => {
    if (req.url.startsWith("/api/")) reply.header("Cache-Control", "no-store");
  });
  app.get<{ Querystring: { limit?: number; offset?: number } }>(
    "/api/incidents",
    {
      preHandler: authenticate,
      schema: {
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: {
            limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
            offset: {
              type: "integer",
              minimum: 0,
              maximum: 100000,
              default: 0,
            },
          },
        },
      },
    },
    async (req) => ({
      items: await store.list(req.query.limit ?? 20, req.query.offset ?? 0),
    }),
  );
  const idParams = {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string", format: "uuid" } },
  };
  app.get<{ Params: { id: string } }>(
    "/api/incidents/:id",
    { preHandler: authenticate, schema: { params: idParams } },
    async (req) => {
      const incident = await store.get(req.params.id);
      if (!incident) throw new DomainError(404, "Incident not found");
      return incident;
    },
  );
  app.get<{ Params: { id: string } }>(
    "/api/incidents/:id/events",
    { preHandler: authenticate, schema: { params: idParams } },
    async (req) => {
      if (!(await store.get(req.params.id)))
        throw new DomainError(404, "Incident not found");
      return { items: await store.events(req.params.id) };
    },
  );
  app.post<{ Body: Pick<Incident, "title" | "description" | "severity"> }>(
    "/api/incidents",
    {
      preHandler: writeAccess,
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["title", "description", "severity"],
          properties: {
            title: {
              type: "string",
              minLength: 1,
              maxLength: 160,
              pattern: "\\S",
            },
            description: { type: "string", maxLength: 4000 },
            severity: {
              type: "string",
              enum: ["low", "medium", "high", "critical"],
            },
          },
        },
      },
    },
    async (req, reply) => {
      const item = await store.create(req.body, actors.get(req)!);
      return reply
        .code(201)
        .header("Location", `/api/incidents/${item.id}`)
        .send(item);
    },
  );
  app.patch<{
    Params: { id: string };
    Body: { status: Status; version: number };
  }>(
    "/api/incidents/:id/status",
    {
      preHandler: writeAccess,
      schema: {
        params: idParams,
        body: {
          type: "object",
          additionalProperties: false,
          required: ["status", "version"],
          properties: {
            status: {
              type: "string",
              enum: ["open", "investigating", "resolved"],
            },
            version: { type: "integer", minimum: 1 },
          },
        },
      },
    },
    async (req) =>
      store.transition(
        req.params.id,
        req.body.status,
        req.body.version,
        actors.get(req)!,
      ),
  );
  await app.register(staticPlugin, { root: resolve("public"), prefix: "/" });
  return app;
}
