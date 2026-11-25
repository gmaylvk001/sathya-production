import mongoose from "mongoose";

const WhyBuyCardItemSchema = new mongoose.Schema(
  {
    icon: { type: String, default: "mdi:storefront-outline" },
    iconType: { type: String, enum: ["iconify", "image"], default: "iconify" },
    iconColor: {
      type: String,
      enum: ["light_red", "yellow", "dark_red", "dark", "green", "blue"],
      default: "light_red",
    },
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    tagText: { type: String, default: "" },
    tagColor: { type: String, enum: ["red", "dark", "green"], default: "red" },
    link: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

/**
 * Why Buy From Sathya / Omnichannel Advantage Section for Home Page.
 * Displays 6 to 8 feature cards with circular icons, descriptions, and highlight tags.
 */
const HomeWhyBuyReasonsSchema = new mongoose.Schema(
  {
    pageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HomePage",
      required: true,
    },
    instanceId: { type: String, required: true, unique: true },
    name: { type: String, default: "Why Buy From Sathya?" },
    kicker: { type: String, default: "THE OMNICHANNEL ADVANTAGE" },
    subtitle: {
      type: String,
      default:
        "Combining the vast choice of e-commerce with the speed and trust of 140+ physical superstores.",
    },
    items: { type: [WhyBuyCardItemSchema], default: [] },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true, collection: "home_why_buy_reasons" }
);

HomeWhyBuyReasonsSchema.index({ pageId: 1 });

if (mongoose.models.HomeWhyBuyReasons) {
  delete mongoose.models.HomeWhyBuyReasons;
}

export default mongoose.model("HomeWhyBuyReasons", HomeWhyBuyReasonsSchema);
