import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Product from "@/models/product";

export async function GET(req) {
    await dbConnect();

    try {
        const { searchParams } = new URL(req.url);
        const brandId = searchParams.get('brandId');
    
        if (!brandId) {
            return NextResponse.json({ error: "Brand ID is required" }, { status: 400 });
        }

        const count = await Product.countDocuments({ brand: brandId });
        
        return NextResponse.json({ count });
    } catch (error) {
        console.error("Error counting products:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}