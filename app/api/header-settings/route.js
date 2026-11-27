import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminRequest";
import { cloneDefaults, validateHeaderSettings } from "@/lib/headerSettings";
import {
  getOrSeedHeaderSettings,
  pushHeaderVersionSnapshot,
  saveHeaderSettingsDoc,
} from "@/lib/headerSettingsServer";

export async function GET() {
  try {
    const data = await getOrSeedHeaderSettings();
    return NextResponse.json(
      { success: true, data },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching header settings:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch header settings",
        data: cloneDefaults(),
      },
      { status: 500 }
    );
  }
}

async function handleSave(req) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const body = await req.json();
    const validation = validateHeaderSettings(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          message: validation.errors[0] || "Validation failed",
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    const current = await getOrSeedHeaderSettings();
    await pushHeaderVersionSnapshot(current, auth.userId, body._note || "Before update");
    const saved = await saveHeaderSettingsDoc(validation.data);

    return NextResponse.json(
      {
        success: true,
        message: "Header settings saved successfully",
        data: saved,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error saving header settings:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to save header settings" },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  return handleSave(req);
}

export async function POST(req) {
  return handleSave(req);
}
