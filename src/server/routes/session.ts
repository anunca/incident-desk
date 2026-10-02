import {
  CredentialsSchema,
  SessionSchema,
  LoginSchema,
  ErrorSchema,
  type Credentials,
} from "../../shared/contracts.js";
import type { SessionRepository } from "../application/ports.js";
import type { FastifyInstance } from "fastify";
import { DomainError } from "../domain/models.js";
import {
  newToken,
  tokenHash,
  hashPassword,
  verifyPassword,
} from "../security/crypto.js";
import type { Authentication } from "../security/authentication.js";

export async function registerSessionRoutes(
  app: FastifyInstance,
  store: SessionRepository,
  auth: Authentication,
  options: { secureCookies?: boolean },
) {
  const { authenticate, bearer, sessionToken } = auth;
  app.get(
    "/api/session",
    {
      preHandler: authenticate,
      schema: {
        tags: ["sessions"],
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        response: { 200: SessionSchema, 401: ErrorSchema },
      },
    },
    async (req) => ({
      role: auth.actors.get(req)!.role,
    }),
  );
  const dummy = await hashPassword(newToken());
  app.post<{ Body: Credentials }>(
    "/api/session",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        tags: ["sessions"],
        body: CredentialsSchema,
        response: {
          200: LoginSchema,
          400: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
          429: ErrorSchema,
        },
      },
    },
    async (req, reply) => {
      if (
        req.headers.origin &&
        req.headers["x-requested-with"] !== "incident-desk"
      )
        throw new DomainError("forbidden", "Missing CSRF header");
      const user = await store.user(req.body.email.toLowerCase());
      const valid = await verifyPassword(
        req.body.password,
        user?.passwordHash ?? dummy,
      );
      if (!user || !valid)
        throw new DomainError("unauthenticated", "Invalid credentials");
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
    {
      preHandler: authenticate,
      schema: {
        tags: ["sessions"],
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        response: { 204: { type: "null" }, 401: ErrorSchema, 403: ErrorSchema },
      },
    },
    async (req, reply) => {
      if (!bearer(req) && req.headers["x-requested-with"] !== "incident-desk")
        throw new DomainError("forbidden", "Missing CSRF header");
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
