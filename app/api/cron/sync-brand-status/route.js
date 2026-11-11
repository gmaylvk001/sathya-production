import { NextResponse } from "next/server";
import { syncBrandProductCounts } from "@/lib/brandSyncService";

export const dynamic = "force-dynamic";

function isAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  // If no secret configured in environment, allow execution
  if (!secret) return true;

  const { searchParams } = new URL(req.url);
  const querySecret = searchParams.get("secret") || searchParams.get("key");
  if (querySecret === secret) return true;

  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.replace(/^Bearer\s+/i, "") === secret) return true;

  return false;
}

export async function GET(req) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Valid cron secret is required." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const dryRun = searchParams.get("dryRun") === "true";

    const result = await syncBrandProductCounts({
      dryRun,
      triggeredBy: "api_get",
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[api/cron/sync-brand-status] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to sync brand product counts",
        message: error?.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Valid cron secret is required." },
        { status: 401 }
      );
    }

    let body = {};
    try {
      body = await req.json();
    } catch {
      // Body is optional
    }

    const { searchParams } = new URL(req.url);
    const dryRun = body?.dryRun === true || searchParams.get("dryRun") === "true";

    const result = await syncBrandProductCounts({
      dryRun,
      triggeredBy: body?.triggeredBy || "api_post",
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[api/cron/sync-brand-status] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to sync brand product counts",
        message: error?.message,
      },
      { status: 500 }
    );
  }
}
