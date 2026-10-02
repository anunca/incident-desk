import { randomUUID } from "node:crypto";
import { buildApp } from "../../src/server/app.js";
import { hashPassword } from "../../src/server/security/crypto.js";
import { MemoryStore } from "../memory.js";
// Test-only fixture; no database, secrets or routes from real environments.
const store = new MemoryStore();
for (const role of ["admin", "reader"] as const)
  store.users.push({
    id: randomUUID(),
    email: `${role}@example.test`,
    role,
    passwordHash: await hashPassword("browser-tests-only-password"),
  });
const app = await buildApp(store, { development: true });
await app.listen({ host: "127.0.0.1", port: 3100 });
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    void app.close().then(() => process.exit(0));
  });
