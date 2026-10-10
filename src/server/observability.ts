import type { FastifyInstance, FastifyRequest } from "fastify";
import { Registry, Counter, Histogram } from "@prometheus-io/client";

export function registerObservability(app: FastifyInstance) {
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
  return registry;
}
