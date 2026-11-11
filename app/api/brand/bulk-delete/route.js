import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Brand from "@/models/ecom_brand_info";
import Product from "@/models/product";
import CategoryPage from "@/models/categoryPage";
import { PAGE_TYPES } from "@/lib/categoryPageComponents/registry";
import { requireAdmin } from "@/lib/adminRequest";

export async function POST(req) {
    try {
        const auth = await requireAdmin(req, "brands");
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await dbConnect();
        const { brandIds } = await req.json();
    
        if (!brandIds || !Array.isArray(brandIds) || brandIds.length === 0) {
            return NextResponse.json({ error: "An array of Brand IDs is required" }, { status: 400 });
        }

        const results = {
            deletedCount: 0,
            deletedIds: [],
            failedIds: [],
            errors: []
        };

        for (const brandId of brandIds) {
            try {
                // Get product count with this brand
                const productCount = await Product.countDocuments({ brand: brandId });
                
                if (productCount > 0) {
                    results.failedIds.push(brandId);
                    results.errors.push(`Cannot delete brand ${brandId} as it has ${productCount} associated products.`);
                    continue;
                }

                const brand = await Brand.findByIdAndDelete(brandId);
                if (!brand) {
                    results.failedIds.push(brandId);
                    results.errors.push(`Brand ${brandId} not found.`);
                    continue;
                }

                results.deletedCount++;
                results.deletedIds.push(brandId);
            } catch (err) {
                console.error(`Error deleting brand ${brandId}:`, err);
                results.failedIds.push(brandId);
                results.errors.push(`Error deleting brand ${brandId}.`);
            }
        }

        // Clean up CategoryPage layouts for deleted brands
        if (results.deletedIds.length > 0) {
            try {
                await CategoryPage.deleteMany({
                    $or: [
                        { pageType: PAGE_TYPES.BRAND, categoryId: { $in: results.deletedIds } },
                        { pageType: PAGE_TYPES.CATEGORY_BRAND, brandId: { $in: results.deletedIds } },
                    ],
                });
            } catch (pageErr) {
                console.error("Error bulk deleting CategoryPage layouts:", pageErr);
            }
        }

        if (results.deletedCount === 0 && results.failedIds.length > 0) {
             return NextResponse.json(
                { 
                    error: "None of the selected brands could be deleted.",
                    results 
                }, 
                { status: 400 }
            );
        }

        return NextResponse.json({ 
            success: true, 
            message: `Successfully deleted ${results.deletedCount} brands. ${results.failedIds.length > 0 ? `${results.failedIds.length} failed.` : ''}`,
            results 
        });
    } catch (error) {
        console.error("Error bulk deleting Brands:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
