import mongoose from "mongoose";

const DesignBannerSchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true,
  },
  bannerType: {
    type: String,
    required: [true, "Banner type is required"],
    enum: {
      values: ["topbanner", "flashsale", "categorybanner"],
      message: "Invalid banner type"
    }
  },
  // Fields for topbanner and flashsale
  bgImageUrl: {
    type: String,
    required: function() { return this.bannerType !== 'categorybanner'; }
  },
  bannerImageUrl: {
    type: String,
  },
  redirectUrl: {
    type: String,
    required: function() { return this.bannerType !== 'categorybanner'; },
    match: [
      /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/,
      "Please use a valid URL with HTTP or HTTPS"
    ]
  },
  
  // Fields for categorybanner
  categoryImages: {
    type: [{
      imageUrl: String,
      redirectUrl: {
        type: String,
        match: [
          /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/,
          "Please use a valid URL with HTTP or HTTPS"
        ]
      }
    }],
    required: function() { return this.bannerType === 'categorybanner'; },
    validate: {
      validator: function(v) {
        return this.bannerType !== 'categorybanner' || (v && v.length === 4);
      },
      message: "Category banner must have exactly 4 images with redirect URLs"
    }
  },

  // Common fields
  startDate: {
    type: Date,
    required: [true, "Start date is required"]
  },
  endDate: {
    type: Date,
    required: [true, "End date is required"],
    validate: {
      validator: function(value) {
        return value > this.startDate;
      },
      message: "End date must be after start date"
    }
  },
  status: {
    type: String,
    required: true,
    enum: ["active", "inactive"],
    default: "active"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Virtuals for image dimensions based on banner type
DesignBannerSchema.virtual('bgImageDimensions').get(function() {
  if (this.bannerType === 'topbanner') return { width: 1680, height: 499 };
  if (this.bannerType === 'flashsale') return { width: 828, height: 250 };
  return null;
});

DesignBannerSchema.virtual('bannerImageDimensions').get(function() {
  if (this.bannerType === 'topbanner') return { width: 291, height: 147 };
  if (this.bannerType === 'flashsale') return { width: 285, height: 173 };
  return null;
});

DesignBannerSchema.virtual('categoryImageDimensions').get(function() {
  return { width: 400, height: 400 }; // Adjust dimensions as needed
});

// Create index for better query performance
DesignBannerSchema.index({ bannerType: 1, status: 1 });

// Middleware to validate dates before saving
DesignBannerSchema.pre('save', function(next) {
  if (this.endDate <= this.startDate) {
    const err = new Error("End date must be after start date");
    next(err);
  } else {
    next();
  }
});

let DesignBanner;
try {
  DesignBanner = mongoose.model("ecom_designbanner_info");
} catch {
  DesignBanner = mongoose.model("ecom_designbanner_info", DesignBannerSchema);
}

export default DesignBanner;