import type { FastifyInstance } from "fastify";
import { DomainError } from "./domain/models.js";

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, req, reply) => {
    const e = error as Error & { validation?: unknown; statusCode?: number };
    const status =
      e instanceof DomainError
        ? (
            {
              unauthenticated: 401,
              forbidden: 403,
              not_found: 404,
              conflict: 409,
            } as const
          )[e.code]
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
}
