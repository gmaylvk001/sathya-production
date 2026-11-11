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

const categoryImageColumnsSchema = new mongoose.Schema(
  {
    pageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CategoryPage",
      required: true,
      index: true,
    },
    instanceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
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
  { timestamps: true }
);

categoryImageColumnsSchema.index({ pageId: 1, status: 1 });

export default mongoose.models.CategoryImageColumns ||
  mongoose.model("CategoryImageColumns", categoryImageColumnsSchema);
