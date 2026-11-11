import mongoose from "mongoose";

const SingleBannerTwoSchema = new mongoose.Schema({
  banner_image: { type: String, required: true }, // store image path
  redirect_url: { type: String, required: true },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.singlebanner_two ||
  mongoose.model("singlebanner_two", SingleBannerTwoSchema);