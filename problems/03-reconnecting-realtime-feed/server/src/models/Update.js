import mongoose, { Schema } from "mongoose";

const updateSchema = new Schema({
  updateId: { type: String, required: true, unique: true },
  incidentId: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, required: true },
  sequence: { type: Number, required: true },
});

updateSchema.index({ incidentId: 1, sequence: 1 }, { unique: true });

export const UpdateModel = mongoose.model("Update", updateSchema);
