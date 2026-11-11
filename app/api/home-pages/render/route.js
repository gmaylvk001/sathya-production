import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { resolveHomePageComponents } from "@/lib/homePageComponents/resolvePageComponents";

/**
 * GET /api/home-pages/render
 * Returns storefront-ready Home Page Builder components in admin order.
 */
export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const region = (
      searchParams.get("region") ||
      searchParams.get("state") ||
      req.cookies?.get("sathya_selected_region")?.value ||
      "all"
    ).toLowerCase();

    const result = await resolveHomePageComponents(region);
    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/home-pages/render", err);
    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Failed to render home page",
        hasDesign: false,
        components: [],
      },
      { status: 500 }
    );
  }
}
