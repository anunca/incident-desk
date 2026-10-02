import { Type, type Static } from "@sinclair/typebox";
const strict = { additionalProperties: false };
export const RoleSchema = Type.Union([
  Type.Literal("reader"),
  Type.Literal("operator"),
  Type.Literal("admin"),
]);
export const StatusSchema = Type.Union([
  Type.Literal("open"),
  Type.Literal("investigating"),
  Type.Literal("resolved"),
]);
export const SeveritySchema = Type.Union([
  Type.Literal("low"),
  Type.Literal("medium"),
  Type.Literal("high"),
  Type.Literal("critical"),
]);
const uuid = Type.String({ format: "uuid" });
const date = Type.String({ format: "date-time" });
export const IncidentSchema = Type.Object(
  {
    id: uuid,
    title: Type.String(),
    description: Type.String(),
    severity: SeveritySchema,
    status: StatusSchema,
    version: Type.Integer({ minimum: 1 }),
    createdAt: date,
    updatedAt: date,
  },
  strict,
);
export const EventSchema = Type.Object(
  {
    id: uuid,
    incidentId: uuid,
    actorId: uuid,
    action: Type.String(),
    fromStatus: Type.Union([StatusSchema, Type.Null()]),
    toStatus: StatusSchema,
    at: date,
  },
  strict,
);
export const CreateIncidentSchema = Type.Object(
  {
    title: Type.String({ minLength: 1, maxLength: 160, pattern: "\\S" }),
    description: Type.String({ maxLength: 4000 }),
    severity: SeveritySchema,
  },
  strict,
);
export const ChangeStatusSchema = Type.Object(
  { status: StatusSchema, version: Type.Integer({ minimum: 1 }) },
  strict,
);
export const IdParamsSchema = Type.Object({ id: uuid }, strict);
export const ListQuerySchema = Type.Object(
  {
    limit: Type.Optional(
      Type.Integer({ minimum: 1, maximum: 100, default: 20 }),
    ),
    offset: Type.Optional(
      Type.Integer({ minimum: 0, maximum: 100000, default: 0 }),
    ),
  },
  strict,
);
export const IncidentListSchema = Type.Object(
  { items: Type.Array(IncidentSchema) },
  strict,
);
export const EventListSchema = Type.Object(
  { items: Type.Array(EventSchema) },
  strict,
);
export const CredentialsSchema = Type.Object(
  {
    email: Type.String({ minLength: 3, maxLength: 254 }),
    password: Type.String({ minLength: 1, maxLength: 128 }),
  },
  strict,
);
export const SessionSchema = Type.Object({ role: RoleSchema }, strict);
export const LoginSchema = Type.Object(
  { token: Type.String(), role: RoleSchema },
  strict,
);
export const ErrorSchema = Type.Object(
  { error: Type.String(), requestId: Type.String() },
  strict,
);
export type Incident = Static<typeof IncidentSchema>;
export type Event = Static<typeof EventSchema>;
export type Role = Static<typeof RoleSchema>;
export type Status = Static<typeof StatusSchema>;
export type NewIncident = Static<typeof CreateIncidentSchema>;
export type StatusChange = Static<typeof ChangeStatusSchema>;
export type IdParams = Static<typeof IdParamsSchema>;
export type ListQuery = Static<typeof ListQuerySchema>;
export type Credentials = Static<typeof CredentialsSchema>;
