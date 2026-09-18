import { MongoUnavailableError, ValidationError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import {
  parseAfterSequence,
  validateIncidentId,
} from "../utils/validateUpdate.js";

function sendError(res, status, error) {
  res.status(status).json({ error });
}

export function createUpdatesController(feedService) {
  return async function getIncidentUpdates(req, res) {
    const incident = validateIncidentId(req.params.incidentId);
    if (!incident.ok) {
      sendError(res, 400, incident.error);
      return;
    }

    const cursor = parseAfterSequence(req.query.afterSequence);
    if (!cursor.ok) {
      sendError(res, 400, cursor.error);
      return;
    }

    logger.info("recovery_requested", {
      incidentId: incident.incidentId,
      afterSequence: cursor.afterSequence,
    });

    try {
      const result = await feedService.getUpdatesAfterSequence(
        incident.incidentId,
        cursor.afterSequence
      );

      logger.info("recovery_returned", {
        incidentId: incident.incidentId,
        afterSequence: cursor.afterSequence,
        count: result.updates.length,
        nextSequence: result.nextSequence,
      });

      res.json(result);
    } catch (error) {
      if (error instanceof ValidationError) {
        sendError(res, 400, error.message);
        return;
      }
      if (error instanceof MongoUnavailableError) {
        logger.error("error_occurred", {
          where: "recovery",
          message: error.message,
        });
        sendError(res, 503, "Database unavailable");
        return;
      }

      logger.error("error_occurred", {
        where: "recovery",
        message: error instanceof Error ? error.message : "unknown",
      });
      sendError(res, 500, "Failed to recover updates");
    }
  };
}
