import mongoose from "mongoose";

const RateLimitSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    count: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: false }
);

export default mongoose.models.RateLimit || mongoose.model("RateLimit", RateLimitSchema);
