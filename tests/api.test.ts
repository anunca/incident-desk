import { beforeEach, afterEach, describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { buildApp } from "../src/server/app.js";
import { hashPassword, tokenHash } from "../src/server/security/crypto.js";
import { MemoryStore } from "./memory.js";
let store: MemoryStore;
let app: Awaited<ReturnType<typeof buildApp>>;
let token: string;
beforeEach(async () => {
  store = new MemoryStore();
  store.users.push({
    id: randomUUID(),
    email: "admin@example.test",
    passwordHash: await hashPassword("correct-password-123"),
    role: "admin",
  });
  app = await buildApp(store);
  const login = await app.inject({
    method: "POST",
    url: "/api/session",
    payload: { email: "admin@example.test", password: "correct-password-123" },
  });
  token = login.json().token;
});
afterEach(async () => {
  await app.close();
});
const auth = () => ({ authorization: `Bearer ${token}` });
const create = () =>
  app.inject({
    method: "POST",
    url: "/api/incidents",
    headers: auth(),
    payload: {
      title: "API unavailable",
      description: "Investigate timeout",
      severity: "high",
    },
  });
describe("API security and lifecycle", () => {
  it("rejects anonymous access", async () => {
    expect((await app.inject("/api/incidents")).statusCode).toBe(401);
  });
  it("uses generic credentials errors and never exposes hashes", async () => {
    const r = await app.inject({
      method: "POST",
      url: "/api/session",
      payload: { email: "nobody@example.test", password: "wrong" },
    });
    expect(r.statusCode).toBe(401);
    expect(r.body).not.toContain("scrypt");
  });
  it("creates an incident and audit entry, then resolves it", async () => {
    const r = await create();
    expect(r.statusCode).toBe(201);
    const item = r.json();
    expect(r.headers.location).toBe(`/api/incidents/${item.id}`);
    const changed = await app.inject({
      method: "PATCH",
      url: `/api/incidents/${item.id}/status`,
      headers: auth(),
      payload: { status: "resolved", version: 1 },
    });
    expect(changed.json().version).toBe(2);
    expect(await store.events(item.id)).toHaveLength(2);
  });
  it("rejects stale updates without adding history", async () => {
    const { id } = (await create()).json();
    await app.inject({
      method: "PATCH",
      url: `/api/incidents/${id}/status`,
      headers: auth(),
      payload: { status: "investigating", version: 1 },
    });
    const stale = await app.inject({
      method: "PATCH",
      url: `/api/incidents/${id}/status`,
      headers: auth(),
      payload: { status: "resolved", version: 1 },
    });
    expect(stale.statusCode).toBe(409);
    expect(await store.events(id)).toHaveLength(2);
  });
  it("rejects unknown fields, whitespace title and invalid identifiers", async () => {
    for (const payload of [
      { title: "ok", description: "", severity: "high", role: "admin" },
      { title: "   ", description: "", severity: "high" },
    ])
      expect(
        (
          await app.inject({
            method: "POST",
            url: "/api/incidents",
            headers: auth(),
            payload,
          })
        ).statusCode,
      ).toBe(400);
    expect(
      (await app.inject({ url: "/api/incidents/not-a-uuid", headers: auth() }))
        .statusCode,
    ).toBe(400);
  });
  it("prevents reader writes", async () => {
    store.sessions.get(tokenHash(token))!.actor = {
      id: store.users[0]!.id,
      role: "reader",
    };
    expect((await create()).statusCode).toBe(403);
    expect(
      (await app.inject({ url: "/api/incidents", headers: auth() })).statusCode,
    ).toBe(200);
  });
  it("requires a custom CSRF header for cookie mutations", async () => {
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/incidents",
          headers: { cookie: `session=${token}` },
          payload: { title: "test", description: "", severity: "low" },
        })
      ).statusCode,
    ).toBe(403);
  });
  it("invalidates sessions on logout", async () => {
    expect(
      (
        await app.inject({
          method: "DELETE",
          url: "/api/session",
          headers: auth(),
        })
      ).statusCode,
    ).toBe(204);
    expect(
      (await app.inject({ url: "/api/incidents", headers: auth() })).statusCode,
    ).toBe(401);
  });
  it("does not accept expired sessions", async () => {
    store.sessions.get(tokenHash(token))!.expires = new Date(0);
    expect((await create()).statusCode).toBe(401);
  });
  it("separates readiness from liveness", async () => {
    store.available = false;
    expect((await app.inject("/health/ready")).statusCode).toBe(503);
    expect((await app.inject("/health/live")).statusCode).toBe(200);
  });
  it("bounds pagination and protects metrics", async () => {
    expect(
      (await app.inject({ url: "/api/incidents?limit=101", headers: auth() }))
        .statusCode,
    ).toBe(400);
    expect((await app.inject("/metrics")).statusCode).toBe(401);
    expect(
      (await app.inject({ url: "/metrics", headers: auth() })).body,
    ).toContain("incident_http_requests_total");
  });
  it("sets security headers and serves the interface", async () => {
    const r = await app.inject("/");
    expect(r.statusCode).toBe(200);
    expect(r.headers["content-security-policy"]).toContain("script-src 'self'");
  });
  it("keeps HTTPS policy in production and allows HTTP development", async () => {
    const production = await app.inject("/");
    expect(production.headers["strict-transport-security"]).toBeDefined();
    expect(production.headers["content-security-policy"]).toContain(
      "upgrade-insecure-requests",
    );
    const local = await buildApp(store, { development: true });
    try {
      const response = await local.inject("/");
      expect(response.headers["strict-transport-security"]).toBeUndefined();
      expect(response.headers["content-security-policy"]).not.toContain(
        "upgrade-insecure-requests",
      );
      const login = await local.inject({
        method: "POST",
        url: "/api/session",
        payload: {
          email: "admin@example.test",
          password: "correct-password-123",
        },
      });
      expect(login.headers["set-cookie"]).not.toContain("Secure");
    } finally {
      await local.close();
    }
  });
  it("rate limits repeated login attempts", async () => {
    let status = 0;
    for (let i = 0; i < 11; i++) {
      status = (
        await app.inject({
          method: "POST",
          url: "/api/session",
          payload: { email: "no@example.test", password: "bad" },
        })
      ).statusCode;
    }
    expect(status).toBe(429);
  });
});
