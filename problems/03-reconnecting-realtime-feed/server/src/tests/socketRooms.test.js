import { io } from "socket.io-client";
import { afterEach, describe, expect, it } from "vitest";
import { createMemoryFeedService } from "./helpers/memoryFeed.js";
import { startTestServer } from "./helpers/testServer.js";

function connectClient(url) {
  const socket = io(url, {
    transports: ["websocket"],
    reconnection: false,
  });
  return new Promise((resolve, reject) => {
    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", (error) => reject(error));
  });
}

describe("incident rooms, reconnection recovery, and publish validation", () => {
  let server;
  const sockets = [];

  afterEach(async () => {
    for (const socket of sockets) {
      socket.disconnect();
    }
    sockets.length = 0;
    await server?.close();
    server = undefined;
  });

  it("does not mix updates from a different incident room", async () => {
    const feed = createMemoryFeedService();
    server = await startTestServer(feed);

    const roomA = await connectClient(server.url);
    const roomB = await connectClient(server.url);
    sockets.push(roomA, roomB);

    await new Promise((resolve, reject) => {
      roomA.emit("join_incident", { incidentId: "incident-123" }, (ack) => {
        ack?.ok ? resolve() : reject(new Error("join A failed"));
      });
    });
    await new Promise((resolve, reject) => {
      roomB.emit("join_incident", { incidentId: "incident-999" }, (ack) => {
        ack?.ok ? resolve() : reject(new Error("join B failed"));
      });
    });

    const leaked = [];
    roomB.on("update_created", (update) => leaked.push(update));

    const delivered = await new Promise((resolve, reject) => {
      roomA.once("update_created", (update) => resolve(update));
      roomA.emit(
        "publish_update",
        { incidentId: "incident-123", message: "only for 123" },
        (ack) => {
          if (!ack?.ok) {
            reject(new Error(ack?.error ?? "publish failed"));
          }
        }
      );
    });

    expect(delivered.incidentId).toBe("incident-123");
    expect(leaked).toEqual([]);
  });

  it("rejects invalid publish payloads without persisting", async () => {
    const feed = createMemoryFeedService();
    server = await startTestServer(feed);
    const client = await connectClient(server.url);
    sockets.push(client);

    const empty = await new Promise((resolve) => {
      client.emit(
        "publish_update",
        { incidentId: "incident-123", message: "  " },
        (ack) => resolve(ack)
      );
    });

    const missingIncident = await new Promise((resolve) => {
      client.emit(
        "publish_update",
        { incidentId: "", message: "hello" },
        (ack) => resolve(ack)
      );
    });

    expect(empty.ok).toBe(false);
    expect(missingIncident.ok).toBe(false);
    expect(feed.getAll()).toEqual([]);
  });

  it("recovers missed updates after a disconnect using the HTTP cursor", async () => {
    const feed = createMemoryFeedService();
    server = await startTestServer(feed);

    const clientA = await connectClient(server.url);
    const clientB = await connectClient(server.url);
    sockets.push(clientA, clientB);

    await new Promise((resolve, reject) => {
      clientB.emit("join_incident", { incidentId: "incident-123" }, (ack) => {
        ack?.ok ? resolve() : reject(new Error("join failed"));
      });
    });

    const first = await new Promise((resolve, reject) => {
      clientB.once("update_created", (update) => resolve(update));
      clientA.emit(
        "publish_update",
        { incidentId: "incident-123", message: "before disconnect" },
        (ack) => {
          if (!ack?.ok) reject(new Error("first publish failed"));
        }
      );
    });

    clientB.disconnect();

    const missedOne = await new Promise((resolve, reject) => {
      clientA.emit(
        "publish_update",
        { incidentId: "incident-123", message: "missed 1" },
        (ack) => (ack?.ok ? resolve(ack.update) : reject(new Error("missed 1")))
      );
    });
    const missedTwo = await new Promise((resolve, reject) => {
      clientA.emit(
        "publish_update",
        { incidentId: "incident-123", message: "missed 2" },
        (ack) => (ack?.ok ? resolve(ack.update) : reject(new Error("missed 2")))
      );
    });

    const recovered = await feed.getUpdatesAfterSequence(
      "incident-123",
      first.sequence
    );

    expect(recovered.updates.map((update) => update.updateId)).toEqual([
      missedOne.updateId,
      missedTwo.updateId,
    ]);
    expect(recovered.updates.map((update) => update.sequence)).toEqual([
      missedOne.sequence,
      missedTwo.sequence,
    ]);
    expect(recovered.nextSequence).toBe(missedTwo.sequence);
  });
});
