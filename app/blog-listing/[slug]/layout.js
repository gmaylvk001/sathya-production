import dbConnect from "@/lib/db";
import Blogs from "@/models/Blogs";
import BlogFaq from "@/models/BlogFaq";
import { schemaScripts, serializeJsonLd, blogDetailUrl } from "@/lib/blogSchema";

export const dynamic = "force-dynamic";

async function loadBlog(rawSlug) {
  const slug = decodeURIComponent(String(rawSlug || "")).trim();
  if (!slug) return { blog: null, faqs: [] };
  try {
    await dbConnect();
    const blog = await Blogs.findOne({ slug }).lean();
    if (!blog || String(blog.status || "").toLowerCase() !== "active") {
      return { blog: null, faqs: [] };
    }
    const faqConditions = [{ blogId: blog._id }];
    if (blog.existId) faqConditions.push({ existId: String(blog.existId) });
    const faqs = await BlogFaq.find({ $or: faqConditions }).sort({ createdAt: 1 }).lean();
    return { blog, faqs };
  } catch (error) {
    console.error("blog detail schema load error:", error);
    return { blog: null, faqs: [] };
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { blog } = await loadBlog(slug);
  if (!blog) return {};

  const title = blog.metaTitle || blog.blogTitle;
  const description = blog.metaDescription || blog.shortDescription || "";
  return {
    title,
    ...(description ? { description } : {}),
    ...(blog.metaKeywords ? { keywords: blog.metaKeywords } : {}),
    alternates: { canonical: blogDetailUrl(blog.slug) },
  };
}

export default async function BlogDetailLayout({ children, params }) {
  const { slug } = await params;
  const { blog, faqs } = await loadBlog(slug);
  const items = blog ? schemaScripts(blog, faqs) : [];

  return (
    <>
      {items.map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(item) }}
        />
      ))}
      {children}
    </>
  );
}
