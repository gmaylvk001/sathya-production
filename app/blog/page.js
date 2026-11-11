"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FiSearch, FiShare2, FiChevronLeft, FiChevronRight } from "react-icons/fi";

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22800%22%20height%3D%22500%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23f3f4f6%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20fill%3D%22%239ca3af%22%20font-family%3D%22sans-serif%22%20font-size%3D%2220%22%20font-weight%3D%22bold%22%20text-anchor%3D%22middle%22%20dy%3D%22.3em%22%3ESathya%20Stores%20Blog%3C%2Ftext%3E%3C%2Fsvg%3E";

const DEFAULT_BANNER = {
  image: "",
  alt: "Sathya Stores Promotional Banner",
  redirectUrl: "",
  isActive: false,
};

function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDate(dateStr) {
  if (!dateStr) return "28 Aug, 2024";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "28 Aug, 2024";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function BlogListingContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "All";

  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Banner State
  const [bannerData] = useState(DEFAULT_BANNER);

  // Fetch Blogs from dynamic API
  useEffect(() => {
    async function loadBlogs() {
      try {
        setLoading(true);
        const res = await fetch("/api/blogs-new?status=Active");
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setBlogs(data.data);
        }
      } catch (err) {
        console.error("Error fetching blogs:", err);
      } finally {
        setLoading(false);
      }
    }
    loadBlogs();
  }, []);

  // Update selected category if URL search param changes
  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) {
      setSelectedCategory(cat);
    }
  }, [searchParams]);

  // Extract unique categories from blogs
  const categories = useMemo(() => {
    // Collect all dynamic categories present in the blogs
    const blogCategories = blogs
      .map((b) => b.category?.trim())
      .filter(Boolean);

    // Merge and preserve order: "All" first, then unique categories
    const combined = ["All"];
    blogCategories.forEach((cat) => {
      if (cat && !combined.some((c) => c.toLowerCase() === cat.toLowerCase())) {
        combined.push(cat);
      }
    });

    return combined;
  }, [blogs]);

  // Filter blogs based on category & search query
  const filteredBlogs = useMemo(() => {
    return blogs.filter((b) => {
      const matchesCat =
        selectedCategory === "All" ||
        (b.category &&
          b.category.toLowerCase().trim() === selectedCategory.toLowerCase().trim());

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        b.blogTitle?.toLowerCase().includes(q) ||
        b.shortDescription?.toLowerCase().includes(q) ||
        stripHtml(b.description)?.toLowerCase().includes(q) ||
        b.category?.toLowerCase().includes(q);

      return matchesCat && matchesSearch;
    });
  }, [blogs, selectedCategory, searchQuery]);

  // Reset to page 1 whenever filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredBlogs.length / itemsPerPage) || 1;
  const displayedBlogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredBlogs.slice(start, start + itemsPerPage);
  }, [filteredBlogs, currentPage, itemsPerPage]);

  const handleShare = async (blog) => {
    const url = `${window.location.origin}/blog/${blog.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: blog.blogTitle,
          text: blog.shortDescription || blog.blogTitle,
          url,
        });
      } catch (err) {
        // user cancelled or share failed
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(url);
      alert("Article link copied to clipboard!");
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] pb-20">
      {/* ── 1. Top Breadcrumb Bar ────────────────────────────────────────── */}
      <div className="w-full bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between text-xs sm:text-sm font-semibold tracking-wider uppercase">
          <h2 className="text-gray-900 font-bold tracking-wider">BLOGS</h2>
          <nav className="flex items-center space-x-2 text-gray-500 font-medium">
            <Link
              href="/"
              className="hover:text-[#d72828] transition-colors font-medium"
            >
              HOME
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-semibold">BLOGS</span>
          </nav>
        </div>
      </div>

      {/* ── 2. Top Promotional Banner (EMI Thiruvizha / Offers) ──────────── */}
      {bannerData?.isActive && (
        <section className="w-full bg-white pt-3 pb-4 sm:pb-6 border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="w-full overflow-hidden rounded-xl shadow-sm border border-gray-100 bg-gray-50">
              <img
                src={bannerData.image}
                alt={bannerData.alt}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
                className="w-full h-auto object-cover max-h-[360px]"
              />
            </div>
          </div>
        </section>
      )}

      {/* ── 3. Main Content Container ─────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Header Row: Title & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              BLOGS
            </h1>
            {!loading && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-50 text-[#d72828] border border-red-200">
                {filteredBlogs.length} {filteredBlogs.length === 1 ? "article" : "articles"}
              </span>
            )}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72 md:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search articles..."
              className="w-full rounded-full border border-gray-300 bg-white py-2 pl-10 pr-4 text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:border-[#d72828] focus:outline-none focus:ring-2 focus:ring-[#d72828]/20 transition-all shadow-sm"
            />
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full w-4 h-4 flex items-center justify-center"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Pills (Wrapping Bar Matching Screenshot 1) */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((cat) => {
            const isSelected =
              selectedCategory.toLowerCase().trim() === cat.toLowerCase().trim();

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? "bg-black text-white font-semibold shadow-sm"
                    : "bg-white text-gray-800 border border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* ── 4. Blog Cards Grid (3 Columns) ──────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden p-4 animate-pulse shadow-sm"
              >
                <div className="w-full h-48 bg-gray-200 rounded-xl mb-4" />
                <div className="w-24 h-5 bg-gray-200 rounded-full mb-3" />
                <div className="w-1/2 h-4 bg-gray-100 rounded mb-2" />
                <div className="w-full h-5 bg-gray-200 rounded mb-2" />
                <div className="w-4/5 h-4 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : displayedBlogs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {displayedBlogs.map((blog) => {
              const imageSrc =
                blog.featuredImage || blog.bannerImage || "/uploads/blog/blog-banner-default.png";
              const excerpt =
                blog.shortDescription || stripHtml(blog.description).slice(0, 110);

              return (
                <article
                  key={blog._id || blog.slug}
                  className="group bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col hover:-translate-y-1"
                >
                  {/* Card Thumbnail */}
                  <Link
                    href={`/blog/${blog.slug}`}
                    className="relative block aspect-[16/10] overflow-hidden bg-gray-100"
                  >
                    <img
                      src={imageSrc.startsWith("http") ? imageSrc : imageSrc.startsWith("/") ? imageSrc : `/${imageSrc}`}
                      alt={blog.blogTitle}
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.src.includes("https://www.sathya.store") && imageSrc) {
                          const clean = imageSrc.startsWith("/") ? imageSrc.slice(1) : imageSrc;
                          target.src = `https://www.sathya.store/${clean}`;
                        } else {
                          target.onerror = null;
                          target.src = PLACEHOLDER_IMAGE;
                        }
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </Link>

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Category Badge (Red Pill) */}
                      {blog.category && (
                        <button
                          type="button"
                          onClick={() => setSelectedCategory(blog.category)}
                          className="inline-block bg-[#d72828] text-white text-[11px] font-bold px-3 py-0.5 rounded-full mb-2.5 hover:bg-[#b91c1c] transition-colors"
                        >
                          {blog.category}
                        </button>
                      )}

                      {/* Date & Author */}
                      <div className="text-xs text-gray-500 mb-2 font-medium">
                        {formatDate(blog.publishDate || blog.createdAt)} |{" "}
                        <span className="text-[#15803d] font-bold">
                          {blog.author || "Admin"}
                        </span>
                      </div>

                      {/* Title */}
                      <Link href={`/blog/${blog.slug}`}>
                        <h2 className="text-base font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-[#d72828] transition-colors mb-2">
                          {blog.blogTitle}
                        </h2>
                      </Link>

                      {/* Snippet Description */}
                      {excerpt && (
                        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed line-clamp-3 mb-4">
                          {excerpt}...
                        </p>
                      )}
                    </div>

                    {/* Footer Row: Read More & Share */}
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between mt-auto">
                      <Link
                        href={`/blog/${blog.slug}`}
                        className="text-xs font-bold text-gray-900 hover:text-[#d72828] underline underline-offset-4 transition-colors"
                      >
                        Read More
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleShare(blog)}
                        className="text-gray-500 hover:text-black transition-colors p-1"
                        title="Share"
                      >
                        <FiShare2 className="text-sm" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-lg font-bold text-gray-800 mb-2">
              No articles found
            </p>
            <p className="text-sm text-gray-500 mb-6">
              {searchQuery
                ? `No matching articles found for "${searchQuery}".`
                : selectedCategory !== "All"
                ? `No articles found in category "${selectedCategory}".`
                : "Articles will appear here once published."}
            </p>
            {(searchQuery || selectedCategory !== "All") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                }}
                className="px-4 py-2 bg-[#d72828] text-white rounded-lg text-xs font-semibold hover:bg-[#b91c1c] transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* ── 5. Circular Numbered Pagination Controls ──────────────────────── */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12 mb-6">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors text-sm"
              title="Previous Page"
            >
              <FiChevronLeft />
            </button>

            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => {
              const isActive = currentPage === page;
              return (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`w-9 h-9 rounded-full text-xs font-bold transition-all ${
                    isActive
                      ? "bg-black text-white shadow-sm"
                      : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {page}
                </button>
              );
            })}

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors text-sm"
              title="Next Page"
            >
              <FiChevronRight />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function BlogListingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-500">Loading blogs...</div>}>
      <BlogListingContent />
    </Suspense>
  );
}
