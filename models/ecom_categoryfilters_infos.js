import mongoose from "mongoose";

const CategoryfilterSchema = new mongoose.Schema({
  filter_id: String,
  category_id: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.ecom_categoryfilters_infos || mongoose.model("ecom_categoryfilters_infos", CategoryfilterSchema);