import mongoose from "mongoose";

const SuperCategoryItemSchema = new mongoose.Schema(
  {
    image: { type: String, default: "" },
    badgeText: { type: String, default: "" },
    badgeColor: { type: String, default: "red" },
    title: { type: String, default: "" },
    subtitle: { type: String, default: "" },
    slug: { type: String, default: "" },
    url: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

/**
 * Super Categories Matrix for Home Page — displays Department Matrix cards
 * with badge pill, title, subtitle, kicker, and View All link.
 */
const HomeSuperCategoriesSchema = new mongoose.Schema(
  {
    pageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HomePage",
      required: true,
    },
    instanceId: { type: String, required: true, unique: true },
    name: { type: String, default: "Explore Super-Categories" },
    kicker: { type: String, default: "DEPARTMENT MATRIX" },
    viewAllText: { type: String, default: "View All 84 Sub-Categories" },
    viewAllUrl: { type: String, default: "/categories" },
    items: { type: [SuperCategoryItemSchema], default: [] },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true, collection: "home_super_categories" }
);

HomeSuperCategoriesSchema.index({ pageId: 1 });

if (mongoose.models.HomeSuperCategories) {
  delete mongoose.models.HomeSuperCategories;
}

export default mongoose.model("HomeSuperCategories", HomeSuperCategoriesSchema);
