import mongoose from "mongoose";

const OpenBoxBannerSchema = new mongoose.Schema({
  banners: [
    {
      banner_image: { type: String, default: "" },
      redirect_url: { type: String, default: "" },
      order: { type: Number, default: 0 },
      status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    }
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.open_box_banners ||
  mongoose.model("open_box_banners", OpenBoxBannerSchema);