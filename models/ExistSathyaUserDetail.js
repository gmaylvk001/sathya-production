import mongoose from "mongoose";

const optionalString = { type: String, required: false, default: null, trim: true };
const optionalNumber = { type: Number, required: false, default: null };

const ExistSathyaUserDetailSchema = new mongoose.Schema({
  exist_id: optionalString,
  user_id: optionalString,
  address: optionalString,
  address1: optionalString,
  address2: optionalString,
  pincode: optionalNumber,
  username: optionalString,
  locality: optionalString,
  city: optionalString,
  state: optionalString,
  landmark: optionalString,
  phonenumber: optionalString,
  altnumber: optionalString,
  type: optionalString,
  gst_name: optionalString,
  gst_number: optionalString,
  gst_bnm: optionalString,
  gst_st: optionalString,
  gst_loc: optionalString,
  gst_bno: optionalString,
  gst_stcd: optionalString,
  gst_dst: optionalString,
  gst_city: optionalString,
  gst_flno: optionalString,
  gst_lt: optionalString,
  gst_pncd: optionalString,
  gst_lg: optionalString,
  live_user_id: optionalString,
  is_default_shipping: { type: Boolean, default: false },
  is_default_billing: { type: Boolean, default: false },
  created_at: { type: Date, required: false, default: null },
  updated_at: { type: Date, required: false, default: null },
}, {
  timestamps: false,
  strict: true,
});

ExistSathyaUserDetailSchema.index(
  { exist_id: 1 },
  {
    unique: true,
    partialFilterExpression: { exist_id: { $type: "string" } },
    name: "exist_id_unique_nonempty",
  }
);

ExistSathyaUserDetailSchema.index({ live_user_id: 1 }, { name: "live_user_id_idx" });

if (mongoose.models.ecom_exist_sathya_user_details) {
  delete mongoose.models.ecom_exist_sathya_user_details;
}

const ExistSathyaUserDetail = mongoose.model(
  "ecom_exist_sathya_user_details",
  ExistSathyaUserDetailSchema
);

export const EXIST_SATHYA_USER_DETAIL_FIELDS = [
  "exist_id",
  "user_id",
  "address",
  "address1",
  "address2",
  "pincode",
  "username",
  "locality",
  "city",
  "state",
  "landmark",
  "phonenumber",
  "altnumber",
  "type",
  "gst_name",
  "gst_number",
  "gst_bnm",
  "gst_st",
  "gst_loc",
  "gst_bno",
  "gst_stcd",
  "gst_dst",
  "gst_city",
  "gst_flno",
  "gst_lt",
  "gst_pncd",
  "gst_lg",
  "is_default_shipping",
  "is_default_billing",
  "created_at",
  "updated_at",
];

export const EXIST_SATHYA_USER_DETAIL_NUMBER_FIELDS = new Set(["pincode"]);

export default ExistSathyaUserDetail;
