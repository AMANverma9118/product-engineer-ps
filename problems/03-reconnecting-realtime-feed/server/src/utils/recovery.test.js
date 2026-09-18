import { describe, expect, it } from "vitest";
import {
  buildRecoveryResponse,
  computeNextSequence,
  selectUpdatesAfterSequence,
} from "./recovery.js";

function update(sequence, incidentId = "incident-123") {
  return {
    updateId: `u-${incidentId}-${sequence}`,
    incidentId,
    message: `message ${sequence}`,
    createdAt: new Date(2026, 0, sequence).toISOString(),
    sequence,
  };
}

describe("computeNextSequence", () => {
  it("starts at 1 when no updates exist", () => {
    expect(computeNextSequence(null)).toBe(1);
    expect(computeNextSequence(undefined)).toBe(1);
  });

  it("increments the current max", () => {
    expect(computeNextSequence(10)).toBe(11);
  });
});

describe("selectUpdatesAfterSequence", () => {
  const feed = [update(1), update(2), update(3), update(1, "other-incident")];

  it("returns later updates for one incident in sequence order", () => {
    expect(selectUpdatesAfterSequence(feed, "incident-123", 1)).toEqual([
      update(2),
      update(3),
    ]);
  });

  it("does not mix incident feeds", () => {
    expect(selectUpdatesAfterSequence(feed, "other-incident", 0)).toEqual([
      update(1, "other-incident"),
    ]);
  });

  it("returns an empty list when nothing is after the cursor", () => {
    expect(selectUpdatesAfterSequence(feed, "incident-123", 3)).toEqual([]);
  });
});

describe("buildRecoveryResponse", () => {
  it("sets nextSequence to the last recovered sequence", () => {
    expect(buildRecoveryResponse([update(11), update(12), update(13)], 10)).toEqual({
      updates: [update(11), update(12), update(13)],
      nextSequence: 13,
    });
  });

  it("keeps the cursor when recovery is empty", () => {
    expect(buildRecoveryResponse([], 10)).toEqual({
      updates: [],
      nextSequence: 10,
    });
  });
});
