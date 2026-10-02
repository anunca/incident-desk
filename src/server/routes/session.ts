import type { FastifyInstance } from "fastify";
import { DomainError, type Store } from "../../shared/domain.js";
import {
  newToken,
  tokenHash,
  hashPassword,
  verifyPassword,
} from "../security/crypto.js";
import type { Authentication } from "../security/authentication.js";

export async function registerSessionRoutes(
  app: FastifyInstance,
  store: Store,
  auth: Authentication,
  options: { secureCookies?: boolean },
) {
  const { authenticate, bearer, sessionToken } = auth;
  app.get("/api/session", { preHandler: authenticate }, async (req) => ({
    role: auth.actors.get(req)!.role,
  }));
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
}
