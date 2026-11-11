import mongoose from "mongoose";

const ProductRefSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

/**
 * Named product carousel for category page builder.
 * Products must belong to the page's category (search filtered by categoryId).
 */
const CategoryProductCarouselSchema = new mongoose.Schema(
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
    /** Section title on storefront */
    name: { type: String, default: "" },
    /** See All button link (path or slug) */
    seeAllLink: { type: String, default: "" },
    products: { type: [ProductRefSchema], default: [] },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

CategoryProductCarouselSchema.index({ pageId: 1 });
CategoryProductCarouselSchema.index({ categoryId: 1 });

export default mongoose.models.CategoryProductCarousel ||
  mongoose.model("CategoryProductCarousel", CategoryProductCarouselSchema);
