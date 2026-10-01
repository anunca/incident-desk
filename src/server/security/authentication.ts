import type { FastifyRequest } from "fastify";
import { DomainError, type Store, type Actor } from "../../shared/domain.js";
import { tokenHash } from "./crypto.js";

export function createAuthentication(store: Store) {
  const actors = new WeakMap<FastifyRequest, Actor>();
  const bearer = (req: FastifyRequest) => {
    const auth = req.headers.authorization;
    return auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
  };
  const sessionToken = (req: FastifyRequest) =>
    bearer(req) ??
    req.headers.cookie
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("session="))
      ?.slice(8);
  const authenticate = async (req: FastifyRequest) => {
    const token = sessionToken(req);
    const actor = token ? await store.session(tokenHash(token)) : undefined;
    if (!actor) throw new DomainError(401, "Authentication required");
    actors.set(req, actor);
  };
  const writeAccess = async (req: FastifyRequest) => {
    await authenticate(req);
    if (actors.get(req)!.role === "reader")
      throw new DomainError(403, "Write access required");
    if (!bearer(req) && req.headers["x-requested-with"] !== "incident-desk")
      throw new DomainError(403, "Missing CSRF header");
  };
  return { actors, bearer, sessionToken, authenticate, writeAccess };
}
export type Authentication = ReturnType<typeof createAuthentication>;
