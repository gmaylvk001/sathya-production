"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FiClock, FiArrowLeft, FiShare2, FiPlus, FiMinus, FiCheck } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";

function formatDate(dateStr) {
  if (!dateStr) return "10th Jul, 2026";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "10th Jul, 2026";
  
  const day = d.getDate();
  let suffix = "th";
  if (day === 1 || day === 21 || day === 31) suffix = "st";
  else if (day === 2 || day === 22) suffix = "nd";
  else if (day === 3 || day === 23) suffix = "rd";

  const month = d.toLocaleDateString("en-GB", { month: "short" });
  const year = d.getFullYear();
  return `${day}${suffix} ${month}, ${year}`;
}

function calculateReadTime(text, explicitTime) {
  if (explicitTime) return `${explicitTime} min read`;
  if (!text) return "5 min read";
  const plainText = text.replace(/<[^>]*>/g, "").trim();
  const wordCount = plainText.split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(wordCount / 200));
  return `${minutes} min read`;
}

export default function BlogDetailPage() {
  const params = useParams();
  const rawSlug = params?.slug;
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;

  const [blog, setBlog] = useState(null);
  const [otherBlogs, setOtherBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // FAQ Accordion open index (first open by default)
  const [openFaqIndex, setOpenFaqIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  // 1. Fetch main blog by slug
  useEffect(() => {
    if (!slug) return;

    async function fetchBlogDetail() {
      try {
        setLoading(true);
        setNotFound(false);

        const res = await fetch(`/api/blogs-new?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();

        if (data.success && data.data) {
          setBlog(data.data);
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error("Error loading blog details:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    fetchBlogDetail();
  }, [slug]);

  // 2. Fetch Other Blogs for the sidebar
  useEffect(() => {
    if (!slug) return;

    async function fetchOtherBlogs() {
      try {
        const res = await fetch(
          `/api/blogs-new?status=Active&excludeSlug=${encodeURIComponent(slug)}&limit=25`
        );
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setOtherBlogs(data.data);
        }
      } catch (err) {
        console.error("Error fetching other blogs:", err);
      }
    }

    fetchOtherBlogs();
  }, [slug]);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const PLACEHOLDER_IMAGE =
    "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22800%22%20height%3D%22500%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23f3f4f6%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20fill%3D%22%239ca3af%22%20font-family%3D%22sans-serif%22%20font-size%3D%2220%22%20font-weight%3D%22bold%22%20text-anchor%3D%22middle%22%20dy%3D%22.3em%22%3ESathya%20Stores%20Blog%3C%2Ftext%3E%3C%2Fsvg%3E";

  // Resolve image URL safely with live fallback
  const getSafeImageUrl = (imgPath) => {
    if (!imgPath) return PLACEHOLDER_IMAGE;
    if (imgPath.startsWith("http://") || imgPath.startsWith("https://") || imgPath.startsWith("data:")) {
      return imgPath;
    }
    const clean = imgPath.startsWith("/") ? imgPath : `/${imgPath}`;
    return clean;
  };

  const handleImageError = (e, fallbackPath) => {
    const target = e.currentTarget;
    const currentSrc = target.src;

    // If local failed, try fetching directly from sathya.store live assets
    if (!currentSrc.includes("https://www.sathya.store") && fallbackPath && !fallbackPath.startsWith("data:")) {
      const cleanPath = fallbackPath.startsWith("/") ? fallbackPath.slice(1) : fallbackPath;
      target.src = `https://www.sathya.store/${cleanPath}`;
    } else {
      target.onerror = null;
      target.src = PLACEHOLDER_IMAGE;
    }
  };

  // Loading Skeleton State
  if (loading) {
    return (
      <div className="min-h-screen bg-white pb-20">
        <div className="w-full bg-white border-b border-gray-100 py-5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="w-24 h-6 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="w-32 h-4 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            <div className="lg:col-span-8 space-y-4">
              <div className="w-32 h-4 bg-gray-200 rounded animate-pulse" />
              <div className="w-full h-12 bg-gray-200 rounded animate-pulse" />
              <div className="w-48 h-4 bg-gray-100 rounded animate-pulse" />
              <div className="w-full h-80 bg-gray-200 rounded-2xl animate-pulse" />
              <div className="space-y-3 pt-6">
                <div className="w-full h-4 bg-gray-100 rounded animate-pulse" />
                <div className="w-5/6 h-4 bg-gray-100 rounded animate-pulse" />
                <div className="w-4/6 h-4 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
            <div className="lg:col-span-4 space-y-4">
              <div className="w-36 h-6 bg-gray-200 rounded animate-pulse mb-6" />
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-4 items-center">
                  <div className="w-20 h-14 bg-gray-200 rounded-xl animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="w-full h-3.5 bg-gray-200 rounded animate-pulse" />
                    <div className="w-2/3 h-3 bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not Found State
  if (notFound || !blog) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-md bg-white p-8 rounded-2xl border border-gray-200/80 shadow-sm">
          <h2 className="text-2xl font-black text-gray-900 mb-2">Blog Article Not Found</h2>
          <p className="text-sm text-gray-500 mb-6">
            The article you are looking for may have been updated or removed.
          </p>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#d72828] text-white rounded-xl text-xs font-bold hover:bg-[#b91c1c] transition-colors"
          >
            <FiArrowLeft /> Back to All Blogs
          </Link>
        </div>
      </div>
    );
  }

  const readTimeStr = calculateReadTime(blog.description, blog.readingTime);
  const featuredImgPath = blog.featuredImage || blog.bannerImage;
  const bannerImgPath = blog.bannerImage || "/uploads/blog/blog-banner-default.png";

  // Active FAQs (strictly dynamic from database, no static dummy fallback)
  const activeFaqs = Array.isArray(blog.faqs) && blog.faqs.length > 0 ? blog.faqs : [];

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* ── 1. Top Breadcrumb Bar (Matching Image 1: "Home > Blog") ─────── */}
      <div className="w-full bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-4">
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight mb-1 uppercase">
            BLOG
          </h1>
          <nav className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500 font-medium">
            <Link
              href="/"
              className="hover:text-[#d72828] transition-colors"
            >
              Home
            </Link>
            <span className="text-gray-400">&gt;</span>
            <Link
              href="/blog"
              className="hover:text-[#d72828] transition-colors font-semibold text-gray-700"
            >
              Blog
            </Link>
          </nav>
        </div>
      </div>

      {/* ── 2. Top Promotional Banner (Only if explicitly set on blog) ──── */}
      {blog.bannerImage && (
        <section className="w-full bg-white pt-2 pb-6 border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="w-full overflow-hidden rounded-xl border border-gray-100 shadow-sm bg-gray-50">
              <img
                src={getSafeImageUrl(blog.bannerImage)}
                alt="Sathya Promotional Banner"
                onError={(e) => handleImageError(e, blog.bannerImage)}
                className="w-full h-auto object-cover max-h-[340px]"
              />
            </div>
          </div>
        </section>
      )}

      {/* ── 3. Main 2-Column Grid Layout ──────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* ── Left Column: Main Blog Content (~68% width) ───────────────── */}
          <article className="lg:col-span-8">
            {/* Category Lead Indicator: "— MOBILES" */}
            {blog.category && (
              <div className="flex items-center gap-2 mb-3">
                <span className="w-4 h-0.5 bg-[#d72828] inline-block" />
                <Link
                  href={`/blog?category=${encodeURIComponent(blog.category)}`}
                  className="text-xs sm:text-sm font-bold tracking-wider uppercase text-[#d72828] hover:underline"
                >
                  {blog.category}
                </Link>
              </div>
            )}

            {/* Editorial Serif Heading (Matching Old Sathya Stores Image 1) */}
            <h1 className="text-2xl sm:text-3xl md:text-[34px] font-serif font-bold text-[#1e3860] leading-tight sm:leading-snug mb-4 tracking-normal">
              {blog.blogTitle}
            </h1>

            {/* Meta Row: "— 10th Jul, 2026 | Admin" */}
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 mb-6 font-medium">
              <span className="w-3.5 h-0.5 bg-[#d72828] inline-block mr-1" />
              <span>{formatDate(blog.publishDate || blog.createdAt)}</span>
              <span>|</span>
              <span className="text-[#15803d] font-bold">{blog.author || "Admin"}</span>
              {readTimeStr && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-gray-400">
                    <FiClock className="text-xs" />
                    {readTimeStr}
                  </span>
                </>
              )}
            </div>

            {/* Featured Article Image (Matching Image 1) */}
            {featuredImgPath && (
              <div className="mb-6 rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-gray-50">
                <img
                  src={getSafeImageUrl(featuredImgPath)}
                  alt={blog.blogTitle}
                  onError={(e) => handleImageError(e, featuredImgPath)}
                  className="w-full h-auto object-cover max-h-[480px]"
                />
              </div>
            )}

            {/* Category Badge Below Featured Image */}
            {blog.category && (
              <div className="mb-6">
                <Link
                  href={`/blog?category=${encodeURIComponent(blog.category)}`}
                  className="inline-block bg-[#d72828] text-white text-xs font-bold px-3.5 py-1 rounded-full shadow-sm hover:bg-[#b91c1c] transition-colors"
                >
                  {blog.category}
                </Link>
              </div>
            )}

            {/* ── Dynamic HTML Article Body (Exact Typography & Styling of Old Sathya Stores) ── */}
            <div
              className="blog-content-body text-gray-800 leading-relaxed text-sm sm:text-base space-y-4"
              dangerouslySetInnerHTML={{ __html: blog.description || "" }}
            />

            {/* Category Badge Button at Bottom of Article */}
            {blog.category && (
              <div className="mt-8 mb-6">
                <Link
                  href={`/blog?category=${encodeURIComponent(blog.category)}`}
                  className="inline-block bg-[#d72828] text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-sm hover:bg-[#b91c1c] transition-colors"
                >
                  {blog.category}
                </Link>
              </div>
            )}



            {/* ── Frequently Asked Questions (FAQ) Section ── */}
            {activeFaqs && activeFaqs.length > 0 && (
              <section className="mt-10 mb-10 rounded-2xl border border-[#ececec] bg-white p-6 sm:p-8 shadow-[0_16px_40px_rgba(17,17,17,0.04)]">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-5 mb-6 border-b border-[#eee] gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-4 h-0.5 bg-[#d72828] inline-block" />
                      <span className="text-xs font-bold uppercase tracking-wider text-[#d72828]">
                        SUPPORT
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#151515] uppercase tracking-wide">
                      FREQUENTLY ASKED QUESTIONS
                    </h2>
                    <p className="text-xs sm:text-sm text-[#777] mt-1.5">
                      Quick answers to help you get the most out of this article.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 items-start">
                  {activeFaqs.map((faq, idx) => {
                    if (!faq.question?.trim()) return null;
                    const isOpen = openFaqIndex === idx;

                    return (
                      <div
                        key={idx}
                        className={`border rounded-xl transition-all duration-200 overflow-hidden ${
                          isOpen
                            ? "border-[#e9b9b9] bg-white shadow-[0_10px_24px_rgba(215,39,39,0.08)]"
                            : "border-[#ececec] bg-white hover:border-[#e3c6c6]"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setOpenFaqIndex(isOpen ? -1 : idx)}
                          className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer"
                        >
                          <span className="text-[14px] sm:text-[15px] font-semibold text-[#181818] leading-snug">
                            {faq.question}
                          </span>
                          <span
                            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-base font-bold transition-all ${
                              isOpen
                                ? "bg-[#d72828] text-white"
                                : "bg-[#f4f4f4] text-[#d72828]"
                            }`}
                          >
                            {isOpen ? "−" : "+"}
                          </span>
                        </button>

                        {isOpen && faq.answer && (
                          <div className="px-4 pb-5 sm:px-5 sm:pb-5 text-xs sm:text-sm text-gray-600 leading-relaxed border-t border-[#f2f2f2] pt-3.5 mt-[-2px]">
                            {faq.answer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Article Footer: Social Share & Return Link */}
            <div className="mt-12 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#d72828] hover:text-[#b91c1c] transition-colors"
              >
                <FiArrowLeft className="text-base" />
                Back to All Blogs
              </Link>

              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 font-medium">Share article:</span>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    blog.blogTitle + (shareUrl ? " - " + shareUrl : "")
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-green-500 text-white rounded-full text-xs font-semibold hover:bg-green-600 transition-colors shadow-sm"
                  title="Share on WhatsApp"
                >
                  <FaWhatsapp className="text-sm" />
                  WhatsApp
                </a>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold hover:bg-gray-200 transition-colors"
                  title="Copy link to clipboard"
                >
                  {copied ? <FiCheck className="text-green-600 text-sm" /> : <FiShare2 className="text-sm" />}
                  {copied ? "Copied!" : "Copy Link"}
                </button>
              </div>
            </div>
          </article>

          {/* ── Right Column: Other Blogs Sidebar (Matching Image 1 Dense Style) ── */}
          <aside className="lg:col-span-4 lg:pl-2">
            <div className="sticky top-20">
              <h2 className="text-xl font-bold text-gray-900 mb-5 tracking-tight">
                Other Blogs
              </h2>

              <div className="space-y-3.5">
                {otherBlogs.length > 0 ? (
                  otherBlogs.map((item) => {
                    const itemImgPath = item.featuredImage || item.bannerImage;

                    return (
                      <Link
                        key={item._id || item.slug}
                        href={`/blog/${item.slug}`}
                        className="group flex items-center gap-3 p-1.5 rounded-xl hover:bg-gray-50 transition-all duration-200"
                      >
                        {/* Compact Thumbnail Image */}
                        <div className="w-20 h-14 sm:w-22 sm:h-15 rounded-lg overflow-hidden bg-gray-100 border border-gray-100 shrink-0 shadow-xs">
                          <img
                            src={getSafeImageUrl(itemImgPath)}
                            alt={item.blogTitle}
                            onError={(e) => handleImageError(e, itemImgPath)}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>

                        {/* Title Right Next to Thumbnail (Matching Image 1) */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xs sm:text-[13px] font-semibold text-[#1e3860] leading-snug line-clamp-2 group-hover:text-[#d72828] transition-colors">
                            {item.blogTitle}
                          </h3>
                          <span className="text-[11px] text-gray-400 mt-1 block">
                            {formatDate(item.publishDate || item.createdAt)}
                          </span>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <p className="text-xs text-gray-400 italic">No other blogs available.</p>
                )}
              </div>
            </div>
          </aside>
        </div>


      </main>

      {/* ── Custom CSS for Rich HTML Blog Body (Matching Old Sathya Stores) ── */}
      <style jsx global>{`
        .blog-content-body h1,
        .blog-content-body h2,
        .blog-content-body h3,
        .blog-content-body h4 {
          color: #1e3860;
          font-family: inherit;
          font-weight: 700;
          margin-top: 1.75rem;
          margin-bottom: 0.75rem;
          line-height: 1.35;
        }
        .blog-content-body h2 {
          font-size: 1.35rem;
        }
        .blog-content-body h3 {
          font-size: 1.15rem;
        }
        .blog-content-body p {
          margin-bottom: 1rem;
          line-height: 1.8;
          color: #374151;
        }
        .blog-content-body ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-bottom: 1.25rem;
        }
        .blog-content-body ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin-bottom: 1.25rem;
        }
        .blog-content-body li {
          margin-bottom: 0.4rem;
          line-height: 1.6;
        }
        .blog-content-body strong,
        .blog-content-body b {
          color: #111827;
          font-weight: 700;
        }
        .blog-content-body a {
          color: #d72828;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .blog-content-body img {
          max-width: 100%;
          height: auto;
          border-radius: 0.75rem;
          margin: 1.25rem 0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }
        .blog-content-body table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5rem 0;
        }
        .blog-content-body table th,
        .blog-content-body table td {
          border: 1px solid #e5e7eb;
          padding: 0.6rem 0.8rem;
          text-align: left;
        }
        .blog-content-body table th {
          background-color: #f9fafb;
          font-weight: 600;
        }
        .blog-content-body blockquote {
          border-left: 4px solid #d72828;
          padding-left: 1rem;
          font-style: italic;
          color: #4b5563;
          margin: 1.25rem 0;
        }
        .blog-content-body .ql-align-center {
          text-align: center;
        }
        .blog-content-body .ql-align-right {
          text-align: right;
        }
        .blog-content-body .ql-align-justify {
          text-align: justify;
        }
      `}</style>
    </div>
  );
}
