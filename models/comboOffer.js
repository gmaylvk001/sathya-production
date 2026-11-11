import mongoose from "mongoose";

/**
 * Combo Offer metadata. Sellable entity is linked Product (productId).
 * Selected SKUs live in productIds / related_products on the Product.
 */
const ComboOfferSchema = new mongoose.Schema(
  {
    purpose: { type: String, default: "" },
    brandName: { type: String, default: "" },
    companyLogo: { type: String, default: "" },

    productIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
    ],

    /** AI / editable marketing fields */
    name: { type: String, default: "" },
    shortDescription: { type: String, default: "" },
    longDescription: { type: String, default: "" },
    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
    metaKeywords: { type: String, default: "" },
    highlights: { type: [String], default: [] },
    keyBenefits: { type: [String], default: [] },
    whyBuy: { type: String, default: "" },
    tagline: { type: String, default: "" },
    offerTitle: { type: String, default: "" },
    ctaContent: { type: String, default: "" },
    socialCaption: { type: String, default: "" },

    marketingImage: { type: String, default: "" },

    originalPrice: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    offerPrice: { type: Number, default: 0 },
    savingsAmount: { type: Number, default: 0 },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    comboStock: { type: Number, default: 0, min: 0 },

    /** Created catalog product */
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ecom_category_infos",
      default: null,
    },

    /**
     * draft | active | inactive | expired | out_of_stock
     * Runtime engines may update this.
     */
    status: {
      type: String,
      enum: ["draft", "active", "inactive", "expired", "out_of_stock"],
      default: "draft",
    },
  },
  { timestamps: true }
);

ComboOfferSchema.index({ status: 1, startDate: 1, endDate: 1 });
ComboOfferSchema.index({ productId: 1 });

if (mongoose.models.ComboOffer) {
  delete mongoose.models.ComboOffer;
}

export default mongoose.model("ComboOffer", ComboOfferSchema);
