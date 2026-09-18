import dotenv from "dotenv";

dotenv.config();

function readNumber(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

function readOrigins(raw) {
  const origins = (raw ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error("CLIENT_ORIGIN must include at least one origin");
  }

  return origins.length === 1 ? origins[0] : origins;
}

export function loadEnv() {
  return {
    PORT: readNumber("PORT", 3001),
    MONGODB_URI:
      process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/incident-feed",
    CLIENT_ORIGIN: readOrigins(process.env.CLIENT_ORIGIN),
  };
}
