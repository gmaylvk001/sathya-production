import mongoose from "mongoose";

const warrantySchema = new mongoose.Schema(
  {
    item_no: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    brand: { type: String },
    qbc_code: { type: String },
    year: { type: Number },
    price: { type: Number, required: true },
    category: { type: String },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: true }
);

export default mongoose.models.Warranty ||
  mongoose.model("Warranty", warrantySchema);