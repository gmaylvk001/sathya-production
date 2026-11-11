import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    offerType: {
      type: String,
      required: true,
      enum: ["BANK_OFFER", "EMI_OFFER"],
    },
    bank: {
      code: { type: String, required: true },
      name: { type: String, required: true },
      logoUrl: { type: String },
    },
    cardType: {
      type: String,
      enum: ["CREDIT", "DEBIT", "ALL", "CARDLESS"],
      default: "ALL",
    },
    discountType: {
      type: String,
      enum: ["PERCENTAGE", "FLAT"],
    },
    discountValue: {
      type: Number,
      default: 0,
    },
    maxDiscountLimit: {
      type: Number,
      default: 0,
    },
    minOrderValue: {
      type: Number,
      required: true,
      default: 0,
    },
    emiDetails: {
      tenureMonths: { type: Number },
      annualInterestRate: { type: Number },
      isNoCost: { type: Boolean, default: false },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    validFrom: {
      type: Date,
    },
    validTill: {
      type: Date,
    },
    applicableCategories: {
      type: [String],
      default: ["ALL"],
    },
    priority: {
      type: Number,
      default: 0,
    },
    badge: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster lookups based on active status, date validity and offer type
offerSchema.index({ isActive: 1, validTill: 1, validFrom: 1 });
offerSchema.index({ offerType: 1 });

const Offer = mongoose.models.Offer || mongoose.model("Offer", offerSchema);

export default Offer;
