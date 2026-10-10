import { Pool } from "pg";
import type { HealthProbe } from "../application/ports.js";
export class PostgresHealthProbe implements HealthProbe {
  constructor(private pool: Pool) {}
  async ready() {
    await this.pool.query("SELECT 1");
  }
}
