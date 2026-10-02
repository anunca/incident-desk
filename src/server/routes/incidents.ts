import type { FastifyInstance } from "fastify";
import type { IncidentUseCases } from "../application/incidents.js";
import type { Authentication } from "../security/authentication.js";
import {
  CreateIncidentSchema,
  ChangeStatusSchema,
  IdParamsSchema,
  ListQuerySchema,
  IncidentSchema,
  IncidentListSchema,
  EventListSchema,
  ErrorSchema,
  type NewIncident,
  type StatusChange,
  type IdParams,
  type ListQuery,
} from "../../shared/contracts.js";
import { incidentDto, eventDto } from "./mappers.js";
const secured = [{ cookieAuth: [] }, { bearerAuth: [] }];
const errors = {
  400: ErrorSchema,
  401: ErrorSchema,
  403: ErrorSchema,
  404: ErrorSchema,
  409: ErrorSchema,
  429: ErrorSchema,
  500: ErrorSchema,
};
export function registerIncidentRoutes(
  app: FastifyInstance,
  useCases: IncidentUseCases,
  auth: Authentication,
) {
  const { authenticate, writeAccess, actors } = auth;
  app.get<{ Querystring: ListQuery }>(
    "/api/incidents",
    {
      preHandler: authenticate,
      schema: {
        tags: ["incidents"],
        security: secured,
        querystring: ListQuerySchema,
        response: { 200: IncidentListSchema, ...errors },
      },
    },
    async (req) => ({
      items: (
        await useCases.list(req.query.limit ?? 20, req.query.offset ?? 0)
      ).map(incidentDto),
    }),
  );
  app.get<{ Params: IdParams }>(
    "/api/incidents/:id",
    {
      preHandler: authenticate,
      schema: {
        tags: ["incidents"],
        security: secured,
        params: IdParamsSchema,
        response: { 200: IncidentSchema, ...errors },
      },
    },
    async (req) => incidentDto(await useCases.get(req.params.id)),
  );
  app.get<{ Params: IdParams }>(
    "/api/incidents/:id/events",
    {
      preHandler: authenticate,
      schema: {
        tags: ["incidents"],
        security: secured,
        params: IdParamsSchema,
        response: { 200: EventListSchema, ...errors },
      },
    },
    async (req) => ({
      items: (await useCases.history(req.params.id)).map(eventDto),
    }),
  );
  app.post<{ Body: NewIncident }>(
    "/api/incidents",
    {
      preHandler: writeAccess,
      schema: {
        tags: ["incidents"],
        security: secured,
        body: CreateIncidentSchema,
        response: { 201: IncidentSchema, ...errors },
      },
    },
    async (req, reply) => {
      const item = await useCases.create(req.body, actors.get(req)!);
      return reply
        .code(201)
        .header("Location", `/api/incidents/${item.id}`)
        .send(incidentDto(item));
    },
  );
  app.patch<{ Params: IdParams; Body: StatusChange }>(
    "/api/incidents/:id/status",
    {
      preHandler: writeAccess,
      schema: {
        tags: ["incidents"],
        security: secured,
        params: IdParamsSchema,
        body: ChangeStatusSchema,
        response: { 200: IncidentSchema, ...errors },
      },
    },
    async (req) =>
      incidentDto(
        await useCases.changeStatus(
          req.params.id,
          req.body.status,
          req.body.version,
          actors.get(req)!,
        ),
      ),
  );
}
