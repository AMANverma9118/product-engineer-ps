export const MESSAGE_MAX_LENGTH = 500;
export const INCIDENT_ID_MAX_LENGTH = 64;
export const INCIDENT_ID_PATTERN = /^[a-zA-Z0-9-]+$/;

export function validateIncidentId(incidentId) {
  if (typeof incidentId !== "string" || incidentId.trim() === "") {
    return { ok: false, error: "incidentId is required" };
  }

  const trimmed = incidentId.trim();
  if (trimmed.length > INCIDENT_ID_MAX_LENGTH) {
    return { ok: false, error: "incidentId is too long" };
  }
  if (!INCIDENT_ID_PATTERN.test(trimmed)) {
    return { ok: false, error: "incidentId must be alphanumeric with hyphens" };
  }

  return { ok: true, incidentId: trimmed };
}

export function validateUpdate(payload) {
  const incident = validateIncidentId(payload.incidentId);
  if (!incident.ok) {
    return incident;
  }

  if (typeof payload.message !== "string") {
    return { ok: false, error: "message is required" };
  }

  const message = payload.message.trim();
  if (message === "") {
    return { ok: false, error: "message must not be empty" };
  }
  if (message.length > MESSAGE_MAX_LENGTH) {
    return {
      ok: false,
      error: `message must be at most ${MESSAGE_MAX_LENGTH} characters`,
    };
  }

  return { ok: true, incidentId: incident.incidentId, message };
}

export function parseAfterSequence(value) {
  if (value === undefined || value === null || value === "") {
    return { ok: true, afterSequence: 0 };
  }

  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = typeof raw === "number" ? raw : Number(raw);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return { ok: false, error: "afterSequence must be a non-negative integer" };
  }

  return { ok: true, afterSequence: parsed };
}
