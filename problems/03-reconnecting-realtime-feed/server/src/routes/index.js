import { Router } from "express";
import { createHealthController } from "../controllers/healthController.js";
import { createUpdatesController } from "../controllers/updatesController.js";

export function createRouter(feedService, getMongoState) {
  const router = Router();
  router.get("/health", createHealthController(getMongoState));
  router.get(
    "/incidents/:incidentId/updates",
    createUpdatesController(feedService)
  );
  return router;
}
