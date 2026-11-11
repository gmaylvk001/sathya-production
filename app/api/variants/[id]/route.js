import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import VariantGroup from "@/models/variantGroup";
import {
  parseGroupPayload,
  validateGroupPayload,
  syncProductVariantGroupLinks,
  unlinkAllProducts,
  buildPublicVariantGroup,
} from "@/lib/variantGroup";

export async function GET(_req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const group = await VariantGroup.findById(id).lean();
    if (!group) {
      return NextResponse.json({ error: "Variant group not found" }, { status: 404 });
    }
    const data = await buildPublicVariantGroup(group);
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("GET /api/variants/:id", error);
    return NextResponse.json({ error: "Failed to fetch variant group" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const existingGroup = await VariantGroup.findById(id);
    if (!existingGroup) {
      return NextResponse.json({ error: "Variant group not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = parseGroupPayload(body);
    const validation = await validateGroupPayload({ ...parsed, groupId: id });
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    existingGroup.name = parsed.name;
    if (parsed.group_code !== undefined) {
      existingGroup.group_code = parsed.group_code;
    }
    existingGroup.attributes = parsed.attributes;
    existingGroup.products = parsed.products;
    await existingGroup.save();

    await syncProductVariantGroupLinks(
      existingGroup._id,
      parsed.products.map((p) => p.productId)
    );

    return NextResponse.json(
      { message: "Variant group updated", data: existingGroup },
      { status: 200 }
    );
  } catch (error) {
    console.error("PUT /api/variants/:id", error);
    return NextResponse.json({ error: error.message || "Failed to update variant group" }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const group = await VariantGroup.findById(id);
    if (!group) {
      return NextResponse.json({ error: "Variant group not found" }, { status: 404 });
    }

    await unlinkAllProducts(id);
    await VariantGroup.findByIdAndDelete(id);

    return NextResponse.json(
      { message: "Variant group removed. Products were not deleted." },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE /api/variants/:id", error);
    return NextResponse.json({ error: "Failed to delete variant group" }, { status: 500 });
  }
}
