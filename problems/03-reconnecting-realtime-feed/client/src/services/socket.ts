import { io, type Socket } from "socket.io-client";
import {
  RECONNECTION_DELAY_MAX_MS,
  RECONNECTION_DELAY_MS,
  SOCKET_URL,
} from "../config.ts";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../types/update.ts";

export type FeedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: FeedSocket | null = null;

export function getSocket(): FeedSocket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: RECONNECTION_DELAY_MS,
      reconnectionDelayMax: RECONNECTION_DELAY_MAX_MS,
      randomizationFactor: 0.5,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}
