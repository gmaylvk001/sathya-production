import mongoose from "mongoose";

const EmiFinanceSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: false, default: "", trim: true },
    useSlugForUrl: { type: Boolean, default: false },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: true }
);

export default mongoose.models.EmiFinance || mongoose.model("EmiFinance", EmiFinanceSchema);
