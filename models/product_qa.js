import mongoose from "mongoose";

const ProductQASchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "product",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    userName: {
      type: String,
      trim: true,
      default: "Customer",
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      trim: true,
      default: "",
    },
    answeredBy: {
      type: String,
      trim: true,
      default: "Sathya Store",
    },
    answeredAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "pending", "hidden"],
      default: "active",
    },
  },
  { timestamps: true }
);

export default mongoose.models.ProductQA ||
  mongoose.model("ProductQA", ProductQASchema);
