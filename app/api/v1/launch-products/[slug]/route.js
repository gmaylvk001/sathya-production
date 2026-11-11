import { NextResponse } from "next/server";
import { getLaunchProductBySlug } from "../../../../../lib/services/launchProduct.service";

export async function GET(request, { params }) {
  try {
    const { slug } = params;
    const product = await getLaunchProductBySlug(slug);
    
    // Ensure the product is published (and within schedule) before exposing to public
    const now = new Date();
    if (product.status !== "published") {
      return NextResponse.json({ code: 404, message: "Product not found or unavailable" }, { status: 404 });
    }
    
    if (product.publish_at && new Date(product.publish_at) > now) {
      return NextResponse.json({ code: 404, message: "Product not found or unavailable" }, { status: 404 });
    }
    
    if (product.unpublish_at && new Date(product.unpublish_at) < now) {
      return NextResponse.json({ code: 404, message: "Product not found or unavailable" }, { status: 404 });
    }

    return NextResponse.json({ code: 200, message: "Success", data: product });
  } catch (error) {
    return NextResponse.json(
      { code: error.message === "Launch product not found" ? 404 : 500, message: error.message },
      { status: error.message === "Launch product not found" ? 404 : 500 }
    );
  }
}
