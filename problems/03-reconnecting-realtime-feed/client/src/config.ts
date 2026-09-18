export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ?? "http://localhost:3001";

export const RECONNECTION_DELAY_MS = 1000;
export const RECONNECTION_DELAY_MAX_MS = 5000;
export const MESSAGE_MAX_LENGTH = 500;
