import type { IncidentUpdate } from "../types/update.ts";

export function sortUpdatesBySequence(
  updates: IncidentUpdate[]
): IncidentUpdate[] {
  return [...updates].sort((a, b) => a.sequence - b.sequence);
}
