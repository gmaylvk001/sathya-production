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
 * Named product carousel for home page builder.
 */
const HomeProductCarouselSchema = new mongoose.Schema(
  {
    pageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HomePage",
      required: true,
    },
    instanceId: { type: String, required: true, unique: true },
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
  { timestamps: true, collection: "home_product_carousels" }
);

HomeProductCarouselSchema.index({ pageId: 1 });

if (mongoose.models.HomeProductCarousel) {
  delete mongoose.models.HomeProductCarousel;
}

export default mongoose.model("HomeProductCarousel", HomeProductCarouselSchema);
