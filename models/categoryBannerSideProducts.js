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
 * Single main banner + side banner + product row for category pages.
 * See All button uses mainBannerUrl on the storefront.
 */
const CategoryBannerSideProductsSchema = new mongoose.Schema(
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
    mainBannerDesktop: { type: String, default: "" },
    mainBannerMobile: { type: String, default: "" },
    mainBannerUrl: { type: String, default: "" },
    sideBannerImage: { type: String, default: "" },
    sideBannerUrl: { type: String, default: "" },
    sideBannerPosition: {
      type: String,
      enum: ["left", "right"],
      default: "left",
    },
    /** Product row title, e.g. Samsung Monitor */
    name: { type: String, default: "" },
    products: { type: [ProductRefSchema], default: [] },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

CategoryBannerSideProductsSchema.index({ pageId: 1 });
CategoryBannerSideProductsSchema.index({ categoryId: 1 });

export default mongoose.models.CategoryBannerSideProducts ||
  mongoose.model(
    "CategoryBannerSideProducts",
    CategoryBannerSideProductsSchema
  );
