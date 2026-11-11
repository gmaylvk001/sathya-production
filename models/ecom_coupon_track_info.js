

import mongoose from "mongoose";
import User from "@/models/User";
import ecom_offer_info from "@/models/ecom_offer_info";

const FilterSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
    coupon_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ecom_offer_info'
    },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.ecom_coupon_track_info || mongoose.model("ecom_coupon_track_info", FilterSchema);
