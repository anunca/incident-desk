import { beforeAll, afterAll, it, expect } from "vitest";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { PostgresStore } from "../src/server/persistence/postgres.js";
// TEST_DATABASE_URL must reference a dedicated, already-migrated test database.
const url = process.env.TEST_DATABASE_URL;
if (!url)
  throw new Error("TEST_DATABASE_URL is required for integration tests");
const pool = new Pool({ connectionString: url });
const store = new PostgresStore(pool);
const actor = { id: randomUUID(), role: "operator" as const };
const ids: string[] = [];
beforeAll(async () => {
  await pool.query(
    "INSERT INTO users(id,email,password_hash,role) VALUES($1,$2,$3,$4)",
    [actor.id, `${actor.id}@example.test`, "unused", "operator"],
  );
});
afterAll(async () => {
  for (const id of ids) {
    await pool.query("DELETE FROM incident_events WHERE incident_id=$1", [id]);
    await pool.query("DELETE FROM incidents WHERE id=$1", [id]);
  }
  await pool.query("DELETE FROM users WHERE id=$1", [actor.id]);
  await pool.end();
});
it("serializes concurrent writes and atomically records history", async () => {
  const item = await store.create(
    { title: "Concurrency", description: "", severity: "high" },
    actor,
  );
  ids.push(item.id);
  const results = await Promise.allSettled([
    store.transition(item.id, "investigating", 1, actor),
    store.transition(item.id, "resolved", 1, actor),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
  expect((await store.get(item.id))!.version).toBe(2);
  expect(await store.events(item.id)).toHaveLength(2);
});
it("rolls back the incident when the audit insert fails", async () => {
  const before = await pool.query("SELECT count(*) FROM incidents");
  await expect(
    store.create(
      { title: "Must roll back", description: "", severity: "low" },
      { id: randomUUID(), role: "operator" },
    ),
  ).rejects.toThrow();
  const after = await pool.query("SELECT count(*) FROM incidents");
  expect(after.rows[0].count).toBe(before.rows[0].count);
});
it("uses bound parameters for SQL-looking content", async () => {
  const title = "'; DROP TABLE incidents; --";
  const item = await store.create(
    { title, description: "", severity: "low" },
    actor,
  );
  ids.push(item.id);
  expect((await store.get(item.id))!.title).toBe(title);
});
