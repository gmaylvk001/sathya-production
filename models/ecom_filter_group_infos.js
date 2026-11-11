import mongoose from "mongoose";

const FilterSchema = new mongoose.Schema({
  filtergroup_name: { type: String, required: true },
  filtergroup_slug: { type: String, unique: true, required: true },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.ecom_filter_group_infos || mongoose.model("ecom_filter_group_infos", FilterSchema);
