import mongoose from "mongoose";

const WishlistMailLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ecom_users_info",
      required: true,
    },
    userName: { type: String, default: "" },
    userEmail: { type: String, required: true },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: { type: String, default: "" },
    productSlug: { type: String, default: "" },
    mailNumber: { type: Number, required: true },
    wishlistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wishlist",
      default: null,
    },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

WishlistMailLogSchema.index({ sentAt: -1 });
WishlistMailLogSchema.index({ productId: 1, sentAt: -1 });
WishlistMailLogSchema.index({ userId: 1, sentAt: -1 });

// Keep existing Mongo collection if data was created under the old model name
export default mongoose.models.WishlistMailLog ||
  mongoose.model("WishlistMailLog", WishlistMailLogSchema, "pricedropmaillogs");
