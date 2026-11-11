import mongoose from "mongoose";

const SathyaFilterSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    filter_group_id: { type: String, required: true },
    filter_name: { type: String, required: true },
    slug: { type: String, required: true },
  },
  {
    id: false,
    timestamps: true,
    collection: "sathya_filters",
  }
);

SathyaFilterSchema.index({ filter_group_id: 1, slug: 1 }, { unique: true });

export default mongoose.models.sathya_filters ||
  mongoose.model("sathya_filters", SathyaFilterSchema);
