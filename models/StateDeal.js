import mongoose from "mongoose";

const StateDealSchema = new mongoose.Schema(
  {
    dealId: { type: Number, required: true, unique: true },
    offerTimerId: { type: Number, required: true },
    offerTimerTitle: { type: String, required: true, trim: true },
    offerTimerRef: { type: mongoose.Schema.Types.ObjectId, ref: "OfferTimer" },
    state: { type: String, required: true, trim: true, lowercase: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

// Compound unique index to prevent duplicate (offerTimerId + state) mapping
StateDealSchema.index({ offerTimerId: 1, state: 1 }, { unique: true });
// Customer global timer: latest active deal for a state
StateDealSchema.index({ state: 1, updatedAt: -1 });

export default mongoose.models.StateDeal || mongoose.model("StateDeal", StateDealSchema);
