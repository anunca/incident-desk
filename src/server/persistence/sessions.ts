import { Pool } from "pg";
import type { Actor, User } from "../domain/models.js";
import type { SessionRepository } from "../application/ports.js";
export class PostgresSessionRepository implements SessionRepository {
  constructor(private pool: Pool) {}
  async user(email: string) {
    const r = await this.pool.query<User>(
      'SELECT id,email,password_hash AS "passwordHash",role FROM users WHERE email=$1',
      [email],
    );
    return r.rows[0];
  }
  async session(hash: string) {
    const r = await this.pool.query<Actor>(
      "SELECT u.id,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE token_hash=$1 AND expires_at>now()",
      [hash],
    );
    return r.rows[0];
  }
  async saveSession(hash: string, actor: Actor, expires: Date) {
    await this.pool.query(
      "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)",
      [hash, actor.id, expires],
    );
  }
  async deleteSession(hash: string) {
    await this.pool.query("DELETE FROM sessions WHERE token_hash=$1", [hash]);
  }
}
