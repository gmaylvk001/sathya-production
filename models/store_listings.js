import mongoose from "mongoose";

const optionalString = { type: String, required: false, default: null, trim: true };
const optionalNumber = { type: Number, required: false, default: null };
const optionalMixed = { type: mongoose.Schema.Types.Mixed, required: false, default: null };

const StoreListingsSchema = new mongoose.Schema({
  exist_id: optionalString,
  branch_code: { type: String, required: false, default: null, trim: true, maxlength: 5 },
  categories: { type: String, required: false, default: null, trim: true, maxlength: 255 },
  user_id: optionalNumber,
  title: { type: String, required: false, default: null, trim: true, maxlength: 255 },
  slug: { type: String, required: false, default: null, trim: true, maxlength: 255 },
  description: { type: String, required: false, default: null },
  approved: { type: Number, required: true, default: 0 },
  verified: { type: Number, required: true, default: 0 },
  spam: { type: Number, required: true, default: 0 },
  logo: { type: String, required: false, default: null, trim: true, maxlength: 255 },
  image1: { type: String, required: false, default: null },
  image2: { type: String, required: false, default: null },
  image3: { type: String, required: false, default: null },
  phone: { type: String, required: false, default: null, trim: true, maxlength: 255 },
  phone_afterhours: { type: String, required: false, default: null, trim: true, maxlength: 255 },
  website: { type: String, required: false, default: null, trim: true, maxlength: 255 },
  email: { type: String, required: false, default: null, trim: true, maxlength: 255 },
  facebook: { type: String, required: false, default: null, trim: true, maxlength: 255 },
  twitter: { type: String, required: false, default: null, trim: true, maxlength: 255 },
  service_area: { type: String, required: false, default: null },
  images: { type: String, required: false, default: null, trim: true, maxlength: 255 },
  tags: { type: String, required: false, default: null },
  address: { type: String, required: false, default: null, trim: true, maxlength: 255 },
  latitude: { type: String, required: false, default: null, trim: true, maxlength: 255 },
  longitude: { type: String, required: false, default: null, trim: true, maxlength: 255 },
  created_at: { type: Date, required: false, default: null },
  updated_at: { type: Date, required: false, default: null },
  meta_title: { type: String, required: false, default: null },
  meta_description: { type: String, required: false, default: null },
  zipcode: optionalNumber,
  zone_code: optionalNumber,
  is_WH: { type: Number, required: false, default: 0 },
  map_data: { type: String, required: false, default: null },
  location_insights_id: { type: String, required: false, default: null },
  instagram_stories: optionalMixed,
  store_owner: {
    type: String,
    required: true,
    enum: ["unilet", "sathya"],
    default: "sathya",
    trim: true,
  },
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  collection: "store_listings",
  strict: true,
});

StoreListingsSchema.index(
  { exist_id: 1 },
  {
    unique: true,
    partialFilterExpression: { exist_id: { $type: "string" } },
    name: "exist_id_unique_nonempty",
  }
);
StoreListingsSchema.index({ slug: 1 }, { name: "slug_idx" });
StoreListingsSchema.index({ branch_code: 1 }, { name: "branch_code_idx" });
StoreListingsSchema.index({ zone_code: 1 }, { name: "zone_code_idx" });

if (mongoose.models.store_listings) {
  delete mongoose.models.store_listings;
}

export const STORE_LISTING_FIELDS = [
  "exist_id",
  "branch_code",
  "categories",
  "user_id",
  "title",
  "slug",
  "description",
  "approved",
  "verified",
  "spam",
  "logo",
  "image1",
  "image2",
  "image3",
  "phone",
  "phone_afterhours",
  "website",
  "email",
  "facebook",
  "twitter",
  "service_area",
  "images",
  "tags",
  "address",
  "latitude",
  "longitude",
  "created_at",
  "updated_at",
  "meta_title",
  "meta_description",
  "zipcode",
  "zone_code",
  "is_WH",
  "map_data",
  "location_insights_id",
  "instagram_stories",
  "store_owner",
];

export const STORE_LISTING_NUMBER_FIELDS = new Set([
  "user_id",
  "approved",
  "verified",
  "spam",
  "zipcode",
  "zone_code",
  "is_WH",
]);

export default mongoose.model("store_listings", StoreListingsSchema);
