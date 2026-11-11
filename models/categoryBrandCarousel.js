import mongoose from "mongoose";

const BrandItemSchema = new mongoose.Schema(
  {
    image: { type: String, default: "" },
    url: { type: String, default: "" },
    notes: { type: String, default: "" },
    state: {
      type: String,
      enum: ["tamilnadu", "andhra", "kerala", "karnataka", "telangana", "all"],
      default: "all",
    },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

/**
 * Brand logo carousel — same pattern as Image Carousel.
 * Auto-scrolls on storefront; each item = brand image + URL.
 */
const CategoryBrandCarouselSchema = new mongoose.Schema(
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
    name: { type: String, default: "" },
    /** When true, storefront ignores manual items and loads brands for this category. */
    autoBrandsFromCategory: { type: Boolean, default: false },
    items: { type: [BrandItemSchema], default: [] },
    showGap: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

CategoryBrandCarouselSchema.index({ pageId: 1 });
CategoryBrandCarouselSchema.index({ categoryId: 1 });

if (mongoose.models.CategoryBrandCarousel) {
  delete mongoose.models.CategoryBrandCarousel;
}

export default mongoose.model("CategoryBrandCarousel", CategoryBrandCarouselSchema);
