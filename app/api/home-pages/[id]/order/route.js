import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import HomePage from "@/models/homePage";

export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const page = await HomePage.findById(id);
    if (!page) {
      return NextResponse.json({ success: false, message: "Page not found" }, { status: 404 });
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
    const activeMap = body.activeStates || {};
    page.components.forEach((comp) => {
      if (orderMap.has(comp.instanceId)) {
        comp.order = orderMap.get(comp.instanceId);
      }
      if (comp.instanceId in activeMap) {
        comp.isActive = activeMap[comp.instanceId];
      }
    });
    page.components.sort((a, b) => a.order - b.order);
    await page.save();

    return NextResponse.json({ success: true, page: page.toObject() });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
