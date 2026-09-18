import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { MongoUnavailableError } from "../utils/errors.js";
import { createMemoryFeedService } from "./helpers/memoryFeed.js";

describe("TEST 2: querying updates after a sequence cursor", () => {
  it("replays only later updates in ascending sequence order", async () => {
    const feed = createMemoryFeedService();
    await feed.persistUpdate({ incidentId: "incident-123", message: "one" });
    await feed.persistUpdate({ incidentId: "incident-123", message: "two" });
    await feed.persistUpdate({ incidentId: "incident-123", message: "three" });
    await feed.persistUpdate({
      incidentId: "other-incident",
      message: "should not mix",
    });

    const app = createApp(feed, {
      clientOrigin: "*",
      getMongoState: () => "connected",
    });

    const response = await request(app).get(
      "/api/incidents/incident-123/updates?afterSequence=1"
    );

    expect(response.status).toBe(200);
    expect(response.body.updates.map((update) => update.message)).toEqual([
      "two",
      "three",
    ]);
    expect(response.body.updates.map((update) => update.sequence)).toEqual([
      2, 3,
    ]);
    expect(response.body.nextSequence).toBe(3);
  });

  it("returns an empty recovery payload when nothing is after the cursor", async () => {
    const feed = createMemoryFeedService();
    await feed.persistUpdate({ incidentId: "incident-123", message: "only" });

    const app = createApp(feed, {
      clientOrigin: "*",
      getMongoState: () => "connected",
    });

    const response = await request(app).get(
      "/api/incidents/incident-123/updates?afterSequence=1"
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ updates: [], nextSequence: 1 });
  });

  it("keeps updateId stable between persist and recovery", async () => {
    const feed = createMemoryFeedService();
    const created = await feed.persistUpdate({
      incidentId: "incident-123",
      message: "stable id",
    });

    const app = createApp(feed, {
      clientOrigin: "*",
      getMongoState: () => "connected",
    });

    const response = await request(app).get(
      "/api/incidents/incident-123/updates?afterSequence=0"
    );

    expect(response.body.updates).toHaveLength(1);
    expect(response.body.updates[0].updateId).toBe(created.updateId);
    expect(response.body.updates[0].sequence).toBe(created.sequence);
  });

  it("rejects invalid incident ids and cursors", async () => {
    const app = createApp(createMemoryFeedService(), {
      clientOrigin: "*",
      getMongoState: () => "connected",
    });

    const badIncident = await request(app).get(
      "/api/incidents/incident%20123/updates"
    );
    expect(badIncident.status).toBe(400);

    const badCursor = await request(app).get(
      "/api/incidents/incident-123/updates?afterSequence=-4"
    );
    expect(badCursor.status).toBe(400);
  });

  it("returns 503 when MongoDB is unavailable", async () => {
    const app = createApp(
      {
        persistUpdate: async () => {
          throw new Error("not used");
        },
        getUpdatesAfterSequence: async () => {
          throw new MongoUnavailableError();
        },
      },
      {
        clientOrigin: "*",
        getMongoState: () => "disconnected",
      }
    );

    const health = await request(app).get("/api/health");
    expect(health.body).toEqual({ status: "ok", mongo: "disconnected" });

    const recovery = await request(app).get(
      "/api/incidents/incident-123/updates?afterSequence=0"
    );
    expect(recovery.status).toBe(503);
    expect(recovery.body.error).toBe("Database unavailable");
    expect(recovery.body.error).not.toMatch(/stack|Error:/);
  });
});
