import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import BlogFaq from "@/models/BlogFaq";
import Blogs from "@/models/Blogs";

// GET: List FAQs with matched Blog information
export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const existId = searchParams.get("existId");
    const blogId = searchParams.get("blogId");

    const query = {};

    if (existId) {
      query.existId = existId;
    }

    if (blogId) {
      query.blogId = blogId;
    }

    if (search && search.trim()) {
      const q = search.trim();
      query.$or = [
        { question: { $regex: q, $options: "i" } },
        { answer: { $regex: q, $options: "i" } },
        { existId: { $regex: q, $options: "i" } },
      ];
    }

    const faqs = await BlogFaq.find(query)
      .populate({ path: "blogId", select: "blogTitle slug existId category" })
      .sort({ createdAt: -1 })
      .lean();

    // For any FAQs where blogId wasn't populated yet, try matching via existId
    const unpopulatedExistIds = faqs
      .filter((f) => !f.blogId && f.existId)
      .map((f) => f.existId);

    if (unpopulatedExistIds.length > 0) {
      const matchedBlogs = await Blogs.find({ existId: { $in: unpopulatedExistIds } })
        .select("blogTitle slug existId category")
        .lean();

      const blogMap = new Map();
      matchedBlogs.forEach((b) => blogMap.set(String(b.existId), b));

      faqs.forEach((f) => {
        if (!f.blogId && f.existId && blogMap.has(String(f.existId))) {
          f.blogId = blogMap.get(String(f.existId));
        }
      });
    }

    return NextResponse.json({
      success: true,
      count: faqs.length,
      data: faqs,
    });
  } catch (error) {
    console.error("Error fetching FAQs:", error);
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
  }
}

// POST: Create single FAQ in blogs_faq
export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();

    const { question, answer, existId, blogId } = body;

    if (!question || !answer) {
      return NextResponse.json(
        { success: false, error: "Question and Answer are required" },
        { status: 400 }
      );
    }

    // Resolve blogId if only existId is provided, or vice-versa
    let resolvedBlogId = blogId || null;
    let resolvedExistId = existId ? String(existId).trim() : "";

    if (!resolvedBlogId && resolvedExistId) {
      const matched = await Blogs.findOne({ existId: resolvedExistId }).select("_id existId");
      if (matched) resolvedBlogId = matched._id;
    } else if (resolvedBlogId && !resolvedExistId) {
      const matched = await Blogs.findById(resolvedBlogId).select("existId");
      if (matched && matched.existId) resolvedExistId = String(matched.existId);
    }

    const newFaq = await BlogFaq.create({
      question: question.trim(),
      answer: answer.trim(),
      existId: resolvedExistId,
      blogId: resolvedBlogId,
    });

    return NextResponse.json({ success: true, data: newFaq });
  } catch (error) {
    console.error("Error creating FAQ:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update an FAQ in blogs_faq
export async function PUT(req) {
  try {
    await dbConnect();
    const body = await req.json();

    const { _id, question, answer, existId, blogId } = body;

    if (!_id) {
      return NextResponse.json({ success: false, error: "FAQ ID is required" }, { status: 400 });
    }

    const updateDoc = {};
    if (question !== undefined) updateDoc.question = String(question).trim();
    if (answer !== undefined) updateDoc.answer = String(answer).trim();
    if (existId !== undefined) updateDoc.existId = String(existId).trim();
    if (blogId !== undefined) updateDoc.blogId = blogId || null;

    if (updateDoc.existId && !updateDoc.blogId) {
      const matched = await Blogs.findOne({ existId: updateDoc.existId }).select("_id");
      if (matched) updateDoc.blogId = matched._id;
    }

    const updated = await BlogFaq.findByIdAndUpdate(_id, updateDoc, { new: true });
    if (!updated) {
      return NextResponse.json({ success: false, error: "FAQ not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating FAQ:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete an FAQ from blogs_faq
export async function DELETE(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id) {
      try {
        const body = await req.json();
        id = body._id || body.id;
      } catch {
        // query param was empty
      }
    }

    if (!id) {
      return NextResponse.json({ success: false, error: "FAQ ID is required" }, { status: 400 });
    }

    const deleted = await BlogFaq.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "FAQ not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "FAQ deleted successfully" });
  } catch (error) {
    console.error("Error deleting FAQ:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
