import Fastify from "fastify";
import staticPlugin from "@fastify/static";
import { resolve } from "node:path";
import type { Store } from "../shared/domain.js";
import { createAuthentication } from "./security/authentication.js";
import { registerSecurity } from "./security/headers.js";
import { registerObservability } from "./observability.js";
import { registerErrorHandler } from "./errors.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerSessionRoutes } from "./routes/session.js";
import { registerIncidentRoutes } from "./routes/incidents.js";

export interface AppOptions {
  logger?: boolean;
  secureCookies?: boolean;
  development?: boolean;
}
export async function buildApp(store: Store, options: AppOptions = {}) {
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
  const registry = registerObservability(app);
  const auth = createAuthentication(store);
  await registerSecurity(app, options);
  registerErrorHandler(app);
  app.addHook("preHandler", async (req, reply) => {
    if (req.url.startsWith("/api/")) reply.header("Cache-Control", "no-store");
  });
  registerHealthRoutes(app, store, auth, registry);
  await registerSessionRoutes(app, store, auth, options);
  registerIncidentRoutes(app, store, auth);
  await app.register(staticPlugin, { root: resolve("public"), prefix: "/" });
  return app;
}
