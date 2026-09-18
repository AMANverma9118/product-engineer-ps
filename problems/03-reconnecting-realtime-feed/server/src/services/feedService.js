import { randomUUID } from "node:crypto";
import { isMongoConnected } from "../config/mongo.js";
import { CounterModel } from "../models/Counter.js";
import { UpdateModel } from "../models/Update.js";
import { MongoUnavailableError, ValidationError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import { buildRecoveryResponse } from "../utils/recovery.js";
import { validateUpdate } from "../utils/validateUpdate.js";

function serializeUpdate(doc) {
  return {
    updateId: doc.updateId,
    incidentId: doc.incidentId,
    message: doc.message,
    createdAt: doc.createdAt.toISOString(),
    sequence: doc.sequence,
  };
}

function assertMongoAvailable() {
  if (!isMongoConnected()) {
    throw new MongoUnavailableError();
  }
}

async function nextSequence(incidentId) {
  // One Counter document per incident. $inc is atomic on that document, so
  // concurrent publishes on a single MongoDB deployment get unique sequences.
  // Sequence gaps are possible if increment succeeds and insert later fails.
  // Multiple API servers can share this counter, but they cannot share live
  // Socket.IO broadcasts without a separate adapter. That is out of scope.
  const counter = await CounterModel.findOneAndUpdate(
    { incidentId },
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true }
  );

  if (!counter) {
    throw new Error("Failed to assign sequence");
  }

  return counter.seq;
}

export async function persistUpdate(payload) {
  const validation = validateUpdate(payload);
  if (!validation.ok) {
    throw new ValidationError(validation.error);
  }

  assertMongoAvailable();

  const updateId = randomUUID();
  const createdAt = new Date();
  const sequence = await nextSequence(validation.incidentId);

  const created = await UpdateModel.create({
    updateId,
    incidentId: validation.incidentId,
    message: validation.message,
    createdAt,
    sequence,
  });

  const update = serializeUpdate(created);
  logger.info("update_persisted", {
    updateId: update.updateId,
    incidentId: update.incidentId,
    sequence: update.sequence,
  });
  return update;
}

export async function getUpdatesAfterSequence(incidentId, afterSequence) {
  assertMongoAvailable();

  const docs = await UpdateModel.find({
    incidentId,
    sequence: { $gt: afterSequence },
  })
    .sort({ sequence: 1 })
    .lean()
    .exec();

  const updates = docs.map((doc) =>
    serializeUpdate({
      updateId: doc.updateId,
      incidentId: doc.incidentId,
      message: doc.message,
      createdAt: doc.createdAt,
      sequence: doc.sequence,
    })
  );

  return buildRecoveryResponse(updates, afterSequence);
}

export const mongoFeedService = {
  persistUpdate,
  getUpdatesAfterSequence,
};
