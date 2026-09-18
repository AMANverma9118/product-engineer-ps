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

function joinIncident(socket, incidentId) {
  return new Promise((resolve, reject) => {
    socket.emit("join_incident", { incidentId }, (ack) => {
      if (!ack || !ack.ok) {
        reject(new Error(ack && !ack.ok ? ack.error : "join failed"));
        return;
      }
      resolve();
    });
  });
}

function waitForUpdate(socket) {
  return new Promise((resolve) => {
    socket.once("update_created", (update) => resolve(update));
  });
}

describe("TEST 1: publishing and receiving a live update", () => {
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

  it("broadcasts a persisted update to both clients without polling", async () => {
    const feed = createMemoryFeedService();
    server = await startTestServer(feed);

    const clientA = await connectClient(server.url);
    const clientB = await connectClient(server.url);
    sockets.push(clientA, clientB);

    await joinIncident(clientA, "incident-123");
    await joinIncident(clientB, "incident-123");

    const receivedByB = waitForUpdate(clientB);

    const ack = await new Promise((resolve, reject) => {
      clientA.emit(
        "publish_update",
        { incidentId: "incident-123", message: "Database latency increased" },
        (response) => {
          if (!response?.ok) {
            reject(new Error(response?.error ?? "publish failed"));
            return;
          }
          resolve(response);
        }
      );
    });

    const live = await receivedByB;

    expect(ack.update.message).toBe("Database latency increased");
    expect(ack.update.incidentId).toBe("incident-123");
    expect(ack.update.sequence).toBe(1);
    expect(live).toEqual(ack.update);
    expect(feed.getAll()).toHaveLength(1);
    expect(feed.getAll()[0]?.updateId).toBe(ack.update.updateId);
  });
});
