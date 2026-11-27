import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/adminRequest";
import { cloneDefaults } from "@/lib/headerSettings";
import {
  getOrSeedHeaderSettings,
  pushHeaderVersionSnapshot,
  saveHeaderSettingsDoc,
} from "@/lib/headerSettingsServer";

export async function POST(req) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const current = await getOrSeedHeaderSettings();
    await pushHeaderVersionSnapshot(current, auth.userId, "Before reset to defaults");

    const defaults = cloneDefaults();
    const saved = await saveHeaderSettingsDoc(defaults);
    revalidateTag("header-settings");

    return NextResponse.json(
      {
        success: true,
        message: "Header settings reset to defaults",
        data: saved,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error resetting header settings:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to reset header settings" },
      { status: 500 }
    );
  }
}
