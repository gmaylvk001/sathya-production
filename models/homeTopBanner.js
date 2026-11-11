import mongoose from "mongoose";

const BannerItemSchema = new mongoose.Schema(
  {
    desktopImage: { type: String, default: "" },
    mobileImage: { type: String, default: "" },
    url: { type: String, default: "" },
    state: {
      type: String,
      enum: ["tamilnadu", "andhra", "kerala", "karnataka", "telangana", "all"],
      default: "all",
    },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
  },
  { _id: true }
);

/**
 * Top Banner set for the Home page.
 * Multiple banner images per home page document. Keyed by pageId.
 */
const HomeTopBannerSchema = new mongoose.Schema(
  {
    pageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HomePage",
      required: true,
    },
    name: { type: String, default: "Home Page" },
    pageType: {
      type: String,
      default: "home",
    },
    banners: { type: [BannerItemSchema], default: [] },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true, collection: "home_top_banners" }
);

HomeTopBannerSchema.index({ pageId: 1 }, { unique: true });

if (mongoose.models.HomeTopBanner) {
  delete mongoose.models.HomeTopBanner;
}

export default mongoose.model("HomeTopBanner", HomeTopBannerSchema);
