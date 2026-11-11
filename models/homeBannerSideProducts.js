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
 * Single main banner + side banner + product row for home pages.
 * See All button uses mainBannerUrl on the storefront.
 */
const HomeBannerSideProductsSchema = new mongoose.Schema(
  {
    pageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HomePage",
      required: true,
    },
    instanceId: { type: String, required: true, unique: true },
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
  { timestamps: true, collection: "home_banner_side_products" }
);

HomeBannerSideProductsSchema.index({ pageId: 1 });

if (mongoose.models.HomeBannerSideProducts) {
  delete mongoose.models.HomeBannerSideProducts;
}

export default mongoose.model(
  "HomeBannerSideProducts",
  HomeBannerSideProductsSchema
);
