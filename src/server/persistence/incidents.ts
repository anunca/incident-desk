import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import {
  assertTransition,
  DomainError,
  type Actor,
  type Incident,
  type Status,
  type Event,
} from "../domain/models.js";
const projection =
  'id,title,description,severity,status,version,created_at AS "createdAt",updated_at AS "updatedAt"';
import type { IncidentRepository } from "../application/ports.js";
export class PostgresIncidentRepository implements IncidentRepository {
  constructor(private pool: Pool) {}
  async list(limit: number, offset: number) {
    return (
      await this.pool.query<Incident>(
        `SELECT ${projection} FROM incidents ORDER BY created_at DESC,id DESC LIMIT $1 OFFSET $2`,
        [limit, offset],
      )
    ).rows;
  }
  async get(id: string) {
    return (
      await this.pool.query<Incident>(
        `SELECT ${projection} FROM incidents WHERE id=$1`,
        [id],
      )
    ).rows[0];
  }
  private async transaction<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await this.pool.connect();
    try {
      await c.query("BEGIN");
      const result = await fn(c);
      await c.query("COMMIT");
      return result;
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }
  async create(
    input: Pick<Incident, "title" | "description" | "severity">,
    actor: Actor,
  ) {
    return this.transaction(async (c) => {
      const id = randomUUID();
      const r = await c.query<Incident>(
        `INSERT INTO incidents(id,title,description,severity,status) VALUES($1,$2,$3,$4,'open') RETURNING ${projection}`,
        [id, input.title, input.description, input.severity],
      );
      await c.query(
        "INSERT INTO incident_events(id,incident_id,actor_id,action,to_status) VALUES($1,$2,$3,'created','open')",
        [randomUUID(), id, actor.id],
      );
      return r.rows[0]!;
    });
  }
  async transition(id: string, status: Status, version: number, actor: Actor) {
    return this.transaction(async (c) => {
      const current = (
        await c.query<Incident>(
          `SELECT ${projection} FROM incidents WHERE id=$1 FOR UPDATE`,
          [id],
        )
      ).rows[0];
      if (!current) throw new DomainError("not_found", "Incident not found");
      if (current.version !== version)
        throw new DomainError(
          "conflict",
          "Incident changed; reload before retrying",
        );
      assertTransition(current.status, status);
      const next = (
        await c.query<Incident>(
          `UPDATE incidents SET status=$2,version=version+1,updated_at=now() WHERE id=$1 RETURNING ${projection}`,
          [id, status],
        )
      ).rows[0]!;
      await c.query(
        "INSERT INTO incident_events(id,incident_id,actor_id,action,from_status,to_status) VALUES($1,$2,$3,'status_changed',$4,$5)",
        [randomUUID(), id, actor.id, current.status, status],
      );
      return next;
    });
  }
  async events(id: string) {
    return (
      await this.pool.query<Event>(
        'SELECT id,incident_id AS "incidentId",actor_id AS "actorId",action,from_status AS "fromStatus",to_status AS "toStatus",at FROM incident_events WHERE incident_id=$1 ORDER BY at,id',
        [id],
      )
    ).rows;
  }
}
