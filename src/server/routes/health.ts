import type { HealthProbe } from "../application/ports.js";
import type { FastifyInstance } from "fastify";
import type { Registry } from "@prometheus-io/client";
import { DomainError } from "../domain/models.js";
import type { Authentication } from "../security/authentication.js";

export function registerHealthRoutes(
  app: FastifyInstance,
  store: HealthProbe,
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
      throw new DomainError("forbidden", "Admin access required");
    return reply.type(registry.contentType).send(await registry.metrics());
  });
}
