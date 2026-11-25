import mongoose from "mongoose";

const HighlightSpecSchema = new mongoose.Schema(
  {
    label: { type: String, default: "", trim: true },
    value: { type: String, default: "", trim: true },
  },
  { _id: false }
);

/**
 * Home Page Builder — Deal of the Day instance config.
 * One product + schedule + design copy per instance.
 */
const HomeDealOfTheDaySchema = new mongoose.Schema(
  {
    pageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HomePage",
      required: true,
      index: true,
    },
    instanceId: { type: String, required: true, unique: true },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },

    startAt: { type: Date, default: null },
    endAt: { type: Date, default: null },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    eyebrow: { type: String, default: "DEAL OF THE DAY", trim: true },
    badgeLabel: { type: String, default: "Spotlight 24H", trim: true },
    bannerSubtitle: {
      type: String,
      default:
        "Curated manufacturer price reduction direct from international brand warehouse.",
      trim: true,
    },
    tagline: { type: String, default: "", trim: true },
    scarcityLabel: { type: String, default: "High Demand", trim: true },
    scarcityQtyOverride: { type: Number, default: null },
    showScarcity: { type: Boolean, default: true },
    show360Button: { type: Boolean, default: false },
    studioViewLabel: { type: String, default: "360° Studio View", trim: true },
    highlightSpecs: { type: [HighlightSpecSchema], default: [] },
    deliveryHint: {
      type: String,
      default:
        "Check Instant Postal Delivery — Enter PIN code for delivery by 9 PM Today",
      trim: true,
    },
    emiHint: { type: String, default: "", trim: true },
    primaryCtaLabel: {
      type: String,
      default: "Buy Now with Express Delivery",
      trim: true,
    },
    secondaryCtaLabel: { type: String, default: "Add to Bag", trim: true },
    dealPrice: { type: Number, default: null },
    mrpPrice: { type: Number, default: null },
  },
  { timestamps: true, collection: "home_deal_of_the_day" }
);

HomeDealOfTheDaySchema.index({ pageId: 1 });
HomeDealOfTheDaySchema.index({ status: 1, startAt: 1, endAt: 1 });

if (mongoose.models.HomeDealOfTheDay) {
  delete mongoose.models.HomeDealOfTheDay;
}

export default mongoose.model("HomeDealOfTheDay", HomeDealOfTheDaySchema);
