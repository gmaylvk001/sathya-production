
import connectDB  from "@/lib/db";
import ecom_category_info from "@/models/ecom_category_info";

export async function GET(req) {
  try {
    await connectDB();
    const categories = await ecom_category_info.find();
    return Response.json(categories);
  } catch (error) {
    return Response.json({ error: "Error fetching categories" }, { status: 500 });
  }
}
