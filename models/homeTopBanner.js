import mongoose from "mongoose";

const HeroSlotSchema = new mongoose.Schema(
  {
    desktopImage: { type: String, default: "" },
    mobileImage: { type: String, default: "" },
    url: { type: String, default: "" },
  },
  { _id: false }
);

const BannerItemSchema = new mongoose.Schema(
  {
    mode: {
      type: String,
      enum: ["single", "big-left", "big-right"],
      default: "single",
    },
    desktopImage: { type: String, default: "" },
    mobileImage: { type: String, default: "" },
    url: { type: String, default: "" },
    heading: { type: String, default: "" },
    description: { type: String, default: "" },
    buttonText: { type: String, default: "" },
    buttonUrl: { type: String, default: "" },
    overlayAlign: {
      type: String,
      enum: ["bottom-left", "center-left", "bottom-center"],
      default: "bottom-left",
    },
    textColor: { type: String, default: "#ffffff" },
    showGradientOverlay: { type: Boolean, default: true },
    smallBanner1: {
      type: HeroSlotSchema,
      default: () => ({ desktopImage: "", mobileImage: "", url: "" }),
    },
    smallBanner2: {
      type: HeroSlotSchema,
      default: () => ({ desktopImage: "", mobileImage: "", url: "" }),
    },
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
