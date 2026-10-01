import type { FastifyInstance } from "fastify";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";

export async function registerSecurity(
  app: FastifyInstance,
  options: { development?: boolean },
) {
  await app.register(helmet, {
    ...(options.development ? { strictTransportSecurity: false } : {}),
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: options.development ? null : [],
      },
    },
  });
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });
}
