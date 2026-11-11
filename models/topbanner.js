import mongoose from "mongoose";

const TopBannerSchema = new mongoose.Schema({
  banner_image: { type: String, required: true }, // store image path
  mobile_banner_image: { type: String, default: "" },
  redirect_url: { type: String, required: true },
  state: {
    type: String,
    enum: ["tamilnadu", "andhra", "kerala", "karnataka", "telangana", "all"],
    default: "all",
    index: true,
  },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  order: { type: Number, default: 0 }, // 👈 added for sorting
  startDate: { type: Date, default: null }, // 👈 timer start
  endDate: { type: Date, default: null },   // 👈 timer end
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

if (mongoose.models.top_banners) {
  delete mongoose.models.top_banners;
}

export default mongoose.models.top_banners ||
  mongoose.model("top_banners", TopBannerSchema);


