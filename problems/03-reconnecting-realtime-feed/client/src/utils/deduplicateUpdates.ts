import type { IncidentUpdate } from "../types/update.ts";

export function deduplicateUpdates(updates: IncidentUpdate[]): {
  updates: IncidentUpdate[];
  duplicatesIgnored: string[];
} {
  const seen = new Set<string>();
  const unique: IncidentUpdate[] = [];
  const duplicatesIgnored: string[] = [];

  for (const update of updates) {
    if (seen.has(update.updateId)) {
      duplicatesIgnored.push(update.updateId);
      continue;
    }
    seen.add(update.updateId);
    unique.push(update);
  }

  return { updates: unique, duplicatesIgnored };
}
