import { NextResponse } from "next/server";
import { getHeaderMenuSettings, getPublicHeaderMenu } from "@/lib/headerMenu";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET() {
  try {
    const [data, settings] = await Promise.all([getPublicHeaderMenu(), getHeaderMenuSettings()]);
    return NextResponse.json({ data, settings }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error("[header-menu storefront]", error);
    return NextResponse.json({ data: [], error: "Failed to load header menu" }, { headers: NO_CACHE_HEADERS });
  }
}
