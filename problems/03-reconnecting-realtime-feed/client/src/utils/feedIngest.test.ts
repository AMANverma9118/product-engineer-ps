import { describe, expect, it } from "vitest";
import type { IncidentUpdate } from "../types/update.ts";
import { deduplicateUpdates } from "./deduplicateUpdates.ts";
import {
  filterByIncident,
  lastReceivedSequence,
  mergeUpdates,
} from "./mergeUpdates.ts";
import { sortUpdatesBySequence } from "./sortUpdatesBySequence.ts";

function update(
  sequence: number,
  updateId = `u${sequence}`,
  incidentId = "incident-123"
): IncidentUpdate {
  return {
    updateId,
    incidentId,
    message: `message ${sequence}`,
    createdAt: `2026-01-01T00:00:0${sequence}Z`,
    sequence,
  };
}

describe("deduplicateUpdates", () => {
  it("keeps the first occurrence of each updateId", () => {
    const result = deduplicateUpdates([
      update(1, "u1"),
      update(1, "u1"),
      update(2, "u2"),
    ]);
    expect(result.updates.map((item) => item.updateId)).toEqual(["u1", "u2"]);
    expect(result.duplicatesIgnored).toEqual(["u1"]);
  });
});

describe("TEST 3: overlapping live and recovery paths", () => {
  it("displays an update only once when recovery and live delivery overlap", () => {
    const existing = [update(1), update(2), update(3), update(4)];
    const recovered = [update(5), update(6), update(7)];
    const liveDuringRecovery = [update(7)];

    const afterRecovery = mergeUpdates(existing, recovered);
    const afterLive = mergeUpdates(afterRecovery.updates, liveDuringRecovery);

    expect(afterLive.updates.map((item) => item.sequence)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
    expect(afterLive.duplicatesIgnored).toEqual(["u7"]);
    expect(lastReceivedSequence(afterLive.updates)).toBe(7);
  });

  it("inserts recovered updates in sequence order rather than appending blindly", () => {
    const existing = [update(1), update(3)];
    const recovered = [update(4), update(2)];
    const merged = mergeUpdates(existing, recovered);

    expect(merged.updates.map((item) => item.sequence)).toEqual([1, 2, 3, 4]);
  });
});

describe("sortUpdatesBySequence", () => {
  it("orders by sequence ascending", () => {
    expect(
      sortUpdatesBySequence([update(3), update(1), update(2)]).map(
        (item) => item.sequence
      )
    ).toEqual([1, 2, 3]);
  });
});

describe("filterByIncident", () => {
  it("drops updates that belong to another incident", () => {
    const mixed = [
      update(1, "a", "incident-123"),
      update(1, "b", "incident-999"),
    ];
    expect(filterByIncident(mixed, "incident-123")).toEqual([
      update(1, "a", "incident-123"),
    ]);
  });
});

describe("reconnection recovery cursor", () => {
  it("keeps already received updates and appends only missed sequences", () => {
    const beforeDisconnect = [update(8), update(9), update(10)];
    const missed = [update(11), update(12), update(13)];
    const merged = mergeUpdates(beforeDisconnect, missed);

    expect(merged.updates.map((item) => item.sequence)).toEqual([
      8, 9, 10, 11, 12, 13,
    ]);
    expect(merged.duplicatesIgnored).toEqual([]);
    expect(lastReceivedSequence(beforeDisconnect)).toBe(10);
    expect(lastReceivedSequence(merged.updates)).toBe(13);
  });
});
