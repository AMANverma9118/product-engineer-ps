import { describe, expect, it, vi } from "vitest";
import { fetchUpdatesAfterSequence } from "./recoveryApi.ts";

describe("fetchUpdatesAfterSequence", () => {
  it("returns a parsed recovery payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          updates: [
            {
              updateId: "u11",
              incidentId: "incident-123",
              message: "missed",
              createdAt: "2026-01-01T00:00:00.000Z",
              sequence: 11,
            },
          ],
          nextSequence: 11,
        }),
      })
    );

    const result = await fetchUpdatesAfterSequence(
      "http://localhost:3001",
      "incident-123",
      10
    );

    expect(result.nextSequence).toBe(11);
    expect(result.updates[0]?.updateId).toBe("u11");
    vi.unstubAllGlobals();
  });

  it("throws on a malformed server response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ unexpected: true }),
      })
    );

    await expect(
      fetchUpdatesAfterSequence("http://localhost:3001", "incident-123", 0)
    ).rejects.toThrow("Malformed recovery response");
    vi.unstubAllGlobals();
  });

  it("surfaces a recovery failure without a stack trace payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ error: "Database unavailable" }),
      })
    );

    await expect(
      fetchUpdatesAfterSequence("http://localhost:3001", "incident-123", 0)
    ).rejects.toThrow("Database unavailable");
    vi.unstubAllGlobals();
  });
});
