import mongoose from "mongoose";
import slugify from "slugify";

const StoreSchema = new mongoose.Schema(
  {
    organisation_name: {
      type: String,
      required: true,
      unique: true,
      maxlength: 100,
    },

    slug: {
      type: String,
      unique: true,
      index: true,
    },

    location_id: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },

    multibrandstore: {
      type: Boolean,
      default: false,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    description: { type: String, maxlength: 1000 },

    logo: { type: String },

    store_images: [{ type: String }],
    images: [{ type: String }],
    banners: [{ type: String }],

featuredProducts: [
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    default: [],
  }
],

    offers: [
      {
        title: String,
        validTill: String,
        image: String,
        description: String,
      },
    ],

    highlights: [
      {
        image: String,
        label: String,
      },
    ],

    keyHighlights: [
      {
        image: String,
        label: String,
      },
    ],

    nearbyStores: [
      {
        name: String,
        address: String,
        rating: String,
      },
    ],

    businessHours: [
      {
        day: String,
        timing: String,
      },
    ],

    /* NEW: SOCIAL TIMELINE WITH THUMBNAIL */
    socialTimeline: [
      {
        media: String,
        text: String,
        postedOn: String,
        thumbnail: String, // <--- NEW
      },
    ],
    customer_images: [{ type: String }],
    location: { type: String, maxlength: 100 },
    location_map: { lat: Number, lng: Number, address: String },
    zipcode: { type: String },
    address: { type: String },
    service_area: { type: String },
    city: { type: String },

    tags: [{ type: String }],

    phone: { type: String },
    phone_after_hours: { type: String },

    website: { type: String },
    email: { type: String },
    twitter: { type: String },
    facebook: { type: String },

    meta_title: { type: String },
    meta_description: { type: String },

    verified: { type: String, enum: ["Yes", "No"], default: "No" },
    approved: { type: String, enum: ["Yes", "No"], default: "No" },

    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: true }
);

/* AUTO-GENERATE SLUG FROM NAME */
StoreSchema.pre("save", function (next) {
  if (this.isModified("organisation_name")) {
    this.slug = slugify(this.organisation_name, {
      lower: true,
      strict: true,
      replacement: "-",
    });
  }
  next();
});

export default mongoose.models.Store ||
  mongoose.model("Store", StoreSchema);
