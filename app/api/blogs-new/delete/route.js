import dbConnect from "@/lib/db";
import Blogs from "@/models/Blogs";
import BlogFaq from "@/models/BlogFaq";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();

    if (!body._id) {
      return NextResponse.json({ success: false, error: "Blog ID is required" }, { status: 400 });
    }

    const deletedBlog = await Blogs.findByIdAndDelete(body._id);
    if (!deletedBlog) {
      return NextResponse.json({ success: false, error: "Blog not found" }, { status: 404 });
    }

    // Cascade delete FAQs associated with this blog
    await BlogFaq.deleteMany({
      $or: [
        { blogId: body._id },
        ...(deletedBlog.existId ? [{ existId: String(deletedBlog.existId) }] : [])
      ]
    });

    return NextResponse.json({ success: true, message: "Blog deleted successfully" });
  } catch (error) {
    console.error("Error deleting blog:", error);
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
  }
}
