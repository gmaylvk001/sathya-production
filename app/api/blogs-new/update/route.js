import dbConnect from "@/lib/db";
import Blogs from "@/models/Blogs";
import BlogFaq from "@/models/BlogFaq";
import { normalizeSchemaJson } from "@/lib/blogSchema";
import { NextResponse } from "next/server";

export async function PUT(req) {
  try {
    await dbConnect();
    const body = await req.json();

    if (!body._id) {
      return NextResponse.json({ success: false, error: "Blog ID is required" }, { status: 400 });
    }

    if (body.slug) {
      const existing = await Blogs.findOne({ slug: body.slug, _id: { $ne: body._id } });
      if (existing) {
        return NextResponse.json({ success: false, error: "Slug already exists" }, { status: 400 });
      }
    }

    const { faqs, stores, isAllStores, store_id, store_ids, ...blogData } = body;

    if (blogData.schemaJson !== undefined) {
      const schema = normalizeSchemaJson(blogData.schemaJson);
      if (!schema.ok) {
        return NextResponse.json({ success: false, error: schema.error }, { status: 400 });
      }
      blogData.schemaJson = schema.value;
    }

    const updatedBlog = await Blogs.findByIdAndUpdate(
      body._id,
      {
        $set: blogData,
        $unset: { stores: 1, isAllStores: 1, store_id: 1, store_ids: 1, faqs: 1 },
      },
      { new: true }
    );
    if (!updatedBlog) {
      return NextResponse.json({ success: false, error: "Blog not found" }, { status: 404 });
    }

    // Sync FAQs in separate blogs_faq collection linked by blogId foreign key
    if (Array.isArray(faqs)) {
      const delQuery = [{ blogId: updatedBlog._id }];
      if (updatedBlog.existId) {
        delQuery.push({ existId: String(updatedBlog.existId) });
      }
      await BlogFaq.deleteMany({ $or: delQuery });

      const faqDocs = faqs
        .filter((f) => f.question && f.question.trim() && f.answer && f.answer.trim())
        .map((f) => ({
          blogId: updatedBlog._id,
          existId: updatedBlog.existId || "",
          question: f.question.trim(),
          answer: f.answer.trim(),
        }));

      if (faqDocs.length > 0) {
        await BlogFaq.insertMany(faqDocs);
      }
    }

    return NextResponse.json({ success: true, data: updatedBlog });
  } catch (error) {
    console.error("Error updating blog:", error);
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
  }
}
