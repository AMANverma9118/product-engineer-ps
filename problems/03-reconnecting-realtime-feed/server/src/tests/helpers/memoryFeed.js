import { randomUUID } from "node:crypto";
import { ValidationError } from "../../utils/errors.js";
import {
  buildRecoveryResponse,
  computeNextSequence,
  selectUpdatesAfterSequence,
} from "../../utils/recovery.js";
import { validateUpdate } from "../../utils/validateUpdate.js";

export function createMemoryFeedService() {
  const updates = [];
  const sequences = new Map();

  return {
    async persistUpdate(payload) {
      const validation = validateUpdate(payload);
      if (!validation.ok) {
        throw new ValidationError(validation.error);
      }

      const currentMax = sequences.get(validation.incidentId) ?? null;
      const sequence = computeNextSequence(currentMax);
      sequences.set(validation.incidentId, sequence);

      const update = {
        updateId: randomUUID(),
        incidentId: validation.incidentId,
        message: validation.message,
        createdAt: new Date().toISOString(),
        sequence,
      };
      updates.push(update);
      return update;
    },

    async getUpdatesAfterSequence(incidentId, afterSequence) {
      const selected = selectUpdatesAfterSequence(
        updates,
        incidentId,
        afterSequence
      );
      return buildRecoveryResponse(selected, afterSequence);
    },

    getAll() {
      return [...updates];
    },
  };
}
