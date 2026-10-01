import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { hashPassword } from "../src/security.js";
// Password arrives on stdin, never as a command argument or in logs.
let password = "";
for await (const chunk of process.stdin) password += chunk;
password = password.replace(/\r?\n$/, "");
const [email, role = "operator"] = process.argv.slice(2);
if (
  !process.env.DATABASE_URL ||
  !email ||
  !["reader", "operator", "admin"].includes(role) ||
  password.length < 12 ||
  password.length > 128
)
  throw new Error(
    "Require DATABASE_URL, email, role and a 12–128 character password on stdin",
  );
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query(
    "INSERT INTO users(id,email,password_hash,role) VALUES($1,$2,$3,$4)",
    [randomUUID(), email.toLowerCase(), await hashPassword(password), role],
  );
  console.log("User created");
} finally {
  await pool.end();
}
