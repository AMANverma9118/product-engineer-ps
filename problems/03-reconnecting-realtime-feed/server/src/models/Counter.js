import mongoose, { Schema } from "mongoose";

const counterSchema = new Schema({
  incidentId: { type: String, required: true, unique: true },
  seq: { type: Number, required: true, default: 0 },
});

export const CounterModel = mongoose.model("Counter", counterSchema);
