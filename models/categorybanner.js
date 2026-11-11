import mongoose from "mongoose";

const CategoryBannerSchema = new mongoose.Schema({
  banners: [
    {
      banner_image: { type: String, required: true },
      redirect_url: { type: String, required: true },
      order: { type: Number, default: 0 },
    }
  ],
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.category_banners ||
  mongoose.model("category_banners", CategoryBannerSchema);