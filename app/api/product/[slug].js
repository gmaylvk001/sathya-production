import dbConnect from "@/lib/db";
import Product from "@/models/product";

export async function GET(request, { params }) {
  await dbConnect();

  const { slug } = params;

  try {
    if (!slug) {
      return new Response(JSON.stringify({ message: "Missing product slug" }), {
        status: 400,
      });
    }

    const product = await Product.findOne({ slug }).lean();

    if (!product) {
      return new Response(JSON.stringify({ message: "Product not found" }), {
        status: 404,
      });
    }

    return new Response(JSON.stringify(product), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("API Error:", error);
    return new Response(JSON.stringify({ message: "Internal Server Error" }), {
      status: 500,
    });
  }
}
