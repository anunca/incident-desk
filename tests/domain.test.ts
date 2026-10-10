import { describe, it, expect } from "vitest";
import {
  assertTransition,
  DomainError,
  type Status,
} from "../src/server/domain/models.js";
const statuses: Status[] = ["open", "investigating", "resolved"];
const valid = new Set([
  "open:investigating",
  "open:resolved",
  "investigating:open",
  "investigating:resolved",
  "resolved:open",
]);
describe("incident state machine", () => {
  for (const from of statuses)
    for (const to of statuses)
      it(`${from} → ${to}`, () => {
        if (valid.has(`${from}:${to}`))
          expect(() => assertTransition(from, to)).not.toThrow();
        else {
          try {
            assertTransition(from, to);
            expect.fail("Invalid transition accepted");
          } catch (error) {
            expect(error).toBeInstanceOf(DomainError);
            expect((error as DomainError).code).toBe("conflict");
          }
        }
      });
});
