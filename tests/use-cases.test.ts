import { beforeEach, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { createIncidentUseCases } from "../src/server/application/incidents.js";
import { MemoryStore } from "./memory.js";
const reader = { id: randomUUID(), role: "reader" as const };
const writer = { id: randomUUID(), role: "operator" as const };
let store: MemoryStore;
beforeEach(() => {
  store = new MemoryStore();
});
it("rejects creation before calling persistence for a reader", async () => {
  const create = vi.spyOn(store, "create");
  await expect(
    createIncidentUseCases(store).create(
      { title: "x", description: "", severity: "low" },
      reader,
    ),
  ).rejects.toMatchObject({ code: "forbidden" });
  expect(create).not.toHaveBeenCalled();
  expect(store.history).toHaveLength(0);
});
it("rejects status changes before calling persistence for a reader", async () => {
  const transition = vi.spyOn(store, "transition");
  await expect(
    createIncidentUseCases(store).changeStatus(
      randomUUID(),
      "resolved",
      1,
      reader,
    ),
  ).rejects.toMatchObject({ code: "forbidden" });
  expect(transition).not.toHaveBeenCalled();
});
it("delegates mutations to a single atomic port without a preflight read", async () => {
  const cases = createIncidentUseCases(store);
  const item = await cases.create(
    { title: "Atomic", description: "", severity: "high" },
    writer,
  );
  const get = vi.spyOn(store, "get");
  const transition = vi
    .spyOn(store, "transition")
    .mockResolvedValue({ ...item, status: "resolved", version: 2 });
  const next = await cases.changeStatus(item.id, "resolved", 1, writer);
  expect(get).not.toHaveBeenCalled();
  expect(transition).toHaveBeenCalledExactlyOnceWith(
    item.id,
    "resolved",
    1,
    writer,
  );
  expect(next.version).toBe(2);
});
it("reports a missing incident with a transport-independent code", async () => {
  const cases = createIncidentUseCases(store);
  await expect(cases.get(randomUUID())).rejects.toMatchObject({
    code: "not_found",
  });
  await expect(cases.history(randomUUID())).rejects.toMatchObject({
    code: "not_found",
  });
});
it("preserves conflicts and does not add an event on a stale version", async () => {
  const cases = createIncidentUseCases(store);
  const item = await cases.create(
    { title: "Concurrent", description: "", severity: "low" },
    writer,
  );
  await cases.changeStatus(item.id, "investigating", 1, writer);
  await expect(
    cases.changeStatus(item.id, "resolved", 1, writer),
  ).rejects.toMatchObject({ code: "conflict" });
  expect(store.history).toHaveLength(2);
});
