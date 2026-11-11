import dbConnect from "@/lib/db";
import Product from "@/models/product";

export async function GET(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  try {
    let query = {};
    if (category) {
      // 🔑 If you store subcategory _id in sub_category
      query = { sub_category: category };

      // ❗ If you actually save it in category field instead
      // query = { category };
    }

    const products = await Product.find(query).sort({ createdAt: -1, _id: -1 }).lean();

    return Response.json({ success: true, products });
  } catch (error) {
    console.error("Error fetching products:", error);
    return Response.json(
      { success: false, message: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
