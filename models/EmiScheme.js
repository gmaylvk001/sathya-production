import mongoose from "mongoose";

const EmiSchemeSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true },
    schemeCode: { type: String, required: true, unique: true },
    emiFinanceName: { type: String },
    tenure: { type: Number },
    advanceEmi: { type: Number },
    dbd: { type: Number },
    pf: { type: Number },
  },
  { timestamps: true }
);

export default mongoose.models.EmiScheme || mongoose.model("EmiScheme", EmiSchemeSchema);
