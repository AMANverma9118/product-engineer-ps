import { createServer } from "node:http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { connectMongo, isMongoConnected } from "./config/mongo.js";
import { CounterModel } from "./models/Counter.js";
import { UpdateModel } from "./models/Update.js";
import { mongoFeedService } from "./services/feedService.js";
import { attachSocket } from "./socket/index.js";
import { logger } from "./utils/logger.js";

async function main() {
  const env = loadEnv();
  const app = createApp(mongoFeedService, {
    clientOrigin: env.CLIENT_ORIGIN,
    getMongoState: () => (isMongoConnected() ? "connected" : "disconnected"),
  });

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: env.CLIENT_ORIGIN },
  });

  attachSocket(io, mongoFeedService);

  try {
    await connectMongo(env.MONGODB_URI);
    await Promise.all([
      UpdateModel.createIndexes(),
      CounterModel.createIndexes(),
    ]);
  } catch (error) {
    logger.error("error_occurred", {
      where: "mongo_connect",
      message: error instanceof Error ? error.message : "unknown",
    });
    logger.warn("server_starting_without_mongo");
  }

  httpServer.listen(env.PORT, () => {
    logger.info("server_listening", {
      port: env.PORT,
      clientOrigin: env.CLIENT_ORIGIN,
    });
  });
}

main().catch((error) => {
  logger.error("error_occurred", {
    where: "startup",
    message: error instanceof Error ? error.message : "unknown",
  });
  process.exit(1);
});
