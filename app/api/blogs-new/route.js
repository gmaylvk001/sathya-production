import dbConnect from "@/lib/db";
import Blogs from "@/models/Blogs";
import BlogFaq from "@/models/BlogFaq";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const excludeSlug = searchParams.get("excludeSlug");
    const search = searchParams.get("search");
    const limitParam = searchParams.get("limit");

    // ── 1. Single blog by slug ───────────────────────────────────────────────
    if (slug) {
      const blogDoc = await Blogs.findOne({ slug });
      if (!blogDoc) {
        return NextResponse.json({ success: false, error: "Blog not found" }, { status: 404 });
      }

      const blog = blogDoc.toObject ? blogDoc.toObject() : blogDoc;

      // Relational Foreign Key Query: find FAQs in separate blogs_faq collection
      const faqConditions = [{ blogId: blog._id }];
      if (blog.existId) {
        faqConditions.push({ existId: String(blog.existId) });
      }

      const faqs = await BlogFaq.find({ $or: faqConditions })
        .sort({ createdAt: 1 })
        .lean();

      blog.faqs = faqs;

      // Increment view counter
      Blogs.findByIdAndUpdate(blog._id, { $inc: { views: 1 } }).catch(() => {});

      return NextResponse.json({ success: true, data: blog });
    }

    // ── 2. Filter query ──────────────────────────────────────────────────────
    const query = {};

    if (status) {
      query.status = status;
    }

    if (category && category !== "All") {
      query.category = { $regex: new RegExp(`^${category.trim()}$`, "i") };
    }

    if (excludeSlug) {
      query.slug = { $ne: excludeSlug };
    }

    if (search && search.trim()) {
      const q = search.trim();
      query.$or = [
        { blogTitle: { $regex: q, $options: "i" } },
        { shortDescription: { $regex: q, $options: "i" } },
        { category: { $regex: q, $options: "i" } },
      ];
    }

    let blogsQuery = Blogs.find(query).sort({ publishDate: -1, createdAt: -1 });

    if (limitParam) {
      const limit = parseInt(limitParam, 10);
      if (!isNaN(limit) && limit > 0) {
        blogsQuery = blogsQuery.limit(limit);
      }
    }

    const blogs = await blogsQuery.lean();

    // Aggregate FAQ counts per blog from the separate blogs_faq collection
    const blogIds = blogs.map((b) => b._id);
    const existIds = blogs.map((b) => b.existId).filter(Boolean);

    const faqCountsByBlogId = {};
    const faqCountsByExistId = {};

    if (blogIds.length > 0 || existIds.length > 0) {
      // Count by blogId
      if (blogIds.length > 0) {
        const byBlogId = await BlogFaq.aggregate([
          { $match: { blogId: { $in: blogIds } } },
          { $group: { _id: "$blogId", count: { $sum: 1 } } },
        ]);
        byBlogId.forEach((r) => {
          faqCountsByBlogId[String(r._id)] = r.count;
        });
      }
      // Count by existId
      if (existIds.length > 0) {
        const byExistId = await BlogFaq.aggregate([
          { $match: { existId: { $in: existIds } } },
          { $group: { _id: "$existId", count: { $sum: 1 } } },
        ]);
        byExistId.forEach((r) => {
          faqCountsByExistId[String(r._id)] = r.count;
        });
      }
    }

    // Merge faqCount into each blog
    const blogsWithFaqCount = blogs.map((b) => {
      const countByBlogId = faqCountsByBlogId[String(b._id)] || 0;
      const countByExistId = b.existId ? (faqCountsByExistId[String(b.existId)] || 0) : 0;
      return { ...b, faqCount: Math.max(countByBlogId, countByExistId) };
    });

    return NextResponse.json({
      success: true,
      count: blogsWithFaqCount.length,
      data: blogsWithFaqCount,
    });
  } catch (error) {
    console.error("Error fetching blogs:", error);
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
  }
}
