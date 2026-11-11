"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRegion } from "@/context/RegionContext";
import { FiChevronLeft, FiChevronRight, FiExternalLink, FiX } from "react-icons/fi";
import { FaInstagram, FaPlay } from "react-icons/fa";

function getInstagramEmbedUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  const trimmed = rawUrl.trim();

  // Extract Instagram shortcode from /reel/..., /reels/..., /p/..., /tv/..., or /{user}/reel/...
  const igRegex =
    /instagram\.com\/(?:(?:[a-zA-Z0-9_.-]+\/)?(?:reel|reels|p|tv)|share\/(?:reel|p))\/?([A-Za-z0-9_-]+)/i;
  const match = trimmed.match(igRegex);
  if (match && match[1]) {
    const code = match[1];
    const isPost = /\/p\//i.test(trimmed);
    const type = isPost ? "p" : "reel";
    return `https://www.instagram.com/${type}/${code}/embed/`;
  }

  // If already an embed URL
  if (trimmed.includes("/embed")) return trimmed;

  return trimmed;
}

function usePerPage() {
  const [perPage, setPerPage] = useState(4);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 640) setPerPage(1);
      else if (w < 768) setPerPage(2);
      else if (w < 1100) setPerPage(3);
      else setPerPage(4);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return perPage;
}

function getPageStarts(total, perPage) {
  if (total <= 0) return [];
  if (total <= perPage) return [0];
  const starts = [];
  for (let i = 0; i + perPage < total; i += perPage) {
    starts.push(i);
  }
  const last = total - perPage;
  if (starts[starts.length - 1] !== last) starts.push(last);
  return starts;
}

export default function TrendingVideoSection({ config }) {
  const { region, selectedRegion } = useRegion();
  const [videos, setVideos] = useState(() => {
    if (config?.videos && Array.isArray(config.videos)) {
      return config.videos.filter((v) => (v.status || "Active") === "Active");
    }
    return [];
  });
  const [loading, setLoading] = useState(
    () => !(config?.videos && Array.isArray(config.videos))
  );
  const scrollerRef = useRef(null);
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const [activeModalVideo, setActiveModalVideo] = useState(null);
  const perPage = usePerPage();

  // Touch tracking to distinguish between a tap (watch video) and a swipe/scroll
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const isDraggingRef = useRef(false);

  const currentRegion = region || selectedRegion?.id || "tamilnadu";

  useEffect(() => {
    if (config?.videos && Array.isArray(config.videos)) {
      setVideos(config.videos.filter((v) => (v.status || "Active") === "Active"));
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchVideos = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/videocard?region=${encodeURIComponent(currentRegion)}`
        );
        const data = await res.json();
        if (cancelled) return;

        if (data.success && Array.isArray(data.videoCards)) {
          const activeList = data.videoCards.filter(
            (v) => (v.status || "Active") === "Active"
          );
          setVideos(activeList);
        } else {
          setVideos([]);
        }
      } catch (err) {
        console.error("Failed to load trending videos:", err);
        if (!cancelled) setVideos([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchVideos();

    return () => {
      cancelled = true;
    };
  }, [currentRegion, config?.videos]);

  // Load Instagram Embed Script once
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!document.getElementById("instagram-embed-script")) {
        const script = document.createElement("script");
        script.id = "instagram-embed-script";
        script.src = "https://www.instagram.com/embed.js";
        script.async = true;
        document.body.appendChild(script);
      } else if (window.instgrm?.Embeds?.process) {
        window.instgrm.Embeds.process();
      }
    }
  }, [videos]);

  // Modal Escape key and body scroll lock
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setActiveModalVideo(null);
      }
    };
    if (activeModalVideo) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [activeModalVideo]);

  const pageStarts = useMemo(
    () => getPageStarts(videos.length, perPage),
    [videos.length, perPage]
  );

  const pages = useMemo(
    () => pageStarts.map((start) => videos.slice(start, start + perPage)),
    [videos, pageStarts, perPage]
  );

  const pageCount = Math.max(1, pages.length);

  const scrollToPage = useCallback(
    (index, behavior = "smooth") => {
      const el = scrollerRef.current;
      if (!el) return;
      let next = Math.max(0, Math.min(index, pageCount - 1));
      el.scrollTo({ left: next * el.clientWidth, behavior });
      setPage(next);
    },
    [pageCount]
  );

  // Sync scroll position with active page index on mobile swipe/scroll
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;

    const handleScroll = () => {
      const w = el.clientWidth || 1;
      const currentPage = Math.round(el.scrollLeft / w);
      setPage((prev) => (prev !== currentPage ? currentPage : prev));
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setPage(0);
    const el = scrollerRef.current;
    if (el) el.scrollTo({ left: 0, behavior: "auto" });
  }, [perPage]);

  // Card touch handlers to allow native swipe while supporting tap-to-open
  const handleCardTouchStart = (e) => {
    if (e.touches && e.touches[0]) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
      isDraggingRef.current = false;
    }
  };

  const handleCardTouchMove = (e) => {
    if (e.touches && e.touches[0]) {
      const dx = Math.abs(e.touches[0].clientX - touchStartRef.current.x);
      const dy = Math.abs(e.touches[0].clientY - touchStartRef.current.y);
      if (dx > 8 || dy > 8) {
        isDraggingRef.current = true;
      }
    }
  };

  const handleCardTouchEnd = (video) => {
    const elapsed = Date.now() - touchStartRef.current.time;
    if (!isDraggingRef.current && elapsed < 450) {
      setActiveModalVideo(video);
    }
  };

  const handleCardClick = (video) => {
    if (!isDraggingRef.current) {
      setActiveModalVideo(video);
    }
  };

  // If loading or no videos exist for this region, don't show empty container
  if (loading || videos.length === 0) {
    return null;
  }

  const headingText = config?.title || "Instagram Feed";
  const gapPx = 16;
  const cellStyle = {
    width: `calc((100% - ${(perPage - 1) * gapPx}px) / ${perPage})`,
  };

  const renderCard = (video, key, isFirstPage) => {
    const embedUrl = getInstagramEmbedUrl(video.video_url);

    return (
      <div
        key={key}
        className="group relative box-border min-w-0 shrink-0 bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl hover:border-gray-300 select-none cursor-pointer"
        style={cellStyle}
        onTouchStart={handleCardTouchStart}
        onTouchMove={handleCardTouchMove}
        onTouchEnd={() => handleCardTouchEnd(video)}
        onClick={() => handleCardClick(video)}
      >
        {/* Reel Box: pointer-events-none on iframe ensures touches & swipes pass to carousel & page */}
        <div className="relative w-full h-[490px] sm:h-[540px] md:h-[580px] bg-neutral-900 overflow-hidden">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={video.title || "Instagram Reel"}
              className="w-full h-full border-0 block pointer-events-none select-none bg-white"
              scrolling="no"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              loading={isFirstPage ? "eager" : "lazy"}
            />
          ) : (
            <div className="p-4 text-center text-gray-400 text-sm flex flex-col items-center justify-center h-full gap-2 bg-gray-50">
              <FaInstagram size={28} className="text-gray-300" />
              <span>Video unavailable</span>
              {video.video_url && (
                <a
                  href={video.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-blue-600 underline font-medium"
                >
                  Open in Instagram
                </a>
              )}
            </div>
          )}

          {/* Interactive Floating Layer: handles tap-to-watch and direct Instagram link */}
          <div className="absolute inset-0 z-10 flex flex-col justify-between p-3 sm:p-4 bg-gradient-to-b from-black/45 via-transparent to-black/75 pointer-events-auto">
            {/* Top Bar */}
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white text-[11px] font-medium shadow-sm">
                <FaInstagram className="text-[#ee2a7b]" size={13} />
                <span>Instagram Reel</span>
              </div>
              <a
                href={video.video_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="h-8 w-8 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md border border-white/15 text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-sm"
                title="Open in Instagram App"
                aria-label="Open in Instagram App"
              >
                <FiExternalLink size={14} />
              </a>
            </div>

            {/* Center Play Indicator */}
            <div className="flex flex-col items-center justify-center gap-2 group-hover:scale-105 transition-transform duration-300">
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white flex items-center justify-center shadow-2xl ring-4 ring-white/25 group-hover:ring-white/40 transition-all">
                <FaPlay className="ml-1" size={17} />
              </div>
              <span className="text-[11px] sm:text-xs font-semibold text-white bg-black/65 backdrop-blur-md px-3 py-1 rounded-full shadow-md tracking-wide">
                Tap to Watch
              </span>
            </div>

            {/* Bottom Info Bar */}
            <div className="flex items-center justify-between text-white/90 text-xs">
              <span className="text-[11px] text-white/90 font-medium truncate max-w-[65%]">
                {video.title && video.title !== "Instagram Reel"
                  ? video.title
                  : "@sathyastores"}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-white bg-white/20 hover:bg-white/30 backdrop-blur-md px-2.5 py-1 rounded-lg transition shadow-sm">
                Watch Reel &rarr;
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="w-full mb-8 bg-white py-4 border-t border-gray-100">
      <div className="w-full px-4 sm:px-6">
        {/* Section Heading & Controls */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-3">
            {/* Instagram Gradient Icon */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] flex items-center justify-center shadow-sm shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
                {headingText}
              </h2>
              <p className="text-xs text-gray-500 hidden sm:block">
                Watch our latest reels and product showcases on Instagram
              </p>
            </div>
          </div>

          {/* Carousel Next/Prev Controls */}
          {pageCount > 1 && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                aria-label="Previous reel page"
                disabled={page <= 0}
                onClick={() => scrollToPage(page - 1)}
                className="h-8 w-8 rounded-full border border-gray-300 bg-gray-50 text-gray-700 flex items-center justify-center hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition active:scale-95 shadow-xs"
              >
                <FiChevronLeft size={18} />
              </button>
              <button
                type="button"
                aria-label="Next reel page"
                disabled={page >= pageCount - 1}
                onClick={() => scrollToPage(page + 1)}
                className="h-8 w-8 rounded-full border border-gray-300 bg-gray-50 text-gray-700 flex items-center justify-center hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition active:scale-95 shadow-xs"
              >
                <FiChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Carousel Viewport: Native horizontal swipe and uninterrupted page scrolling */}
        <div
          className="relative bg-white"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div
            ref={scrollerRef}
            className="flex w-full gap-0 overflow-x-auto overflow-y-hidden scroll-smooth snap-x snap-mandatory scrollbar-none bg-white"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {pages.map((chunk, pageIdx) => (
              <div
                key={pageIdx}
                className="flex w-full min-w-full shrink-0 snap-start snap-always bg-white"
                style={{ gap: `${gapPx}px` }}
              >
                {chunk.map((video, i) =>
                  renderCard(
                    video,
                    `${video._id || video.video_url}-${pageIdx}-${i}`,
                    pageIdx === 0
                  )
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Pagination Dots on Mobile & Multi-page */}
        {pageCount > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-3 pt-1">
            {Array.from({ length: pageCount }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                aria-label={`Go to slide ${idx + 1}`}
                onClick={() => scrollToPage(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  page === idx
                    ? "w-6 bg-gradient-to-r from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]"
                    : "w-2 bg-gray-300 hover:bg-gray-400"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Full Reel Viewer Modal */}
      {activeModalVideo && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
          onClick={() => setActiveModalVideo(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Instagram Reel Viewer"
        >
          <div
            className="relative w-full max-w-[420px] bg-zinc-950 rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800 text-white">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] flex items-center justify-center text-white shrink-0">
                  <FaInstagram size={15} />
                </div>
                <div>
                  <h3 className="text-xs font-bold leading-tight">SATHYA Stores</h3>
                  <p className="text-[10px] text-zinc-400">Instagram Reel</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={activeModalVideo.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white text-xs font-semibold shadow hover:opacity-90 transition active:scale-95"
                >
                  <span>Open in App</span>
                  <FiExternalLink size={12} />
                </a>
                <button
                  type="button"
                  onClick={() => setActiveModalVideo(null)}
                  className="h-8 w-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition active:scale-95"
                  aria-label="Close modal"
                >
                  <FiX size={18} />
                </button>
              </div>
            </div>

            {/* Modal Iframe Content: pointer-events active inside modal */}
            <div className="relative w-full h-[540px] sm:h-[600px] max-h-[75vh] bg-black overflow-hidden flex items-center justify-center">
              <iframe
                src={getInstagramEmbedUrl(activeModalVideo.video_url)}
                title="Instagram Reel Player"
                className="w-full h-full border-0 block bg-white"
                scrolling="no"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between gap-3">
              <span className="text-xs text-zinc-300 truncate font-medium">
                {activeModalVideo.title &&
                activeModalVideo.title !== "Instagram Reel"
                  ? activeModalVideo.title
                  : "Watch on Instagram"}
              </span>
              <a
                href={activeModalVideo.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-xs text-[#ee2a7b] hover:text-[#f9ce34] font-semibold transition"
              >
                View on Instagram &rarr;
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
