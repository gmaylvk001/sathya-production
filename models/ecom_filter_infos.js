import mongoose from "mongoose";

const FilterSchema = new mongoose.Schema({
  filter_name: { type: String, required: true },
  filter_slug: { type: String, required: true },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  filter_group: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// compound unique index 
FilterSchema.index({ filter_group: 1, filter_slug: 1 }, { unique: true });

export default mongoose.models.ecom_filter_infos || mongoose.model("ecom_filter_infos", FilterSchema);
