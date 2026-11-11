import mongoose from "mongoose";
import "./Bank.js"; // Ensure Bank model is registered for mongoose.populate

const PaymentOfferSchema = new mongoose.Schema(
  {
    bank: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bank",
      required: [true, "Bank reference is required"],
      index: true,
    },
    // Optional legacy reference for backward compatibility
    bankId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bank",
      index: true,
    },
    title: {
      type: String,
      trim: true,
      default: "",
    },
    name: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    offerType: {
      type: String,
      enum: ["BANK_OFFER", "EMI_OFFER"],
      required: [true, "offerType is required (BANK_OFFER or EMI_OFFER)"],
      index: true,
    },
    emiDetails: {
      tenureMonths: {
        type: Number,
        default: 0,
      },
      annualInterestRate: {
        type: Number,
        default: 0,
      },
      isNoCost: {
        type: Boolean,
        default: false,
      },
    },
    discountType: {
      type: String,
      enum: ["PERCENTAGE", "FLAT"],
      default: "PERCENTAGE",
    },
    discountValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxDiscountLimit: {
      type: Number,
      default: 0,
      min: 0,
    },
    minOrderValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    applicableCategories: {
      type: [mongoose.Schema.Types.Mixed],
      default: ["ALL"],
    },
    cardType: {
      type: String,
      enum: ["CREDIT", "DEBIT", "NETBANKING", "ALL"],
      default: "ALL",
    },
    validFrom: {
      type: Date,
      default: null,
    },
    validTill: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    priority: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: "paymentoffers",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

PaymentOfferSchema.index({ isActive: 1, offerType: 1 });
PaymentOfferSchema.index({ minOrderValue: 1, isActive: 1 });

// Normalize helper pre-save
PaymentOfferSchema.pre("save", function (next) {
  if (!this.bank && this.bankId) {
    this.bank = this.bankId;
  }
  if (!this.bankId && this.bank) {
    this.bankId = this.bank;
  }
  if (!this.title && this.name) {
    this.title = this.name;
  }
  if (!this.name && this.title) {
    this.name = this.title;
  }
  next();
});

export default mongoose.models.PaymentOffer ||
  mongoose.model("PaymentOffer", PaymentOfferSchema);
