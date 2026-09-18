import type { IncidentUpdate } from "../types/update.ts";

export function isIncidentUpdate(value: unknown): value is IncidentUpdate {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const update = value as Record<string, unknown>;
  return (
    typeof update.updateId === "string" &&
    update.updateId.length > 0 &&
    typeof update.incidentId === "string" &&
    update.incidentId.length > 0 &&
    typeof update.message === "string" &&
    typeof update.createdAt === "string" &&
    typeof update.sequence === "number" &&
    Number.isInteger(update.sequence)
  );
}
