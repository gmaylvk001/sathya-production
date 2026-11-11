import mongoose from "mongoose";

const VideoCardSchema = new mongoose.Schema({
  title: { type: String, default: "Instagram Reel" },
  thumbnail_image: { type: String, default: "" },
  video_url: { type: String, required: true },
  state: {
    type: String,
    enum: ["all", "tamilnadu", "andhra", "kerala", "karnataka", "telangana"],
    default: "all",
  },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

if (mongoose.models && mongoose.models.VideoCard) {
  delete mongoose.models.VideoCard;
}

export default mongoose.models.VideoCard ||
  mongoose.model("VideoCard", VideoCardSchema);
