import mongoose from "mongoose";

const SathyaFilterGroupSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    filter_grp_name: { type: String, required: true },
    sort_order: { type: Number, default: 0 },
    slug: { type: String, required: true, unique: true },
  },
  {
    id: false,
    timestamps: true,
    collection: "sathya_filter_groups",
  }
);

export default mongoose.models.sathya_filter_groups ||
  mongoose.model("sathya_filter_groups", SathyaFilterGroupSchema);
