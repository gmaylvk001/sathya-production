"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FiChevronRight } from "react-icons/fi";
import { buildBrandHref, buildCategoryHref } from "@/lib/categoryPageComponents/categoryHref";

const BRAND_LETTER_GROUPS = [
  ["A", "B"],
  ["C", "D", "E", "F", "G", "H"],
  ["I", "J", "K", "L"],
  ["M", "N", "O"],
  ["P", "Q", "R", "S"],
  ["T", "U", "V", "W", "X", "Y", "Z"],
];

const PANEL_W = 250;
const BRAND_GROUP_W = 180;
const SUB_W = 230;
const LEAF_W = 230;

// Delay before a hovered row replaces the open flyout, so the pointer can cross
// neighbouring rows on its way into the flyout without closing it.
const SWITCH_DELAY_MS = 120;
const LEAVE_CLOSE_DELAY_MS = 350;

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");
}

function isActiveCategory(cat) {
  return cat && (cat.status == null || String(cat.status).toLowerCase() === "active");
}

function brandNode(brand) {
  return {
    key: `brand-${brand._id || brand.brand_name}`,
    label: brand.brand_name,
    href: buildBrandHref(brand.brand_slug || slugify(brand.brand_name), Boolean(brand.hasOverview)),
  };
}

function Heading({ children, red }) {
  return (
    <div
      className={`px-6 pt-3 pb-1.5 text-[12px] font-bold uppercase tracking-[0.06em] ${
        red ? "text-[#C4161D]" : "text-[#222]"
      }`}
    >
      {children}
    </div>
  );
}

function MenuRow({ node, active, onHover, onClick }) {
  const expandable = Array.isArray(node.children);
  return (
    <Link
      href={node.href}
      onMouseEnter={(e) => onHover(node, e.currentTarget)}
      onClick={(e) => onClick(e, node)}
      className={`flex items-center justify-between gap-3 px-6 py-[9px] text-[12px] font-bold uppercase leading-snug tracking-[0.06em] no-underline transition-colors hover:text-[#C4161D] ${
        active ? "text-[#C4161D]" : "text-[#333]"
      }`}
    >
      <span className="min-w-0 break-words">{node.label}</span>
      {expandable ? (
        <FiChevronRight size={13} strokeWidth={3} className="shrink-0 text-[#333]" />
      ) : null}
    </Link>
  );
}

/** Small box beside the hovered row; shifts up only when it would run off-screen. */
function Flyout({ anchorTop, left, width, maxHeight, onMouseEnter, onScroll, children }) {
  const ref = useRef(null);
  const [top, setTop] = useState(anchorTop);

  useLayoutEffect(() => {
    const height = ref.current?.offsetHeight || 0;
    setTop(Math.max(0, Math.min(anchorTop, maxHeight - height)));
  });

  return (
    <div
      ref={ref}
      onMouseEnter={onMouseEnter}
      onScroll={onScroll}
      className="absolute overflow-y-auto border border-[#e5e5e5] bg-white py-1.5 shadow-[3px_4px_12px_rgba(0,0,0,0.12)]"
      style={{ top, left, width, maxHeight }}
    >
      {children}
    </div>
  );
}

/**
 * Desktop "Menu" dropdown for the red header bar: a compact list that hangs under
 * the Menu button, with cascading flyouts beside the hovered row. It never covers
 * or dims the page. Render it inside the (position: relative) red bar.
 */
export default function HeaderMenuSidebar({
  open,
  onClose,
  categories = [],
  resolveCategoryHref,
}) {
  const [level1, setLevel1] = useState(null); // { key, top } of the open first-level row
  const [level2, setLevel2] = useState(null); // { key, top } of the open second-level row
  const [brands, setBrands] = useState([]);
  const [brandsStatus, setBrandsStatus] = useState("idle"); // idle | loading | done | error
  const [maxH, setMaxH] = useState(480);

  const wrapRef = useRef(null);
  const switchTimers = useRef([null, null]);
  const leaveTimer = useRef(null);
  const lastPointerType = useRef("mouse");
  const touchOpenedKey = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const clearTimers = () => {
      clearTimeout(switchTimers.current[0]);
      clearTimeout(switchTimers.current[1]);
      clearTimeout(leaveTimer.current);
    };
    if (!open) {
      clearTimers();
      setLevel1(null);
      setLevel2(null);
      // A failed brand load is retried the next time the menu opens.
      setBrandsStatus((status) => (status === "error" ? "idle" : status));
      touchOpenedKey.current = null;
      return;
    }
    const onKey = (e) => {
      if (e.key === "Escape") onCloseRef.current?.();
    };
    const onPointerDown = (e) => {
      const target = e.target;
      if (wrapRef.current?.contains(target)) return;
      if (target?.closest?.("[data-sathya-menu-toggle]")) return;
      onCloseRef.current?.();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
      clearTimers();
    };
  }, [open]);

  // Keep the list inside the viewport: it scrolls instead of running off-screen.
  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const top = wrapRef.current?.getBoundingClientRect().top ?? 0;
      setMaxH(Math.max(240, window.innerHeight - top - 12));
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [open]);

  useEffect(() => {
    if (!open || level1?.key !== "brands" || brandsStatus !== "idle") return;
    setBrandsStatus("loading");
    fetch("/api/brand/get", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data?.brands) ? data.brands : [];
        setBrands(
          [...list].sort((a, b) =>
            String(a?.brand_name || "").localeCompare(String(b?.brand_name || ""), undefined, {
              sensitivity: "base",
            })
          )
        );
        setBrandsStatus("done");
      })
      .catch(() => setBrandsStatus("error"));
  }, [open, level1?.key, brandsStatus]);

  const sections = useMemo(() => {
    const categoryHref = (slugs, id, level) =>
      typeof resolveCategoryHref === "function"
        ? resolveCategoryHref(slugs, id, level)
        : buildCategoryHref(slugs, false, level);

    const categoryNode = (cat, level, parentSlugs) => {
      const slugs = [...parentSlugs, cat.category_slug].filter(Boolean);
      let children =
        level < 2
          ? (cat.subcategories || [])
              .filter(isActiveCategory)
              .map((sub) => categoryNode(sub, level + 1, slugs))
          : [];
      if (level === 0 && children.length === 0) {
        children = (cat.brands || []).slice(0, 40).map(brandNode);
      }
      return {
        key: `cat-${cat._id}`,
        label: cat.category_name,
        href: categoryHref(slugs, cat._id, level),
        children: children.length ? children : undefined,
      };
    };

    const brandGroups = BRAND_LETTER_GROUPS.map((letters) => ({
      key: `brand-group-${letters.join("")}`,
      label: letters.join(" "),
      href: "/brands",
      children: brands
        .filter((b) => letters.includes(String(b?.brand_name || "").trim().charAt(0).toUpperCase()))
        .map(brandNode),
    }));

    return [
      {
        title: "Only at Sathya",
        red: true,
        items: [
          { key: "brands", label: "Brands", href: "/brands", children: brandGroups, width: BRAND_GROUP_W },
          { key: "deals", label: "Deals", href: "/deals-offer" },
          // { key: "open-box", label: "Open Box", href: "/open-box" },
        ],
      },
      {
        title: "Shop by Category",
        red: true,
        items: (Array.isArray(categories) ? categories : [])
          .filter(isActiveCategory)
          .map((cat) => categoryNode(cat, 0, [])),
      },
    ];
  }, [categories, brands, resolveCategoryHref]);

  if (!open) return null;

  const level1Node = level1
    ? sections.flatMap((s) => s.items).find((n) => n.key === level1.key)
    : null;
  const level2Node =
    level2 && level1Node?.children ? level1Node.children.find((n) => n.key === level2.key) : null;
  const level1Width = level1Node?.width || SUB_W;

  const applyLevel = (level, entry) => {
    if (level === 0) {
      setLevel1(entry);
      setLevel2(null);
    } else {
      setLevel2(entry);
    }
  };

  const hoverRow = (level, node, el) => {
    const wrapTop = wrapRef.current?.getBoundingClientRect().top ?? 0;
    const entry = Array.isArray(node.children)
      ? { key: node.key, top: el.getBoundingClientRect().top - wrapTop }
      : null;
    const current = level === 0 ? level1 : level2;
    clearTimeout(switchTimers.current[level]);
    if (!current) {
      applyLevel(level, entry);
    } else if (current.key !== entry?.key) {
      switchTimers.current[level] = setTimeout(() => applyLevel(level, entry), SWITCH_DELAY_MS);
    }
  };

  // Touch has no hover: the first tap on a row with children opens it, the second follows the link.
  const clickRow = (e, level, node) => {
    if (
      lastPointerType.current === "touch" &&
      Array.isArray(node.children) &&
      touchOpenedKey.current !== node.key
    ) {
      e.preventDefault();
      touchOpenedKey.current = node.key;
      clearTimeout(switchTimers.current[level]);
      const wrapTop = wrapRef.current?.getBoundingClientRect().top ?? 0;
      applyLevel(level, {
        key: node.key,
        top: e.currentTarget.getBoundingClientRect().top - wrapTop,
      });
      return;
    }
    onClose?.();
  };

  const emptyBrandsText =
    brandsStatus === "done"
      ? "No brands"
      : brandsStatus === "error"
        ? "Could not load brands"
        : "Loading…";

  return (
    <div
      ref={wrapRef}
      role="navigation"
      aria-label="Main menu"
      className="absolute left-0 top-full z-[60] hidden sm:block"
      onPointerDown={(e) => {
        lastPointerType.current = e.pointerType || "mouse";
      }}
      onMouseEnter={() => clearTimeout(leaveTimer.current)}
      onMouseLeave={() => {
        clearTimeout(leaveTimer.current);
        leaveTimer.current = setTimeout(() => onCloseRef.current?.(), LEAVE_CLOSE_DELAY_MS);
      }}
    >
      <div
        className="overflow-y-auto border border-t-0 border-[#e5e5e5] bg-white py-2 shadow-[0_8px_18px_rgba(0,0,0,0.14)]"
        style={{ width: PANEL_W, maxHeight: maxH }}
        onScroll={() => {
          if (level1) applyLevel(0, null);
        }}
      >
        {sections.map((section) => (
          <div key={section.title}>
            <Heading red={section.red}>{section.title}</Heading>
            {section.items.map((node) => (
              <MenuRow
                key={node.key}
                node={node}
                active={level1?.key === node.key}
                onHover={(n, el) => hoverRow(0, n, el)}
                onClick={(e, n) => clickRow(e, 0, n)}
              />
            ))}
          </div>
        ))}
      </div>

      {level1Node?.children ? (
        <Flyout
          anchorTop={level1.top}
          left={PANEL_W - 1}
          width={level1Width}
          maxHeight={maxH}
          onMouseEnter={() => clearTimeout(switchTimers.current[0])}
          onScroll={() => {
            if (level2) setLevel2(null);
          }}
        >
          {level1Node.children.map((node) => (
            <MenuRow
              key={node.key}
              node={node}
              active={level2?.key === node.key}
              onHover={(n, el) => hoverRow(1, n, el)}
              onClick={(e, n) => clickRow(e, 1, n)}
            />
          ))}
        </Flyout>
      ) : null}

      {level2Node?.children ? (
        <Flyout
          anchorTop={level2.top}
          left={PANEL_W + level1Width - 2}
          width={LEAF_W}
          maxHeight={maxH}
          onMouseEnter={() => {
            clearTimeout(switchTimers.current[0]);
            clearTimeout(switchTimers.current[1]);
          }}
        >
          {level2Node.children.length === 0 ? (
            <div className="px-6 py-[9px] text-[12px] text-[#777]">{emptyBrandsText}</div>
          ) : (
            level2Node.children.map((node) => (
              <MenuRow
                key={node.key}
                node={node}
                active={false}
                onHover={() => {}}
                onClick={(e, n) => clickRow(e, 2, n)}
              />
            ))
          )}
        </Flyout>
      ) : null}
    </div>
  );
}
