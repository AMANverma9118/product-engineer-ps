import type { IncidentUpdate } from "../types/update.ts";
import { deduplicateUpdates } from "./deduplicateUpdates.ts";
import { sortUpdatesBySequence } from "./sortUpdatesBySequence.ts";

export function mergeUpdates(
  existing: IncidentUpdate[],
  incoming: IncidentUpdate[]
): {
  updates: IncidentUpdate[];
  duplicatesIgnored: string[];
} {
  const existingIds = new Set(existing.map((update) => update.updateId));
  const duplicatesIgnored: string[] = [];
  const accepted: IncidentUpdate[] = [];

  for (const update of incoming) {
    if (existingIds.has(update.updateId)) {
      duplicatesIgnored.push(update.updateId);
      continue;
    }
    existingIds.add(update.updateId);
    accepted.push(update);
  }

  const { updates } = deduplicateUpdates([...existing, ...accepted]);
  return {
    updates: sortUpdatesBySequence(updates),
    duplicatesIgnored,
  };
}

export function lastReceivedSequence(updates: IncidentUpdate[]): number {
  if (updates.length === 0) {
    return 0;
  }
  return updates.reduce(
    (max, update) => (update.sequence > max ? update.sequence : max),
    0
  );
}

export function filterByIncident(
  updates: IncidentUpdate[],
  incidentId: string
): IncidentUpdate[] {
  return updates.filter((update) => update.incidentId === incidentId);
}
