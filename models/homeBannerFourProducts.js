import mongoose from "mongoose";

const TileSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    image: { type: String, default: "" },
    url: { type: String, default: "" },
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

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
 * Top banner + 3 or 4 image tiles (shared BG color) + related products row.
 * See All on products uses bannerUrl.
 */
const HomeBannerFourProductsSchema = new mongoose.Schema(
  {
    pageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HomePage",
      required: true,
    },
    instanceId: { type: String, required: true, unique: true },
    bannerDesktop: { type: String, default: "" },
    bannerMobile: { type: String, default: "" },
    bannerUrl: { type: String, default: "" },
    /** Background behind the tile images */
    tilesBgColor: { type: String, default: "#0d9488" },
    tiles: { type: [TileSchema], default: [] },
    /** Related products section title */
    name: { type: String, default: "" },
    products: { type: [ProductRefSchema], default: [] },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true, collection: "home_banner_four_products" }
);

HomeBannerFourProductsSchema.index({ pageId: 1 });

if (mongoose.models.HomeBannerFourProducts) {
  delete mongoose.models.HomeBannerFourProducts;
}

export default mongoose.model(
  "HomeBannerFourProducts",
  HomeBannerFourProductsSchema
);
