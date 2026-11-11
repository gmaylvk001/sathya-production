"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FaFacebookF,
  FaInstagram,
  FaYoutube,
  FaHeadset,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { FiChevronDown, FiMail, FiPhone } from "react-icons/fi";
import { TbTruckDelivery } from "react-icons/tb";
import { IoCardOutline, IoPricetagOutline } from "react-icons/io5";

const BRAND_RED = "#ED1C24";
const FOOTER_BG = "#1a1a1a";

const ABOUT_LINKS = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  {
    label: "Store Locator",
    href: "https://sathya.adtarbo.com/stores",
    target: "_blank",
    rel: "noopener noreferrer",
  },
  { label: "Contact Us", href: "/contact" },
  { label: "Help/FAQ", href: "/faq" },
  { label: "Sitemap", href: "/sitemap.xml" },
  { label: "Blogs", href: "/blog-listing" },
];

const POLICY_LINKS = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Cancellation Policy", href: "/cancellation-policy" },
  { label: "Terms & Conditions", href: "/terms-and-conditions" },
];

const OFFER_LINKS = [];

const SOCIAL_LINKS = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/sathyastores",
    Icon: FaFacebookF,
  },
  {
    label: "Twitter",
    href: "https://twitter.com/sathyastores",
    Icon: FaXTwitter,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/sathyastores",
    Icon: FaInstagram,
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@sathyastores",
    Icon: FaYoutube,
  },
];

function sortByPosition(a, b) {
  return (Number(a.position) || 0) - (Number(b.position) || 0);
}

const Footer = () => {
  const [groupedCategories, setGroupedCategories] = useState({
    main: [],
    subs: {},
  });

  const [openSections, setOpenSections] = useState({
    about: false,
    categories: false,
    policies: false,
    offers: false,
    contact: false,
  });

  const toggleSection = (section) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  useEffect(() => {
    const CACHE_TTL = 24 * 60 * 60 * 1000;
    const key = "cache_footer_categories_v2";

    const getCached = () => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.__ts || Date.now() - parsed.__ts > CACHE_TTL) {
          localStorage.removeItem(key);
          return null;
        }
        return parsed.data;
      } catch {
        return null;
      }
    };

    const setCached = (data) => {
      try {
        localStorage.setItem(key, JSON.stringify({ __ts: Date.now(), data }));
      } catch {
        /* ignore */
      }
    };

    const makeGrouped = (data) => {
      const arr = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.categories)
          ? data.categories
          : Array.isArray(data)
            ? data
            : [];
      const active = arr.filter((cat) => cat && cat.status === "Active");
      const main = active.filter((cat) => cat.parentid === "none");
      const subs = {};
      active.forEach((cat) => {
        if (cat.parentid !== "none") {
          if (!subs[cat.parentid]) subs[cat.parentid] = [];
          subs[cat.parentid].push(cat);
        }
      });
      return { main, subs, all: active };
    };

    const cached = getCached();
    if (cached) {
      setGroupedCategories(makeGrouped(cached));
    }

    (async () => {
      try {
        const res = await fetch("/api/categories/get");
        const data = await res.json();
        if (data) {
          setGroupedCategories(makeGrouped(data));
          setCached(data);
        }
      } catch (err) {
        console.error("Error fetching footer categories:", err);
      }
    })();
  }, []);

  const [footerOffers, setFooterOffers] = useState(OFFER_LINKS); // filled from OfferModule only

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await fetch("/api/offer-module/active");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data?.success && Array.isArray(data.data) && data.data.length > 0) {
            const dynamicLinks = data.data
              .filter((o) => o?.slug && o?.offerName)
              .map((o) => ({
                label: o.offerName,
                href: `/offer/${o.slug}`,
              }));
            if (dynamicLinks.length > 0) {
              setFooterOffers(dynamicLinks);
            }
          }
        }
      } catch (err) {
        console.warn("Error fetching active footer offers:", err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  /** All active sub-categories (under main), with correct URLs */
  const categoryColumnLinks = useMemo(() => {
    const mains = [...(groupedCategories.main || [])].sort(sortByPosition);
    const links = [];

    mains.forEach((main) => {
      const subs = [...(groupedCategories.subs?.[main._id] || [])].sort(
        sortByPosition
      );
      subs.forEach((sub) => {
        links.push({
          label: sub.category_name,
          href: `/category/${sub.category_slug}`,
          id: sub._id,
        });
      });
    });

    return links;
  }, [groupedCategories]);

  /**
   * Bottom SEO block: every sub-category + its child categories.
   * Sub title → child1, child2, ...
   */
  const detailRows = useMemo(() => {
    const mains = [...(groupedCategories.main || [])].sort(sortByPosition);
    const rows = [];

    mains.forEach((main) => {
      const subs = [...(groupedCategories.subs?.[main._id] || [])].sort(
        sortByPosition
      );
      subs.forEach((sub) => {
        const children = [
          ...(groupedCategories.subs?.[sub._id] || []),
        ].sort(sortByPosition);

        rows.push({
          title: sub.category_name,
          href: `/category/${sub.category_slug}`,
          id: sub._id,
          children: children.map((child) => ({
            label: child.category_name,
            href: `/category/${sub.category_slug}/${child.category_slug}`,
          })),
        });
      });
    });

    return rows;
  }, [groupedCategories]);

  return (
    <>
      <style jsx global>{`
        .footer-link {
          position: relative;
          display: inline-block;
          color: #9ca3af;
          text-decoration: none;
          transition: color 0.25s ease;
          padding-bottom: 2px;
        }
        .footer-link::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: 0;
          width: 100%;
          height: 1.5px;
          background: #ED1C24;
          transform: scaleX(0);
          transform-origin: left center;
          transition: transform 0.45s ease;
        }
        .footer-link:hover {
          color: #ffffff;
        }
        .footer-link:hover::after {
          transform: scaleX(1);
        }
        .footer-link-bold {
          color: #ffffff;
          font-weight: 700;
        }
        .footer-link-bold:hover {
          color: #ffffff;
        }
        .footer-category-scroll {
          scrollbar-width: thin;
          scrollbar-color: #525252 #262626;
        }
        .footer-category-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .footer-category-scroll::-webkit-scrollbar-track {
          background: #262626;
          border-radius: 9999px;
        }
        .footer-category-scroll::-webkit-scrollbar-thumb {
          background: #525252;
          border-radius: 9999px;
          transition: background 0.2s ease;
        }
        .footer-category-scroll::-webkit-scrollbar-thumb:hover {
          background: #a3a3a3;
        }
      `}</style>
      <footer className="w-full">
        {/* 1. Service highlights — white */}
        <div className="bg-white border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-x-3 gap-y-4 sm:gap-6">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <TbTruckDelivery
                  className="text-2xl sm:text-3xl md:text-4xl shrink-0"
                  style={{ color: BRAND_RED }}
                />
                <div className="min-w-0">
                  <h4 className="font-semibold text-gray-900 text-xs sm:text-sm md:text-base leading-tight">
                    Fast Delivery
                  </h4>
                  <p className="text-[11px] sm:text-xs md:text-sm text-gray-500 mt-0.5 leading-tight">
                    Quick &amp; Reliable
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <IoCardOutline
                  className="text-2xl sm:text-3xl md:text-4xl shrink-0"
                  style={{ color: BRAND_RED }}
                />
                <div className="min-w-0">
                  <h4 className="font-semibold text-gray-900 text-xs sm:text-sm md:text-base leading-tight">
                    Safe Payments
                  </h4>
                  <p className="text-[11px] sm:text-xs md:text-sm text-gray-500 mt-0.5 leading-tight">
                    Secure Checkout
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <IoPricetagOutline
                  className="text-2xl sm:text-3xl md:text-4xl shrink-0"
                  style={{ color: BRAND_RED }}
                />
                <div className="min-w-0">
                  <h4 className="font-semibold text-gray-900 text-xs sm:text-sm md:text-base leading-tight">
                    Quality Products
                  </h4>
                  <p className="text-[11px] sm:text-xs md:text-sm text-gray-500 mt-0.5 leading-tight">
                    Top Quality
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <FaHeadset
                  className="text-2xl sm:text-3xl md:text-4xl shrink-0"
                  style={{ color: BRAND_RED }}
                />
                <div className="min-w-0">
                  <h4 className="font-semibold text-gray-900 text-xs sm:text-sm md:text-base leading-tight">
                    Help Center
                  </h4>
                  <p className="text-[11px] sm:text-xs md:text-sm text-gray-500 mt-0.5 leading-tight">
                    24/7 Support
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Main dark footer */}
        <div style={{ backgroundColor: FOOTER_BG }} className="text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 md:gap-x-6 md:gap-y-8 lg:gap-10">
              {/* ABOUT SATHYA */}
              <div className="border-b border-gray-800 md:border-b-0">
                <button
                  type="button"
                  onClick={() => toggleSection("about")}
                  className="w-full flex items-center justify-between py-3.5 md:py-0 text-left cursor-pointer md:cursor-default focus:outline-none"
                  aria-expanded={openSections.about}
                >
                  <h3 className="text-sm font-bold tracking-wide uppercase text-white md:mb-4">
                    About Sathya
                  </h3>
                  <FiChevronDown
                    className={`md:hidden text-lg text-gray-400 transition-transform duration-200 ${
                      openSections.about ? "rotate-180 text-white" : ""
                    }`}
                  />
                </button>
                <div
                  className={`${
                    openSections.about ? "block" : "hidden"
                  } md:block pb-4 md:pb-0`}
                >
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 md:block md:space-y-2.5">
                    {ABOUT_LINKS.map((link) => (
                      <li key={link.label}>
                        <Link
                          href={link.href}
                          target={link.target}
                          rel={link.rel}
                          className="footer-link text-sm"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* CATEGORIES */}
              <div className="border-b border-gray-800 md:border-b-0">
                <button
                  type="button"
                  onClick={() => toggleSection("categories")}
                  className="w-full flex items-center justify-between py-3.5 md:py-0 text-left cursor-pointer md:cursor-default focus:outline-none"
                  aria-expanded={openSections.categories}
                >
                  <h3 className="text-sm font-bold tracking-wide uppercase text-white md:mb-4">
                    Categories
                  </h3>
                  <FiChevronDown
                    className={`md:hidden text-lg text-gray-400 transition-transform duration-200 ${
                      openSections.categories ? "rotate-180 text-white" : ""
                    }`}
                  />
                </button>
                <div
                  className={`${
                    openSections.categories ? "block" : "hidden"
                  } md:block pb-4 md:pb-0`}
                >
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 md:block md:space-y-2.5 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-neutral-800 [&::-webkit-scrollbar-thumb]:bg-neutral-600 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-neutral-400 footer-category-scroll">
                    {categoryColumnLinks.length === 0 ? (
                      <li className="text-sm text-gray-500">Loading…</li>
                    ) : (
                      categoryColumnLinks.map((link) => (
                        <li key={link.id || link.href}>
                          <Link href={link.href} className="footer-link text-sm">
                            {link.label}
                          </Link>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>

              {/* POLICIES & OFFERS */}
              <div className="border-b border-gray-800 md:border-b-0">
                {/* POLICIES */}
                <div className="border-b border-gray-800/60 md:border-b-0">
                  <button
                    type="button"
                    onClick={() => toggleSection("policies")}
                    className="w-full flex items-center justify-between py-3.5 md:py-0 text-left cursor-pointer md:cursor-default focus:outline-none"
                    aria-expanded={openSections.policies}
                  >
                    <h3 className="text-sm font-bold tracking-wide uppercase text-white md:mb-4">
                      Policies
                    </h3>
                    <FiChevronDown
                      className={`md:hidden text-lg text-gray-400 transition-transform duration-200 ${
                        openSections.policies ? "rotate-180 text-white" : ""
                      }`}
                    />
                  </button>
                  <div
                    className={`${
                      openSections.policies ? "block" : "hidden"
                    } md:block pb-4 md:pb-0`}
                  >
                    <ul className="grid grid-cols-2 sm:grid-cols-2 md:block gap-x-4 gap-y-2.5 md:space-y-2.5">
                      {POLICY_LINKS.map((link) => (
                        <li key={link.label}>
                          <Link href={link.href} className="footer-link text-sm">
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* OFFERS */}
                <div className="mt-0 md:mt-6">
                  <button
                    type="button"
                    onClick={() => toggleSection("offers")}
                    className="w-full flex items-center justify-between py-3.5 md:py-0 text-left cursor-pointer md:cursor-default focus:outline-none"
                    aria-expanded={openSections.offers}
                  >
                    <h3 className="text-sm font-bold tracking-wide uppercase text-white md:mb-4">
                      Offers
                    </h3>
                    <FiChevronDown
                      className={`md:hidden text-lg text-gray-400 transition-transform duration-200 ${
                        openSections.offers ? "rotate-180 text-white" : ""
                      }`}
                    />
                  </button>
                  <div
                    className={`${
                      openSections.offers ? "block" : "hidden"
                    } md:block pb-4 md:pb-0`}
                  >
                    <ul className="space-y-2.5">
                      {footerOffers.map((link) => (
                        <li key={link.label || link.href}>
                          <Link
                            href={link.href}
                            className="footer-link text-sm"
                            onClick={() => {
                              if (typeof window !== "undefined") {
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }
                            }}
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* SALES ENQUIRY */}
              <div className="border-b border-gray-800 md:border-b-0">
                <button
                  type="button"
                  onClick={() => toggleSection("contact")}
                  className="w-full flex items-center justify-between py-3.5 md:py-0 text-left cursor-pointer md:cursor-default focus:outline-none"
                  aria-expanded={openSections.contact}
                >
                  <h3 className="text-sm font-bold tracking-wide uppercase text-white md:mb-4">
                    Sales Enquiry
                  </h3>
                  <FiChevronDown
                    className={`md:hidden text-lg text-gray-400 transition-transform duration-200 ${
                      openSections.contact ? "rotate-180 text-white" : ""
                    }`}
                  />
                </button>
                <div
                  className={`${
                    openSections.contact ? "block" : "hidden"
                  } md:block pb-4 md:pb-0`}
                >
                  <div className="space-y-3 text-sm">
                    <a
                      href="tel:+918880598985"
                      className="flex items-center gap-2 font-semibold hover:opacity-90"
                      style={{ color: BRAND_RED }}
                    >
                      <FiPhone className="text-base shrink-0" />
                      +91 88805 98985
                    </a>
                    <a
                      href="mailto:info@sathya.store"
                      className="flex items-center gap-2 font-semibold hover:opacity-90 break-all"
                      style={{ color: BRAND_RED }}
                    >
                      <FiMail className="text-base shrink-0" />
                      info@sathya.store
                    </a>
                    <p className="text-gray-400 pt-1">
                      Mon To Sun: 09:30 AM - 09:30 PM
                    </p>
                  </div>

                  <h4 className="text-sm font-bold tracking-wide uppercase mt-5 md:mt-6 mb-3">
                    Follow Us On
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                    {SOCIAL_LINKS.map(({ label, href, Icon }) => (
                      <a
                        key={label}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={label}
                        className="w-9 h-9 flex items-center justify-center rounded border border-gray-600 text-gray-300 hover:border-white hover:text-white transition-colors"
                      >
                        <Icon className="text-sm" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Detailed category links */}
          <div className="border-t border-gray-700/80">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-4">
                {detailRows.length === 0 ? (
                  <p className="text-sm text-gray-500">Categories loading…</p>
                ) : (
                  detailRows.map((row) => (
                    <div
                      key={row.id || row.title}
                      className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm leading-relaxed"
                    >
                      <Link
                        href={row.href}
                        className="footer-link footer-link-bold text-sm whitespace-nowrap"
                      >
                        {row.title}
                      </Link>
                      {row.children.length > 0 ? (
                        <span className="text-gray-500">—</span>
                      ) : null}
                      {row.children.map((child, idx) => (
                        <span key={child.href} className="text-gray-400">
                          <Link href={child.href} className="footer-link text-sm">
                            {child.label}
                          </Link>
                          {idx < row.children.length - 1 ? (
                            <span className="mx-1.5 text-gray-600">,</span>
                          ) : null}
                        </span>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 4. Copyright bar */}
          <div className="border-t border-gray-700/80">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-400">
              <p className="text-center sm:text-left">
                © 2023-2026{" "}
                <a
                  href="https://sathya.store"
                  className="font-medium hover:underline"
                  style={{ color: BRAND_RED }}
                >
                  sathya.store
                </a>{" "}
                All Rights Reserved.
              </p>
              <p className="text-center sm:text-right">
                Powered by{" "}
                <a
                  href="https://eywamedia.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold tracking-wide hover:underline"
                  style={{ color: BRAND_RED }}
                >
                  EYWAMEDIA
                </a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
