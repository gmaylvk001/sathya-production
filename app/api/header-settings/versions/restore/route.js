import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import dbConnect from "@/lib/db";
import { requireAdmin } from "@/lib/adminRequest";
import HeaderSettingsVersion from "@/models/HeaderSettingsVersion";
import { mergeHeaderSettings } from "@/lib/headerSettings";
import {
  getOrSeedHeaderSettings,
  pushHeaderVersionSnapshot,
  saveHeaderSettingsDoc,
} from "@/lib/headerSettingsServer";

export async function POST(req) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    await dbConnect();
    const body = await req.json().catch(() => ({}));
    const { versionId } = body || {};

    const targetVersion = versionId
      ? await HeaderSettingsVersion.findById(versionId).lean()
      : await HeaderSettingsVersion.findOne({}).sort({ createdAt: -1 }).lean();

    if (!targetVersion || !targetVersion.settings) {
      return NextResponse.json(
        { success: false, message: "No saved version found to restore" },
        { status: 404 }
      );
    }

    const current = await getOrSeedHeaderSettings();
    await pushHeaderVersionSnapshot(current, auth.userId, "Before restore");

    const restoredConfig = mergeHeaderSettings(targetVersion.settings);
    const saved = await saveHeaderSettingsDoc(restoredConfig);
    revalidateTag("header-settings");

    return NextResponse.json(
      {
        success: true,
        message: "Header settings restored successfully",
        data: saved,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error restoring header settings version:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to restore version" },
      { status: 500 }
    );
  }
}
