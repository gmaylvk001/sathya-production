import mongoose from "mongoose";

const OfferTimerSchema = new mongoose.Schema(
  {
    // Modern fields
    timerId: { type: Number },
    offerTitle: { type: String, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
    state: { type: String, default: "all", trim: true },
    offerViewStates: { type: [String], default: ["all"] },
    timerDisplayStatus: { type: String, enum: ["Yes", "No"], default: "Yes" },
    offerHeading: { type: String, default: "", trim: true },
    offerDescription: { type: String, default: "", trim: true },
    topBanner: { type: String, default: null },
    dealsPopupImage: { type: String, default: null },

    // Legacy fields
    custom_id: { type: Number },
    offer_title: { type: String, trim: true },
    offer_start: { type: Date },
    offer_end: { type: Date },
    top_banner_url: { type: String, default: null },
    popup_image_url: { type: String, default: null },
    popup_image_alt: { type: String, default: "" },
    status: { type: String, default: "active" },
    states: { type: [String], default: ["all"] },
    card_offers: { type: Array, default: [] },
    hasDeleteAction: { type: Boolean, default: true },
  },
  { timestamps: true, strict: false }
);

// Admin list sort, next-id lookup, and timerId / custom_id lookups
OfferTimerSchema.index({ timerId: -1 });
OfferTimerSchema.index({ custom_id: 1 });
// Customer global timer: live / upcoming timer by date window, latest edited first
OfferTimerSchema.index({ timerDisplayStatus: 1, startDate: 1, endDate: 1 });
OfferTimerSchema.index({ updatedAt: -1 });

export default mongoose.models.OfferTimer || mongoose.model("OfferTimer", OfferTimerSchema);
