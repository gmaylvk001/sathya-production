import mongoose from "mongoose";

const PincodeLocationSchema = new mongoose.Schema(
  {
    pincode: { type: String, required: true, unique: true, index: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    district: { type: String, default: "unknown" },
    state: { type: String, default: "Tamil Nadu" },
    region: {
      type: String,
      enum: ["tamilnadu", "andhra", "kerala", "karnataka", "telangana"],
      default: "tamilnadu",
    },
    display_name: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.PincodeLocation ||
  mongoose.model("PincodeLocation", PincodeLocationSchema);
