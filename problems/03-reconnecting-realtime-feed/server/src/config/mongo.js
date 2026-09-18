import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

export async function connectMongo(uri) {
  mongoose.connection.on("connected", () => {
    logger.info("mongo_connected");
  });
  mongoose.connection.on("disconnected", () => {
    logger.warn("mongo_disconnected");
  });
  mongoose.connection.on("error", (error) => {
    logger.error("mongo_error", {
      message: error instanceof Error ? error.message : "unknown",
    });
  });

  await mongoose.connect(uri);
}

export function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}
