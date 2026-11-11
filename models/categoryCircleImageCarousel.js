import mongoose from "mongoose";

const CircleImageItemSchema = new mongoose.Schema(
  {
    image: { type: String, default: "" },
    imageName: { type: String, default: "" },
    slug: { type: String, default: "" },
    url: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

/**
 * Circle Image Carousel — displays radius 100 circular images
 * with image name underneath, custom slug/URL, and section title in red.
 */
const CategoryCircleImageCarouselSchema = new mongoose.Schema(
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
    /** Displayed at top center in red on storefront */
    name: { type: String, default: "" },
    items: { type: [CircleImageItemSchema], default: [] },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

CategoryCircleImageCarouselSchema.index({ pageId: 1 });
CategoryCircleImageCarouselSchema.index({ categoryId: 1 });

if (mongoose.models.CategoryCircleImageCarousel) {
  delete mongoose.models.CategoryCircleImageCarousel;
}

export default mongoose.model(
  "CategoryCircleImageCarousel",
  CategoryCircleImageCarouselSchema
);
