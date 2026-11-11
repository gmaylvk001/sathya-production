import mongoose from "mongoose";

const BrandItemSchema = new mongoose.Schema(
  {
    image: { type: String, default: "" },
    url: { type: String, default: "" },
    notes: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

/**
 * Brand logo carousel — same pattern as Image Carousel.
 * Auto-scrolls on storefront; each item = brand image + URL.
 */
const HomeBrandCarouselSchema = new mongoose.Schema(
  {
    pageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HomePage",
      required: true,
    },
    instanceId: { type: String, required: true, unique: true },
    name: { type: String, default: "" },
    /** When true, storefront ignores manual items and loads brands automatically. */
    autoBrandsFromCategory: { type: Boolean, default: false },
    items: { type: [BrandItemSchema], default: [] },
    showGap: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true, collection: "home_brand_carousels" }
);

HomeBrandCarouselSchema.index({ pageId: 1 });

if (mongoose.models.HomeBrandCarousel) {
  delete mongoose.models.HomeBrandCarousel;
}

export default mongoose.model("HomeBrandCarousel", HomeBrandCarouselSchema);
