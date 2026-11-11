import mongoose from "mongoose";

const OtpSchema = new mongoose.Schema(
  {
    mobile: { type: String, default: null, index: true },
    email: { type: String, default: null, index: true },
    otp: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true }
);

export default mongoose.models.Otp || mongoose.model("Otp", OtpSchema);
