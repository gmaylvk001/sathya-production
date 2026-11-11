import mongoose from "mongoose";
import slugify from "slugify";

const MapboxSchema = new mongoose.Schema(
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

    

    store_images: [{ type: String }],
    images: [{ type: String }],
    
    businessHours: [
      {
        day: String,
        timing: String,
      },
    ],

    

    location: { type: String, maxlength: 100 },
    location_map: { lat: Number, lng: Number, address: String },
    zipcode: { type: String },
    address: { type: String },
    
    city: { type: String },

    
    phone: { type: String },
   

    website: { type: String },

    // user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: true }
);

/* AUTO-GENERATE SLUG FROM NAME */
MapboxSchema.pre("save", function (next) {
  if (this.isModified("organisation_name")) {
    this.slug = slugify(this.organisation_name, {
      lower: true,
      strict: true,
      replacement: "-",
    });
  }
  next();
});

export default mongoose.models.mapbox_stores ||
  mongoose.model("mapbox_stores", MapboxSchema);
