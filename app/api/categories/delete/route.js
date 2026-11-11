import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Category from "@/models/ecom_category_info"; // Adjust the path based on your structure
import { requireAdmin } from "@/lib/adminRequest";

export async function POST(req) {
    try {
        const auth = await requireAdmin(req, "categories");
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await dbConnect();
        const { categoryId } = await req.json();

        if (!categoryId) {
            return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
        }

        // Find the category to be deleted
        const category = await Category.findById(categoryId);
        if (!category) {
            return NextResponse.json({ error: "Category not found" }, { status: 404 });
        }

        // Recursively find all descendant category IDs (children, grandchildren, etc.)
        const allToDeleteIds = new Set([String(category._id)]);
        let currentParentIdentifiers = [
            String(category._id),
            category.category_name,
            category.md5_cat_name,
        ].filter(Boolean);

        while (currentParentIdentifiers.length > 0) {
            const children = await Category.find({
                $or: [
                    { parentid: { $in: currentParentIdentifiers } },
                    { parentid_new: { $in: currentParentIdentifiers } },
                ],
            }).select("_id category_name md5_cat_name").lean();

            if (!children || children.length === 0) break;

            const nextParents = [];
            for (const child of children) {
                const childIdStr = String(child._id);
                if (!allToDeleteIds.has(childIdStr)) {
                    allToDeleteIds.add(childIdStr);
                    nextParents.push(childIdStr);
                    if (child.category_name) nextParents.push(child.category_name);
                    if (child.md5_cat_name) nextParents.push(child.md5_cat_name);
                }
            }
            currentParentIdentifiers = nextParents;
        }

        // Delete main category and all descendants in one batch
        await Category.deleteMany({
            _id: { $in: Array.from(allToDeleteIds) }
        });

        // Invalidate in-memory categories cache
        if (globalThis.__sathyaCategoriesCache) {
            globalThis.__sathyaCategoriesCache.data = null;
            globalThis.__sathyaCategoriesCache.at = 0;
        }

        return NextResponse.json(
            { success: true, message: "Category and all subcategories deleted successfully", deletedCount: allToDeleteIds.size },
            { headers: { "Cache-Control": "no-store" } }
        );
    } catch (error) {
        console.error("Error deleting category:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
