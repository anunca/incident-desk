import Fastify from "fastify";
import staticPlugin from "@fastify/static";
import { resolve } from "node:path";
import type { Dependencies } from "./application/ports.js";
import { createIncidentUseCases } from "./application/incidents.js";
import swagger from "@fastify/swagger";
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
export async function buildApp(
  dependencies: Dependencies,
  options: AppOptions = {},
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
  await app.register(swagger, {
    openapi: {
      info: { title: "Incident Desk API", version: "1.0.0" },
      components: {
        securitySchemes: {
          cookieAuth: { type: "apiKey", in: "cookie", name: "session" },
          bearerAuth: { type: "http", scheme: "bearer" },
        },
      },
    },
  });
  const registry = registerObservability(app);
  const auth = createAuthentication(dependencies.sessions);
  await registerSecurity(app, options);
  registerErrorHandler(app);
  app.addHook("preHandler", async (req, reply) => {
    if (req.url.startsWith("/api/")) reply.header("Cache-Control", "no-store");
  });
  registerHealthRoutes(app, dependencies.health, auth, registry);
  await registerSessionRoutes(app, dependencies.sessions, auth, options);
  registerIncidentRoutes(
    app,
    createIncidentUseCases(dependencies.incidents),
    auth,
  );
  app.get(
    "/api/openapi.json",
    { preHandler: auth.authenticate, schema: { hide: true } },
    async () => app.swagger(),
  );
  await app.register(staticPlugin, { root: resolve("public"), prefix: "/" });
  return app;
}
