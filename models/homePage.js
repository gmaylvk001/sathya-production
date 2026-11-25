import mongoose from "mongoose";

const HeroSlotSchema = new mongoose.Schema(
  {
    desktopImage: { type: String, default: "" },
    mobileImage: { type: String, default: "" },
    url: { type: String, default: "" },
  },
  { _id: false }
);

const HeroLargeSlotSchema = new mongoose.Schema(
  {
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
  },
  { _id: false }
);

const HeroGridConfigSchema = new mongoose.Schema(
  {
    variant: {
      type: String,
      enum: ["big-left", "big-right"],
      default: "big-left",
    },
    largeBanner: { type: HeroLargeSlotSchema, default: () => ({}) },
    smallBanner1: { type: HeroSlotSchema, default: () => ({}) },
    smallBanner2: { type: HeroSlotSchema, default: () => ({}) },
    state: {
      type: String,
      enum: ["tamilnadu", "andhra", "kerala", "karnataka", "telangana", "all"],
      default: "all",
    },
    isActive: { type: Boolean, default: true },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
  },
  { _id: false }
);

const PageComponentSchema = new mongoose.Schema(
  {
    instanceId: { type: String, required: true },
    type: { type: String, required: true },
    configId: { type: mongoose.Schema.Types.ObjectId, default: null },
    title: { type: String, default: "" },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    heroGrid: { type: HeroGridConfigSchema, default: undefined },
  },
  { _id: false }
);

const HomePageSchema = new mongoose.Schema(
  {
    name: { type: String, default: "Home Page" },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    components: { type: [PageComponentSchema], default: [] },
  },
  { timestamps: true }
);

if (mongoose.models.HomePage) {
  delete mongoose.models.HomePage;
}

export default mongoose.model("HomePage", HomePageSchema);
