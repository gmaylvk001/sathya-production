import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import NavbarSettings from "@/models/NavbarSettings";

const DEFAULT_SETTINGS = {
  // Category Navbar
  bgType: "solid",
  bgColor: "#ED1C24",
  gradientStart: "#ED1C24",
  gradientEnd: "#8B0000",
  gradientDirection: "to right",
  textColor: "#FFFFFF",
  topBorderColor: "#FFF200",
  showTopBorder: true,
  // Top Bar General
  topBarBg: "#FFFFFF",
  // Search Bar
  searchBtnBgType: "solid",
  searchBtnBg: "#ED1C24",
  searchBtnGradientStart: "#ED1C24",
  searchBtnGradientEnd: "#8B0000",
  searchBtnGradientDirection: "to right",
  searchBtnIconColor: "#FFFFFF",
  searchBorderColor: "#e5e7eb",
  searchFocusBorderColor: "#ED1C24",
  // Header Action Icons
  actionIconColor: "#ED1C24",
  actionIconBorderColor: "#ED1C24",
  actionIconBg: "#FFFFFF",
  actionLabelColor: "#ED1C24",
  // Badges
  badgeBgColor: "#ED1C24",
  badgeTextColor: "#FFF200",
  // Header Style Selection
  headerStyle: "classic",
  flashSaleBadge: "FLASH SALE",
  flashSaleText: "Smart TVs & Inverter ACs up to 55% Off + Extra Instant Bank Cashback",
  storeCountText: "180+ Stores in South India",
  helplineText: "+91 88805 98985",
  zeroDownpaymentText: "ZERO DOWNPAYMENT AVAILABLE",
  isActive: true,
};

export async function GET() {
  try {
    await dbConnect();
    const settings = await NavbarSettings.findOne({ isActive: true })
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json(
      {
        success: true,
        data: settings ? { ...DEFAULT_SETTINGS, ...settings } : DEFAULT_SETTINGS,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching navbar settings:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch navbar settings",
        data: DEFAULT_SETTINGS,
      },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();

    const updateData = {
      // Category Navbar
      bgType: body.bgType === "gradient" ? "gradient" : "solid",
      bgColor: body.bgColor || "#ED1C24",
      gradientStart: body.gradientStart || "#ED1C24",
      gradientEnd: body.gradientEnd || "#8B0000",
      gradientDirection: body.gradientDirection || "to right",
      textColor: body.textColor || "#FFFFFF",
      topBorderColor: body.topBorderColor || "#FFF200",
      showTopBorder: body.showTopBorder !== false,
      // Top Bar General
      topBarBg: body.topBarBg || "#FFFFFF",
      // Search Bar
      searchBtnBgType: body.searchBtnBgType === "gradient" ? "gradient" : "solid",
      searchBtnBg: body.searchBtnBg || "#ED1C24",
      searchBtnGradientStart: body.searchBtnGradientStart || "#ED1C24",
      searchBtnGradientEnd: body.searchBtnGradientEnd || "#8B0000",
      searchBtnGradientDirection: body.searchBtnGradientDirection || "to right",
      searchBtnIconColor: body.searchBtnIconColor || "#FFFFFF",
      searchBorderColor: body.searchBorderColor || "#e5e7eb",
      searchFocusBorderColor: body.searchFocusBorderColor || "#ED1C24",
      // Header Action Icons
      actionIconColor: body.actionIconColor || "#ED1C24",
      actionIconBorderColor: body.actionIconBorderColor || "#ED1C24",
      actionIconBg: body.actionIconBg || "#FFFFFF",
      actionLabelColor: body.actionLabelColor || "#ED1C24",
      // Badges
      badgeBgColor: body.badgeBgColor || "#ED1C24",
      badgeTextColor: body.badgeTextColor || "#FFF200",
      // Header Style & Texts
      headerStyle: body.headerStyle === "modern" ? "modern" : "classic",
      flashSaleBadge: body.flashSaleBadge || "FLASH SALE",
      flashSaleText: body.flashSaleText || "Smart TVs & Inverter ACs up to 55% Off + Extra Instant Bank Cashback",
      storeCountText: body.storeCountText || "180+ Stores in South India",
      helplineText: body.helplineText || "+91 88805 98985",
      zeroDownpaymentText: body.zeroDownpaymentText || "ZERO DOWNPAYMENT AVAILABLE",
      isActive: true,
    };

    const updated = await NavbarSettings.findOneAndUpdate(
      {},
      { $set: updateData },
      { new: true, upsert: true }
    );

    return NextResponse.json(
      {
        success: true,
        message: "Navbar settings saved successfully",
        data: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error saving navbar settings:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to save navbar settings",
      },
      { status: 500 }
    );
  }
}

