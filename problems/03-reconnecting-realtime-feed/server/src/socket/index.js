import { MongoUnavailableError, ValidationError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import { roomForIncident } from "../utils/room.js";
import { validateIncidentId, validateUpdate } from "../utils/validateUpdate.js";

function ackError(message) {
  return { ok: false, error: message };
}

export function attachSocket(io, feedService) {
  io.on("connection", (socket) => {
    logger.info("client_connected", { socketId: socket.id });

    socket.on("join_incident", (payload, ack) => {
      const incident = validateIncidentId(payload?.incidentId);
      if (!incident.ok) {
        logger.error("error_occurred", {
          where: "join_incident",
          socketId: socket.id,
          message: incident.error,
        });
        ack?.(ackError(incident.error));
        return;
      }

      void socket.join(roomForIncident(incident.incidentId));
      logger.info("client_joined_incident", {
        socketId: socket.id,
        incidentId: incident.incidentId,
      });
      ack?.({ ok: true });
    });

    socket.on("publish_update", (payload, ack) => {
      void (async () => {
        const validation = validateUpdate(payload ?? {});
        if (!validation.ok) {
          logger.error("error_occurred", {
            where: "publish_update",
            socketId: socket.id,
            message: validation.error,
          });
          ack?.(ackError(validation.error));
          return;
        }

        try {
          const update = await feedService.persistUpdate({
            incidentId: validation.incidentId,
            message: validation.message,
          });

          logger.info("update_published", {
            socketId: socket.id,
            updateId: update.updateId,
            incidentId: update.incidentId,
            sequence: update.sequence,
          });

          io.to(roomForIncident(update.incidentId)).emit(
            "update_created",
            update
          );

          logger.info("update_broadcast", {
            updateId: update.updateId,
            incidentId: update.incidentId,
            sequence: update.sequence,
          });

          ack?.({ ok: true, update });
        } catch (error) {
          if (error instanceof ValidationError) {
            ack?.(ackError(error.message));
            return;
          }
          if (error instanceof MongoUnavailableError) {
            logger.error("error_occurred", {
              where: "publish_update",
              socketId: socket.id,
              message: error.message,
            });
            ack?.(ackError("Database unavailable"));
            socket.emit("feed_error", { message: "Database unavailable" });
            return;
          }

          logger.error("error_occurred", {
            where: "publish_update",
            socketId: socket.id,
            message: error instanceof Error ? error.message : "unknown",
          });
          ack?.(ackError("Failed to publish update"));
        }
      })();
    });

    socket.on("disconnect", (reason) => {
      logger.info("client_disconnected", {
        socketId: socket.id,
        reason,
      });
    });
  });
}
