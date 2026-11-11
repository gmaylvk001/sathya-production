import mongoose from "mongoose";

const imageSlotSchema = new mongoose.Schema(
  {
    image: { type: String, default: "" },
    url: { type: String, default: "" },
    slot: {
      type: String,
      enum: ["tl", "bl", "center", "tr", "br", "left", "c1", "c2", "right"],
      required: true,
    },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const homeImageColumnsSchema = new mongoose.Schema(
  {
    pageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HomePage",
      required: true,
      index: true,
    },
    instanceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      default: "",
      trim: true,
    },
    layout: {
      type: String,
      enum: ["center_big", "left_big", "right_big"],
      default: "center_big",
    },
    showGap: {
      type: Boolean,
      default: true,
    },
    images: {
      type: [imageSlotSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true, collection: "home_image_columns" }
);

homeImageColumnsSchema.index({ pageId: 1, status: 1 });

if (mongoose.models.HomeImageColumns) {
  delete mongoose.models.HomeImageColumns;
}

export default mongoose.model("HomeImageColumns", homeImageColumnsSchema);
