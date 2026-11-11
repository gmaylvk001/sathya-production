import { NextResponse } from "next/server";
import { getLaunchProductById, updateLaunchProduct, deleteLaunchProduct } from "../../../../../../lib/services/launchProduct.service";

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const product = await getLaunchProductById(id);
    return NextResponse.json({ code: 200, message: "Success", data: product });
  } catch (error) {
    return NextResponse.json({ code: error.message === "Launch product not found" ? 404 : 500, message: error.message }, { status: error.message === "Launch product not found" ? 404 : 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const actorId = null; // Mock
    const body = await request.json();
    const updated = await updateLaunchProduct(id, body, actorId, request);
    return NextResponse.json({ code: 200, message: "Updated successfully", data: updated });
  } catch (error) {
    if (error.name === "ValidationError") {
      return NextResponse.json({ code: 400, message: "Validation Error", details: error.errors }, { status: 400 });
    }
    if (error.message.includes("Conflict")) {
      return NextResponse.json({ code: 409, message: error.message }, { status: 409 });
    }
    return NextResponse.json({ code: 500, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const actorId = null; // Mock
    await deleteLaunchProduct(id, actorId, request);
    return NextResponse.json({ code: 200, message: "Deleted successfully" });
  } catch (error) {
    return NextResponse.json({ code: error.message === "Launch product not found" ? 404 : 500, message: error.message }, { status: error.message === "Launch product not found" ? 404 : 500 });
  }
}
