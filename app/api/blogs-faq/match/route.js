import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import BlogFaq from "@/models/BlogFaq";
import Blogs from "@/models/Blogs";

export async function POST(req) {
  try {
    await dbConnect();

    // Fetch all blogs with existId or _id
    const blogs = await Blogs.find().select("_id existId slug blogTitle").lean();
    const blogByExistId = new Map();
    const blogById = new Map();

    blogs.forEach((b) => {
      if (b.existId) blogByExistId.set(String(b.existId), b);
      blogById.set(String(b._id), b);
    });

    // Fetch all FAQs from blogs_faq collection
    const allFaqs = await BlogFaq.find();
    let matchedCount = 0;
    let alreadyMatchedCount = 0;
    let unmatchedCount = 0;

    for (const faq of allFaqs) {
      let matchedBlog = null;

      // Match by existId
      if (faq.existId && blogByExistId.has(String(faq.existId))) {
        matchedBlog = blogByExistId.get(String(faq.existId));
      } else if (faq.blogId && blogById.has(String(faq.blogId))) {
        matchedBlog = blogById.get(String(faq.blogId));
      }

      if (matchedBlog) {
        let changed = false;
        if (!faq.blogId || String(faq.blogId) !== String(matchedBlog._id)) {
          faq.blogId = matchedBlog._id;
          changed = true;
        }
        if (matchedBlog.existId && (!faq.existId || String(faq.existId) !== String(matchedBlog.existId))) {
          faq.existId = String(matchedBlog.existId);
          changed = true;
        }

        if (changed) {
          await faq.save();
          matchedCount++;
        } else {
          alreadyMatchedCount++;
        }
      } else {
        unmatchedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      totalFaqs: allFaqs.length,
      newlyMatched: matchedCount,
      alreadyMatched: alreadyMatchedCount,
      unmatched: unmatchedCount,
      message: `Matched ${matchedCount} FAQs to blogs. ${alreadyMatchedCount} already linked.`,
    });
  } catch (error) {
    console.error("Match FAQs error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
