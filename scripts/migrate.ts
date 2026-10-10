import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Pool } from "pg";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const c = await pool.connect();
try {
  await c.query("SELECT pg_advisory_lock(724981)");
  await c.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  for (const name of (await readdir("migrations"))
    .filter((n) => n.endsWith(".sql"))
    .sort()) {
    const sql = await readFile(`migrations/${name}`, "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const existing = (
      await c.query("SELECT checksum FROM schema_migrations WHERE name=$1", [
        name,
      ])
    ).rows[0];
    if (existing) {
      if (existing.checksum !== checksum)
        throw new Error(`Modified applied migration: ${name}`);
      continue;
    }
    await c.query("BEGIN");
    try {
      await c.query(sql);
      await c.query(
        "INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)",
        [name, checksum],
      );
      await c.query("COMMIT");
      console.log(`Applied ${name}`);
    } catch (error) {
      await c.query("ROLLBACK");
      throw error;
    }
  }
} finally {
  await c.query("SELECT pg_advisory_unlock(724981)");
  c.release();
  await pool.end();
}
