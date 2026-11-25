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
 * Super Categories Matrix for Category Page — displays Department Matrix cards
 * with badge pill, title, subtitle, kicker, and View All link.
 */
const CategorySuperCategoriesSchema = new mongoose.Schema(
  {
    pageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CategoryPage",
      required: true,
    },
    instanceId: { type: String, required: true, unique: true },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ecom_category_infos",
      required: true,
    },
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
  { timestamps: true, collection: "category_super_categories" }
);

CategorySuperCategoriesSchema.index({ pageId: 1 });
CategorySuperCategoriesSchema.index({ categoryId: 1 });

if (mongoose.models.CategorySuperCategories) {
  delete mongoose.models.CategorySuperCategories;
}

export default mongoose.model("CategorySuperCategories", CategorySuperCategoriesSchema);
