import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import CategoryPage from "@/models/categoryPage";

/**
 * PUT /api/category-pages/[id]/order
 * Body: { orderedInstanceIds: string[] }
 */
export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const page = await CategoryPage.findById(id);
    if (!page) {
      return NextResponse.json(
        { success: false, message: "Page not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    if (!Array.isArray(body.orderedInstanceIds)) {
      return NextResponse.json(
        { success: false, message: "orderedInstanceIds required" },
        { status: 400 }
      );
    }

    const orderMap = new Map(
      body.orderedInstanceIds.map((instanceId, index) => [instanceId, index])
    );
    page.components.forEach((comp) => {
      if (orderMap.has(comp.instanceId)) {
        comp.order = orderMap.get(comp.instanceId);
      }
    });
    page.components.sort((a, b) => a.order - b.order);
    await page.save();

    return NextResponse.json({ success: true, page: page.toObject() });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
