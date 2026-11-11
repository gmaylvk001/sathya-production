import mongoose from "mongoose";

const SathyaProdSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    item_code: { type: String, required: true },
    product_type: { type: String, default: "" },
  },
  {
    id: false,
    timestamps: true,
    collection: "sathya_prod",
  }
);

SathyaProdSchema.index({ item_code: 1 });
SathyaProdSchema.index({ product_type: 1 });

export default mongoose.models.sathya_prod || mongoose.model("sathya_prod", SathyaProdSchema);
