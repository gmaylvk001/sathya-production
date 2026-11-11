import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import HighlightedProductSettings from "@/models/HighlightedProductSettings";

export async function GET() {
  try {
    await dbConnect();
    let settings = await HighlightedProductSettings.findOne();
    if (!settings) {
      settings = await HighlightedProductSettings.create({
        labelText: "Highlighted Products",
        labelColor: "#ff0000",
      });
    }
    return NextResponse.json({ success: true, data: settings }, { status: 200 });
  } catch (error) {
    console.error("Error fetching highlighted settings:", error);
    return NextResponse.json({ success: false, error: "Error fetching settings" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const data = await req.json();

    const trimmedText = typeof data?.labelText === "string" ? data.labelText.trim() : "";
    const trimmedColor = typeof data?.labelColor === "string" ? data.labelColor.trim() : "";

    if (!trimmedText) {
      return NextResponse.json(
        { success: false, error: "Highlight label text is required" },
        { status: 400 }
      );
    }

    const hexColorRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
    if (!trimmedColor || !hexColorRegex.test(trimmedColor)) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid hex color (e.g. #d72828)" },
        { status: 400 }
      );
    }

    await dbConnect();

    let settings = await HighlightedProductSettings.findOne();
    if (settings) {
      settings.labelText = trimmedText;
      settings.labelColor = trimmedColor;
      await settings.save();
    } else {
      settings = await HighlightedProductSettings.create({
        labelText: trimmedText,
        labelColor: trimmedColor,
      });
    }

    return NextResponse.json({ success: true, data: settings }, { status: 200 });
  } catch (error) {
    console.error("Error updating highlighted settings:", error);
    return NextResponse.json({ success: false, error: "Error updating settings" }, { status: 500 });
  }
}
