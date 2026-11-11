import mongoose from "mongoose";

const ProductfilterSchema = new mongoose.Schema({
  filter_id: String,
  product_id: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.ecom_productfilters_infos || mongoose.model("ecom_productfilters_infos", ProductfilterSchema);
