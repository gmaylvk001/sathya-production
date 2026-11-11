import connectDB from "@/lib/db";
import JobPosition from "@/models/jobposition";

export async function GET() {
  try {
    await connectDB();
    const positions = await JobPosition.find().lean();

    return Response.json({ data: positions }, { status: 200 });
  } catch (error) {
    console.error("Error fetching job positions:", error);
    return Response.json({ error: "Error fetching job positions" }, { status: 500 });
  }
}
