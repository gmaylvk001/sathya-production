import mapbox from "@/models/mapbox"; // Adjust path to your Store model as necessary
import connectDB from "@/lib/db"; // Adjust path to your database connection utility

export async function GET() {
  await connectDB(); // Connect to your database

  try {
    // Fetch all stores from the database
    const stores = await mapbox.find({});

    // Return the stores as a JSON response
    return new Response(JSON.stringify({ success: true, data: stores }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error("Failed to fetch stores:", error);
    return new Response(JSON.stringify({ success: false, error: error.message || "Failed to fetch stores" }), {
      status: 500, // Internal Server Error
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}