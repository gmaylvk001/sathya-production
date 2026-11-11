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
 * Circle Image Carousel for Home Page — displays radius 100 circular images
 * with image name underneath, custom slug/URL, and section title in red.
 */
const HomeCircleImageCarouselSchema = new mongoose.Schema(
  {
    pageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HomePage",
      required: true,
    },
    instanceId: { type: String, required: true, unique: true },
    /** Displayed at top center in red on storefront */
    name: { type: String, default: "" },
    items: { type: [CircleImageItemSchema], default: [] },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true, collection: "home_circle_image_carousels" }
);

HomeCircleImageCarouselSchema.index({ pageId: 1 });

if (mongoose.models.HomeCircleImageCarousel) {
  delete mongoose.models.HomeCircleImageCarousel;
}

export default mongoose.model(
  "HomeCircleImageCarousel",
  HomeCircleImageCarouselSchema
);
