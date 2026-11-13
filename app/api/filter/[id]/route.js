import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Filter from "@/models/ecom_filter_infos";

export async function PUT(req, { params }) {
  try {
    // 1. Resolve and validate route parameter 'id'
    const resolvedParams = params ? await params : {};
    const id = resolvedParams?.id;

    if (!id || typeof id !== "string" || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid or missing filter ID" },
        { status: 400 }
      );
    }

    // 2. Safe request body parsing (protect against empty body, malformed JSON, and client aborts)
    let body;
    try {
      const rawText = await req.text();
      if (!rawText || !rawText.trim()) {
        return NextResponse.json(
          { success: false, error: "Request body cannot be empty" },
          { status: 400 }
        );
      }
      body = JSON.parse(rawText);
    } catch (parseError) {
      if (req.signal?.aborted || parseError?.code === "ECONNRESET") {
        return new Response(null, { status: 499 });
      }
      return NextResponse.json(
        { success: false, error: "Invalid or malformed JSON payload" },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, error: "Request body must be a JSON object" },
        { status: 400 }
      );
    }

    // 3. Validate update payload fields
    const updateData = {};
    if (typeof body.filter_slug === "string" && body.filter_slug.trim()) {
      updateData.filter_slug = body.filter_slug.trim();
    }
    if (typeof body.filter_name === "string" && body.filter_name.trim()) {
      updateData.filter_name = body.filter_name.trim();
    }
    if (typeof body.status === "string" && body.status.trim()) {
      updateData.status = body.status.trim();
    }
    if (body.filter_group !== undefined) {
      updateData.filter_group = body.filter_group;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields provided to update" },
        { status: 400 }
      );
    }

    updateData.updatedAt = new Date();

    // 4. Update in database
    await connectDB();

    const result = await Filter.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!result) {
      return NextResponse.json(
        { success: false, message: "Filter not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error?.code === "ECONNRESET" || req.signal?.aborted) {
      return new Response(null, { status: 499 });
    }
    console.error("Update Error in PUT /api/filter/[id]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
