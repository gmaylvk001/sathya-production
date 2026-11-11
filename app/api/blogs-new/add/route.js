import dbConnect from "@/lib/db";
import Blogs from "@/models/Blogs";
import BlogFaq from "@/models/BlogFaq";
import { normalizeSchemaJson } from "@/lib/blogSchema";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();

    if (!body.blogTitle || !body.slug) {
      return NextResponse.json({ success: false, error: "Blog Title and Slug are required" }, { status: 400 });
    }

    // Check if slug exists
    const existing = await Blogs.findOne({ slug: body.slug });
    if (existing) {
      return NextResponse.json({ success: false, error: "Slug already exists" }, { status: 400 });
    }

    const { faqs, stores, isAllStores, store_id, store_ids, ...blogData } = body;

    const schema = normalizeSchemaJson(blogData.schemaJson);
    if (!schema.ok) {
      return NextResponse.json({ success: false, error: schema.error }, { status: 400 });
    }
    blogData.schemaJson = schema.value;

    const newBlog = await Blogs.create(blogData);

    // Save FAQs to separate blogs_faq collection linked by blogId foreign key
    if (Array.isArray(faqs) && faqs.length > 0) {
      const faqDocs = faqs
        .filter((f) => f.question && f.question.trim() && f.answer && f.answer.trim())
        .map((f) => ({
          blogId: newBlog._id,
          existId: newBlog.existId || "",
          question: f.question.trim(),
          answer: f.answer.trim(),
        }));

      if (faqDocs.length > 0) {
        await BlogFaq.insertMany(faqDocs);
      }
    }

    return NextResponse.json({ success: true, data: newBlog });
  } catch (error) {
    console.error("Error creating blog:", error);
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
  }
}
