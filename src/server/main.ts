import { Pool } from "pg";
import { PostgresIncidentRepository } from "./persistence/incidents.js";
import { PostgresSessionRepository } from "./persistence/sessions.js";
import { PostgresHealthProbe } from "./persistence/health.js";
import { buildApp } from "./app.js";
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("Invalid PORT");
const pool = new Pool({
  connectionString: databaseUrl,
  max: 10,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  statement_timeout: 5000,
});
pool.on("error", () => {
  console.error("Unexpected database pool error");
});
const app = await buildApp(
  {
    incidents: new PostgresIncidentRepository(pool),
    sessions: new PostgresSessionRepository(pool),
    health: new PostgresHealthProbe(pool),
  },
  {
    logger: true,
    development: process.env.NODE_ENV === "development",
    secureCookies:
      process.env.NODE_ENV !== "development" &&
      process.env.COOKIE_SECURE === "true",
  },
);
app.addHook("onClose", async () => {
  await pool.end();
});
let stopping = false;
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    if (stopping) return;
    stopping = true;
    const timeout = setTimeout(() => process.exit(1), 10000);
    timeout.unref();
    void app.close().then(
      () => {
        clearTimeout(timeout);
        process.exit(0);
      },
      () => process.exit(1),
    );
  });
try {
  await app.listen({ port, host: process.env.HOST ?? "127.0.0.1" });
} catch (error) {
  app.log.error(error);
  await app.close();
  process.exitCode = 1;
}
