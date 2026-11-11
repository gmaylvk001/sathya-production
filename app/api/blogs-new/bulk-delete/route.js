import dbConnect from "@/lib/db";
import Blogs from "@/models/Blogs";
import BlogFaq from "@/models/BlogFaq";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();

    if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json({ success: false, error: "Blog IDs are required" }, { status: 400 });
    }

    const deletedBlogs = await Blogs.find({ _id: { $in: body.ids } });
    
    await Blogs.deleteMany({ _id: { $in: body.ids } });

    // Cascade delete FAQs associated with these blogs
    for (const deletedBlog of deletedBlogs) {
      await BlogFaq.deleteMany({
        $or: [
          { blogId: deletedBlog._id },
          ...(deletedBlog.existId ? [{ existId: String(deletedBlog.existId) }] : [])
        ]
      });
    }

    return NextResponse.json({ success: true, message: "Blogs deleted successfully" });
  } catch (error) {
    console.error("Error bulk deleting blogs:", error);
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
  }
}
