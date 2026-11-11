import mongoose from "mongoose";

const BannerItemSchema = new mongoose.Schema(
  {
    image: { type: String, default: "" },
    url: { type: String, default: "" },
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

/**
 * Home: Single (1 full-width) or Double (left + right) linked banners.
 */
const HomeSplitBannerSchema = new mongoose.Schema(
  {
    pageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HomePage",
      required: true,
    },
    instanceId: { type: String, required: true, unique: true },
    bannerCount: { type: Number, enum: [1, 2], default: 1 },
    banners: { type: [BannerItemSchema], default: [] },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true, collection: "home_split_banners" }
);

HomeSplitBannerSchema.index({ pageId: 1 });

if (mongoose.models.HomeSplitBanner) {
  delete mongoose.models.HomeSplitBanner;
}

export default mongoose.model("HomeSplitBanner", HomeSplitBannerSchema);
