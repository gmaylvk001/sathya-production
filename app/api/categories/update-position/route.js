// app/api/categories/update-position/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Category from "@/models/ecom_category_info";
import { requireAdmin } from "@/lib/adminRequest";

export async function POST(request) {
  try {
    const auth = await requireAdmin(request, "categories");
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await dbConnect();

    const { categories } = await request.json();

    if (!categories || !Array.isArray(categories)) {
      return NextResponse.json(
        { error: "Categories array is required" },
        { status: 400 }
      );
    }

    const bulkOps = categories.map((category) => ({
      updateOne: {
        filter: { _id: category._id },
        update: {
          $set: {
            position: category.position,
            updatedAt: new Date(),
          },
        },
      },
    }));

    const result = await Category.bulkWrite(bulkOps);

    const cacheStore = globalThis.__sathyaCategoriesCache;
    if (cacheStore) {
      cacheStore.data = null;
      cacheStore.at = 0;
    }

    return NextResponse.json(
      { success: true, updated: result?.modifiedCount ?? 0 },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating category positions:", error);
    return NextResponse.json(
      { error: "Failed to update category positions: " + error.message },
      { status: 500 }
    );
  }
}
