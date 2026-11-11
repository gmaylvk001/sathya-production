import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Offer from "@/models/ecom_offer_info";
import Product from "@/models/product"; // Import Product model
import { requireAdmin } from "@/lib/adminRequest";

export async function GET() {
    try {
        await connectDB(); 
        const offers = await Offer.find({});
        return NextResponse.json({ success: true, data: offers });
    } catch (error) {
        console.error("Error fetching offers:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch offers" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const auth = await requireAdmin(req);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await connectDB();
        const body = await req.json();  // Parse request body

        // Ensure required 'notes' is present; use default if missing/empty
        const notes =
            typeof body.notes === "string" && body.notes.trim()
                ? body.notes.trim()
                : "No notes provided.";

        // Validate offer limit if enabled
        if (body.limit_enabled) {
            if (!body.offer_limit || body.offer_limit <= 0) {
                return NextResponse.json(
                    { success: false, error: "Offer limit must be a positive number when limit is enabled" },
                    { status: 400 }
                );
            }
        }

        if (body.selected_users && !Array.isArray(body.selected_users)) {
            return NextResponse.json(
                { success: false, error: "selected_users must be an array" },
                { status: 400 }
            );
        }

        // If offer is applied to categories, automatically get active products from those categories
        let finalOfferProduct = body.offer_product || [];
        
        if (body.offer_product_category === "category" && body.offer_category && body.offer_category.length > 0) {
            try {
                // Get all active products from the selected categories
                const activeProducts = await Product.find({
                    category: { $in: body.offer_category },
                    status: "Active"
                }).select('_id').lean();

                // Extract product IDs
                finalOfferProduct = activeProducts.map(product => product._id.toString());
                
                console.log(`Found ${finalOfferProduct.length} active products from selected categories`);
                
            } catch (error) {
                console.error("Error fetching products from categories:", error);
                return NextResponse.json(
                    { success: false, error: "Failed to fetch products from selected categories" },
                    { status: 500 }
                );
            }
        }

        // Create new offer with populated products and ensured 'notes'
        const newOffer = new Offer({
            ...body,
            notes, // ensure required field exists
            offer_product: finalOfferProduct, // Use the populated product list
            offer_limit: body.limit_enabled ? body.offer_limit : null
        });
        
        await newOffer.save();
        
        return NextResponse.json({ 
            success: true, 
            message: "Offer created successfully!",
            productCount: finalOfferProduct.length // Optional: return count for debugging
        }, { status: 201 });
        
    } catch (error) {
        console.error("Error creating offer:", error);
        
        // Handle duplicate offer code error
        if (error.code === 11000) {
            return NextResponse.json(
                { success: false, error: "Offer code already exists" },
                { status: 400 }
            );
        }
        
        return NextResponse.json({ success: false, error: "Failed to create offer" }, { status: 500 });
    }
}