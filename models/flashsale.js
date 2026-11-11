import mongoose from "mongoose";

const FlashSaleSchema = new mongoose.Schema({
  background_image: { type: String, required: true }, // 429x250
  banner_image: { type: String, required: true },     // 260x240
  title: { type: String, required: true },
  redirect_url: { type: String, required: true },  // ✅ only one URL

  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.FlashSale ||
  mongoose.model("FlashSale", FlashSaleSchema);
