import cors from "cors";
import express from "express";
import { createRouter } from "./routes/index.js";

export function createApp(feedService, options) {
  const app = express();
  app.set("trust proxy", 1);
  app.use(cors({ origin: options.clientOrigin }));
  app.use(express.json());
  app.use("/api", createRouter(feedService, options.getMongoState));
  return app;
}
