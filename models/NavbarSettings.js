import mongoose from "mongoose";

const NavbarSettingsSchema = new mongoose.Schema(
  {
    bgType: {
      type: String,
      enum: ["solid", "gradient"],
      default: "solid",
    },
    bgColor: {
      type: String,
      default: "#ED1C24",
    },
    gradientStart: {
      type: String,
      default: "#ED1C24",
    },
    gradientEnd: {
      type: String,
      default: "#8B0000",
    },
    gradientDirection: {
      type: String,
      default: "to right",
    },
    textColor: {
      type: String,
      default: "#FFFFFF",
    },
    topBorderColor: {
      type: String,
      default: "#FFF200",
    },
    showTopBorder: {
      type: Boolean,
      default: true,
    },
    // Top Bar General
    topBarBg: {
      type: String,
      default: "#FFFFFF",
    },
    // Search Bar
    searchBtnBgType: {
      type: String,
      enum: ["solid", "gradient"],
      default: "solid",
    },
    searchBtnBg: {
      type: String,
      default: "#ED1C24",
    },
    searchBtnGradientStart: {
      type: String,
      default: "#ED1C24",
    },
    searchBtnGradientEnd: {
      type: String,
      default: "#8B0000",
    },
    searchBtnGradientDirection: {
      type: String,
      default: "to right",
    },
    searchBtnIconColor: {
      type: String,
      default: "#FFFFFF",
    },
    searchBorderColor: {
      type: String,
      default: "#e5e7eb",
    },
    searchFocusBorderColor: {
      type: String,
      default: "#ED1C24",
    },
    // Top Bar Action Icons (Location, Contact, Store, Wishlist, Cart, Profile)
    actionIconColor: {
      type: String,
      default: "#ED1C24",
    },
    actionIconBorderColor: {
      type: String,
      default: "#ED1C24",
    },
    actionIconBg: {
      type: String,
      default: "#FFFFFF",
    },
    actionLabelColor: {
      type: String,
      default: "#ED1C24",
    },
    // Badges (Cart & Wishlist Count)
    badgeBgColor: {
      type: String,
      default: "#ED1C24",
    },
    badgeTextColor: {
      type: String,
      default: "#FFF200",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "navbar_settings",
  }
);

export default mongoose.models.NavbarSettings ||
  mongoose.model("NavbarSettings", NavbarSettingsSchema);

