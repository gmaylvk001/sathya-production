import dbConnect from "@/lib/db";
import Review from "@/models/Review";
import User from "@/models/User";
import product from "@/models/product";

export async function GET() {
    try {
        await dbConnect();
        const Reviews = await Review.find({}).populate('user_id').populate('product_id').lean();

        return Response.json(
            { success: true, data: Reviews || [] },
            {status: 200}
        );
    } catch (error) {
        console.error("Error fetching Reviews:", error);
        return Response.json(
            { success: false, error: "Internal Server Error" }, 
            { status: 500 }
        );
    }
}