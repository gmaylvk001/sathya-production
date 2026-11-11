import { NextResponse } from "next/server";
import { getLaunchProducts, createLaunchProduct } from "../../../../../lib/services/launchProduct.service";

// Ensure DB connection in a real app by importing your db connect utility here
// import dbConnect from "../../../../../utils/dbConnect";

export async function GET(request) {
  try {
    // await dbConnect();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const design = searchParams.get("design") || "";
    const stock_status = searchParams.get("stock_status") || "";

    const result = await getLaunchProducts({ page, limit, search, status, design, stock_status });

    return NextResponse.json({
      code: 200,
      message: "Success",
      data: result.data,
      meta: result.meta
    });
  } catch (error) {
    console.error("GET /api/v1/admin/launch-products Error:", error);
    return NextResponse.json({ code: 500, message: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    // await dbConnect();
    // Assuming you have middleware or next-auth to get the actorId
    const actorId = null; // Mock actor ID
    const body = await request.json();

    const saved = await createLaunchProduct(body, actorId, request);

    return NextResponse.json({
      code: 201,
      message: "Launch product created successfully",
      data: saved
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/v1/admin/launch-products Error:", error);
    if (error.name === "ValidationError") {
      return NextResponse.json({ code: 400, message: "Validation Error", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ code: 500, message: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
