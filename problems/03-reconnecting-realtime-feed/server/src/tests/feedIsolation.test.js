import { describe, expect, it } from "vitest";
import { createMemoryFeedService } from "./helpers/memoryFeed.js";

describe("memory feed sequence isolation", () => {
  it("assigns independent sequences per incident", async () => {
    const feed = createMemoryFeedService();
    const a1 = await feed.persistUpdate({
      incidentId: "incident-123",
      message: "a1",
    });
    const b1 = await feed.persistUpdate({
      incidentId: "incident-999",
      message: "b1",
    });
    const a2 = await feed.persistUpdate({
      incidentId: "incident-123",
      message: "a2",
    });

    expect(a1.sequence).toBe(1);
    expect(b1.sequence).toBe(1);
    expect(a2.sequence).toBe(2);

    const recoveredB = await feed.getUpdatesAfterSequence("incident-999", 0);
    expect(recoveredB.updates.map((update) => update.message)).toEqual(["b1"]);
  });
});
