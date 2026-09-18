export function computeNextSequence(currentMax) {
  return (currentMax ?? 0) + 1;
}

export function sortUpdatesBySequence(updates) {
  return [...updates].sort((a, b) => a.sequence - b.sequence);
}

export function selectUpdatesAfterSequence(updates, incidentId, afterSequence) {
  return sortUpdatesBySequence(
    updates.filter(
      (update) =>
        update.incidentId === incidentId && update.sequence > afterSequence
    )
  );
}

export function buildRecoveryResponse(updates, afterSequence) {
  const nextSequence =
    updates.length > 0 ? updates[updates.length - 1].sequence : afterSequence;
  return { updates, nextSequence };
}
