import type { FastifyInstance } from "fastify";
import {
  DomainError,
  type Store,
  type Incident,
  type Status,
} from "../../shared/domain.js";
import type { Authentication } from "../security/authentication.js";

export function registerIncidentRoutes(
  app: FastifyInstance,
  store: Store,
  auth: Authentication,
) {
  const { authenticate, writeAccess, actors } = auth;
  app.get<{ Querystring: { limit?: number; offset?: number } }>(
    "/api/incidents",
    {
      preHandler: authenticate,
      schema: {
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: {
            limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
            offset: {
              type: "integer",
              minimum: 0,
              maximum: 100000,
              default: 0,
            },
          },
        },
      },
    },
    async (req) => ({
      items: await store.list(req.query.limit ?? 20, req.query.offset ?? 0),
    }),
  );
  const idParams = {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string", format: "uuid" } },
  };
  app.get<{ Params: { id: string } }>(
    "/api/incidents/:id",
    { preHandler: authenticate, schema: { params: idParams } },
    async (req) => {
      const incident = await store.get(req.params.id);
      if (!incident) throw new DomainError(404, "Incident not found");
      return incident;
    },
  );
  app.get<{ Params: { id: string } }>(
    "/api/incidents/:id/events",
    { preHandler: authenticate, schema: { params: idParams } },
    async (req) => {
      if (!(await store.get(req.params.id)))
        throw new DomainError(404, "Incident not found");
      return { items: await store.events(req.params.id) };
    },
  );
  app.post<{ Body: Pick<Incident, "title" | "description" | "severity"> }>(
    "/api/incidents",
    {
      preHandler: writeAccess,
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["title", "description", "severity"],
          properties: {
            title: {
              type: "string",
              minLength: 1,
              maxLength: 160,
              pattern: "\\S",
            },
            description: { type: "string", maxLength: 4000 },
            severity: {
              type: "string",
              enum: ["low", "medium", "high", "critical"],
            },
          },
        },
      },
    },
    async (req, reply) => {
      const item = await store.create(req.body, actors.get(req)!);
      return reply
        .code(201)
        .header("Location", `/api/incidents/${item.id}`)
        .send(item);
    },
  );
  app.patch<{
    Params: { id: string };
    Body: { status: Status; version: number };
  }>(
    "/api/incidents/:id/status",
    {
      preHandler: writeAccess,
      schema: {
        params: idParams,
        body: {
          type: "object",
          additionalProperties: false,
          required: ["status", "version"],
          properties: {
            status: {
              type: "string",
              enum: ["open", "investigating", "resolved"],
            },
            version: { type: "integer", minimum: 1 },
          },
        },
      },
    },
    async (req) =>
      store.transition(
        req.params.id,
        req.body.status,
        req.body.version,
        actors.get(req)!,
      ),
  );
}
