import mongoose from "mongoose";

const PincodeServiceabilitySchema = new mongoose.Schema({
  sapCode: { type: String, required: true },
  branchName: { type: String, required: true },
  branchPincode: { type: String, required: true },
  serviceablePincode: { type: String, required: true },
  distanceKm: { type: Number, required: true },
  branchAddress: { type: String },
}, { timestamps: true });

PincodeServiceabilitySchema.index({ serviceablePincode: 1, distanceKm: 1 });
PincodeServiceabilitySchema.index({ sapCode: 1, serviceablePincode: 1 }, { unique: true });

export default mongoose.models.PincodeServiceability ||
  mongoose.model("PincodeServiceability", PincodeServiceabilitySchema);