import mongoose from "mongoose";

const EmiProductSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true },
    emiFinance: { type: mongoose.Schema.Types.ObjectId, ref: "EmiFinance" },
    status: { type: String, enum: ["Active", "Inactive", "true", "false"], default: "true" },
    itemCode: { type: String, required: true },
    schemeCode: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export default mongoose.models.EmiProduct || mongoose.model("EmiProduct", EmiProductSchema);
