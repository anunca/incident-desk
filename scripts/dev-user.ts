import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { hashPassword } from "../src/server/security/crypto.js";

if (process.env.NODE_ENV !== "development")
  throw new Error("Development user setup requires NODE_ENV=development");
const email = process.env.DEV_EMAIL ?? "admin@example.test";
const password = process.env.DEV_PASSWORD ?? "local-development-only";
if (
  !process.env.DATABASE_URL ||
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
  password.length < 12 ||
  password.length > 128
)
  throw new Error(
    "Require DATABASE_URL, valid DEV_EMAIL and a 12–128 character DEV_PASSWORD",
  );
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query(
    "INSERT INTO users(id,email,password_hash,role) VALUES($1,$2,$3,'admin') ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash",
    [randomUUID(), email.toLowerCase(), await hashPassword(password)],
  );
  console.log(
    `Development user ready: ${email} (password synchronized with DEV_PASSWORD)`,
  );
} finally {
  await pool.end();
}
