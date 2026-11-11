import dbConnect from "@/lib/db";
import Review from "@/models/Review";

export async function PATCH(req) {
  try {
    await dbConnect();

    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return Response.json(
        { success: false, error: "ID and Status are required" },
        { status: 400 }
      );
    }

    const updatedReview = await Review.findByIdAndUpdate(
        id,
        { review_status: status, updated_date: new Date() },
        { new: true }
    );

    if (!updatedReview) {
      return Response.json(
        { success: false, error: "Review not found" },
        { status: 404 }
      );
    }

    return Response.json(
      { success: true, data: updatedReview },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating review:", error);
    return Response.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}