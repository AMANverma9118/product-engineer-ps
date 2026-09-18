import { useCallback, useEffect, useRef, useState } from "react";
import { API_URL, MESSAGE_MAX_LENGTH } from "../config.ts";
import { getSocket } from "../services/socket.ts";
import { fetchUpdatesAfterSequence } from "../services/recoveryApi.ts";
import type { ConnectionState } from "../types/connection.ts";
import type { IncidentUpdate } from "../types/update.ts";
import { isIncidentUpdate } from "../utils/isIncidentUpdate.ts";
import { logger } from "../utils/logger.ts";
import {
  filterByIncident,
  lastReceivedSequence,
  mergeUpdates,
} from "../utils/mergeUpdates.ts";

export function useIncidentFeed(incidentId: string) {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("RECONNECTING");
  const [updates, setUpdates] = useState<IncidentUpdate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const updatesRef = useRef<IncidentUpdate[]>([]);
  const lastSeqRef = useRef(0);
  const manualDisconnectRef = useRef(false);
  const hasConnectedOnceRef = useRef(false);
  const incidentIdRef = useRef(incidentId);

  incidentIdRef.current = incidentId;

  const ingest = useCallback(
    (incoming: IncidentUpdate[]) => {
      const forIncident = filterByIncident(incoming, incidentIdRef.current);
      if (forIncident.length === 0) {
        return;
      }

      const merged = mergeUpdates(updatesRef.current, forIncident);
      for (const updateId of merged.duplicatesIgnored) {
        logger.info("duplicate_ignored", { updateId });
      }

      updatesRef.current = merged.updates;
      lastSeqRef.current = lastReceivedSequence(merged.updates);
      setUpdates(merged.updates);
    },
    []
  );

  const recover = useCallback(async () => {
    try {
      const result = await fetchUpdatesAfterSequence(
        API_URL,
        incidentIdRef.current,
        lastSeqRef.current
      );
      ingest(result.updates);
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Recovery request failed";
      logger.error("error_occurred", { where: "recovery", message });
      setError(message);
    }
  }, [ingest]);

  const joinAndRecover = useCallback(() => {
    const socket = getSocket();
    socket.emit(
      "join_incident",
      { incidentId: incidentIdRef.current },
      (ack) => {
        if (ack && !ack.ok) {
          logger.error("error_occurred", {
            where: "join_incident",
            message: ack.error,
          });
          setError(ack.error);
          return;
        }
        void recover();
      }
    );
  }, [recover]);

  useEffect(() => {
    const socket = getSocket();

    const handleConnect = () => {
      const event = hasConnectedOnceRef.current
        ? "client_reconnected"
        : "client_connected";
      logger.info(event, { socketId: socket.id ?? "" });
      hasConnectedOnceRef.current = true;
      setConnectionState("CONNECTED");
      setError(null);
      joinAndRecover();
    };

    const handleDisconnect = (reason: string) => {
      logger.info("client_disconnected", { reason });
      if (manualDisconnectRef.current) {
        setConnectionState("DISCONNECTED");
        return;
      }
      setConnectionState(socket.active ? "RECONNECTING" : "DISCONNECTED");
    };

    const handleReconnectAttempt = () => {
      logger.info("client_reconnecting");
      setConnectionState("RECONNECTING");
    };

    const handleReconnectFailed = () => {
      logger.error("error_occurred", {
        where: "socket",
        message: "Reconnection failed",
      });
      setConnectionState("DISCONNECTED");
    };

    const handleConnectError = (err: Error) => {
      logger.error("error_occurred", {
        where: "socket",
        message: err.message,
      });
      if (!socket.connected) {
        setConnectionState(socket.active ? "RECONNECTING" : "DISCONNECTED");
      }
    };

    const handleUpdateCreated = (update: IncidentUpdate) => {
      if (!isIncidentUpdate(update)) {
        logger.error("error_occurred", {
          where: "update_created",
          message: "Malformed server response",
        });
        setError("Received a malformed update from the server");
        return;
      }
      ingest([update]);
    };

    const handleServerError = (payload: { message: string }) => {
      logger.error("error_occurred", {
        where: "server",
        message: payload.message,
      });
      setError(payload.message);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("update_created", handleUpdateCreated);
    socket.on("feed_error", handleServerError);
    socket.on("connect_error", handleConnectError);
    socket.io.on("reconnect_attempt", handleReconnectAttempt);
    socket.io.on("reconnect_failed", handleReconnectFailed);

    if (socket.connected) {
      handleConnect();
    } else if (!socket.active) {
      setConnectionState("DISCONNECTED");
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("update_created", handleUpdateCreated);
      socket.off("feed_error", handleServerError);
      socket.off("connect_error", handleConnectError);
      socket.io.off("reconnect_attempt", handleReconnectAttempt);
      socket.io.off("reconnect_failed", handleReconnectFailed);
    };
  }, [ingest, joinAndRecover]);

  const publishUpdate = useCallback(
    (message: string) => {
      const trimmed = message.trim();
      if (trimmed === "") {
        setError("message must not be empty");
        return;
      }
      if (trimmed.length > MESSAGE_MAX_LENGTH) {
        setError(`message must be at most ${MESSAGE_MAX_LENGTH} characters`);
        return;
      }

      const socket = getSocket();
      if (!socket.connected) {
        setError("Cannot publish while disconnected");
        return;
      }

      socket.emit(
        "publish_update",
        { incidentId: incidentIdRef.current, message: trimmed },
        (ack) => {
          if (!ack?.ok) {
            const messageText = ack?.error ?? "Failed to publish update";
            logger.error("error_occurred", {
              where: "publish_update",
              message: messageText,
            });
            setError(messageText);
            return;
          }
          logger.info("update_published", {
            updateId: ack.update.updateId,
            sequence: ack.update.sequence,
          });
          ingest([ack.update]);
          setError(null);
        }
      );
    },
    [ingest]
  );

  const simulateDisconnect = useCallback(() => {
    const socket = getSocket();
    manualDisconnectRef.current = true;
    socket.io.opts.reconnection = false;
    socket.disconnect();
    setConnectionState("DISCONNECTED");
    logger.info("simulate_disconnect");
  }, []);

  const reconnect = useCallback(() => {
    const socket = getSocket();
    manualDisconnectRef.current = false;
    socket.io.opts.reconnection = true;
    setConnectionState("RECONNECTING");
    logger.info("manual_reconnect");
    if (!socket.connected) {
      socket.connect();
    }
  }, []);

  return {
    connectionState,
    updates,
    error,
    publishUpdate,
    simulateDisconnect,
    reconnect,
  };
}
