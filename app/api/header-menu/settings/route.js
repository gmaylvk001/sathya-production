import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminRequest";
import { updateHeaderMenuSettings } from "@/lib/headerMenu";

export const dynamic = "force-dynamic";

const PERMISSION = "categories";

export async function PUT(req) {
  const auth = await requireAdmin(req, PERMISSION);
  if (!auth.authorized) return auth.response;

  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body.menuButtonEnabled !== "boolean") {
      return NextResponse.json({ error: "menuButtonEnabled must be true or false" }, { status: 400 });
    }

    const settings = await updateHeaderMenuSettings({ menuButtonEnabled: body.menuButtonEnabled });
    return NextResponse.json({ data: settings });
  } catch (error) {
    console.error("[header-menu settings PUT]", error);
    return NextResponse.json({ error: "Failed to update header menu settings" }, { status: 500 });
  }
}
