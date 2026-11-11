import mongoose from "mongoose";

/**
 * Percentage-based hotspot region on a banner image.
 * x/y/width/height are 0–100 relative to the image box.
 */
const HotspotSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, default: "" },
    link: { type: String, default: "" },
    openInNewTab: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    /** Left edge % of image width */
    x: { type: Number, default: 0, min: 0, max: 100 },
    /** Top edge % of image height */
    y: { type: Number, default: 0, min: 0, max: 100 },
    /** Width % of image width */
    width: { type: Number, default: 10, min: 0.5, max: 100 },
    /** Height % of image height */
    height: { type: Number, default: 10, min: 0.5, max: 100 },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

/**
 * Single banner image with unlimited clickable hotspot overlays.
 * Reusable for budget maps, offer maps, brand maps, etc.
 */
const HomeImageHotspotBannerSchema = new mongoose.Schema(
  {
    pageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HomePage",
      required: true,
    },
    instanceId: { type: String, required: true, unique: true },
    name: { type: String, default: "" },
    bannerImage: { type: String, default: "" },
    hotspots: { type: [HotspotSchema], default: [] },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true, collection: "home_image_hotspot_banners" }
);

HomeImageHotspotBannerSchema.index({ pageId: 1 });

if (mongoose.models.HomeImageHotspotBanner) {
  delete mongoose.models.HomeImageHotspotBanner;
}

export default mongoose.model(
  "HomeImageHotspotBanner",
  HomeImageHotspotBannerSchema
);
