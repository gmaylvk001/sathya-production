import mongoose from "mongoose";

const SathyaProductFilterSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    product_id: { type: String, required: true },
    filter_id: { type: String, required: true },
  },
  {
    id: false,
    timestamps: true,
    collection: "sathya_product_filter",
  }
);

SathyaProductFilterSchema.index({ product_id: 1, filter_id: 1 }, { unique: true });

export default mongoose.models.sathya_product_filter ||
  mongoose.model("sathya_product_filter", SathyaProductFilterSchema);
