import mongoose from "mongoose";

const optionalString = { type: String, required: false, default: null, trim: true };
const optionalNumber = { type: Number, required: false, default: null };
const optionalMixed = { type: mongoose.Schema.Types.Mixed, required: false, default: null };
const optionalText = { type: String, required: false, default: null };
const optionalDate = { type: Date, required: false, default: null };

/**
 * Exist MySQL `leads` table → Mongo collection `leads`.
 * MySQL `id` is replaced by Mongo `_id`.
 */
const LeadsSchema = new mongoose.Schema(
  {
    name: optionalString,
    email: optionalString,
    mobile: optionalString,
    city: optionalString,
    store: optionalString,
    store_id: optionalMixed,
    message: optionalText,
    brand: optionalString,
    ton: optionalString,
    type: optionalString,
    age: optionalString,
    showroom: optionalText,
    sex: optionalString,
    /** Exist column spelling: referrel_url */
    referrel_url: optionalString,
    lead_title: optionalString,
    lead_source: optionalString,
    lead_campaign: optionalString,
    cookie_id: optionalText,
    product_looking_for: optionalString,
    product_category: optionalString,
    product_url: optionalString,
    looking_for_emi: optionalString,
    preferred_time: optionalString,
    coupon_code: optionalString,
    offer_eligibility: optionalNumber,
    offer_amount: optionalString,
    enquiry_date: optionalString,
    lead_type: optionalString,
    invoice_id: optionalString,
    adtarbo_crm_id: optionalString,
    lead_status: optionalString,
    manager_comments: optionalString,
    date_fr_cmnts: optionalString,
    ip_address: optionalString,
    lead_payment_id: optionalNumber,
    payment_id: optionalString,
    payment_status: optionalString,
    random_coupon_code: optionalNumber,
    /** Exist: int NOT NULL DEFAULT 0 */
    deleted: { type: Number, required: false, default: 0 },
    address: optionalText,
    event_category: optionalString,
    event_image_video: optionalText,
    created_at: optionalDate,
    updated_at: optionalDate,
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "leads",
    strict: true,
  }
);

LeadsSchema.index({ mobile: 1 }, { name: "mobile_relation" });
LeadsSchema.index({ email: 1 }, { name: "email_relation" });
LeadsSchema.index({ lead_source: 1, created_at: -1 }, { name: "lead_source_created" });
LeadsSchema.index({ deleted: 1, created_at: -1 }, { name: "deleted_created" });

if (mongoose.models.leads) {
  delete mongoose.models.leads;
}

export default mongoose.model("leads", LeadsSchema);
