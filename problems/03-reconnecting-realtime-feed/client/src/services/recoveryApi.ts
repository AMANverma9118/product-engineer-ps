import type { RecoveryResponse } from "../types/update.ts";
import { isIncidentUpdate } from "../utils/isIncidentUpdate.ts";
import { logger } from "../utils/logger.ts";

export async function fetchUpdatesAfterSequence(
  apiUrl: string,
  incidentId: string,
  afterSequence: number
): Promise<RecoveryResponse> {
  logger.info("recovery_requested", { incidentId, afterSequence });

  const url = `${apiUrl}/api/incidents/${encodeURIComponent(incidentId)}/updates?afterSequence=${afterSequence}`;
  const response = await fetch(url);

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("Malformed recovery response");
  }

  if (!response.ok) {
    const errorBody = body as { error?: unknown };
    const message =
      typeof errorBody.error === "string"
        ? errorBody.error
        : `Recovery failed (${response.status})`;
    throw new Error(message);
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !Array.isArray((body as { updates?: unknown }).updates) ||
    typeof (body as { nextSequence?: unknown }).nextSequence !== "number"
  ) {
    throw new Error("Malformed recovery response");
  }

  const parsed = body as { updates: unknown[]; nextSequence: number };
  const updates = parsed.updates.filter(isIncidentUpdate);

  if (updates.length !== parsed.updates.length) {
    logger.warn("malformed_update_dropped", {
      dropped: parsed.updates.length - updates.length,
    });
  }

  logger.info("recovery_returned", {
    incidentId,
    afterSequence,
    count: updates.length,
    nextSequence: parsed.nextSequence,
  });

  return { updates, nextSequence: parsed.nextSequence };
}
