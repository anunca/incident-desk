import type { FastifyInstance } from "fastify";
import type { Registry } from "@prometheus-io/client";
import { DomainError, type Store } from "../../shared/domain.js";
import type { Authentication } from "../security/authentication.js";

export function registerHealthRoutes(
  app: FastifyInstance,
  store: Store,
  auth: Authentication,
  registry: Registry,
) {
  const { authenticate, actors } = auth;
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
}
