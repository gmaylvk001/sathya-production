import mongoose from "mongoose";

const SathyaProductFilterSkippedSchema = new mongoose.Schema(
  {
    id: { type: String, default: "" },
    product_id: { type: String, default: "" },
    filter_id: { type: String, default: "" },
    excel_row: { type: Number },
    skip_reason: { type: String, default: "duplicate_id_in_file" },
  },
  {
    id: false,
    timestamps: true,
    collection: "sathya_product_filter_skipped",
  }
);

SathyaProductFilterSkippedSchema.index({ id: 1 });
SathyaProductFilterSkippedSchema.index({ product_id: 1, filter_id: 1 });

export default mongoose.models.sathya_product_filter_skipped ||
  mongoose.model("sathya_product_filter_skipped", SathyaProductFilterSkippedSchema);
