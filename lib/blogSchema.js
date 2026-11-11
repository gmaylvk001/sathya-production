export const BLOG_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.sathya.store").replace(/\/+$/, "");
export const BLOG_DEFAULT_AUTHOR = "Sathya Editorial Team";
export const BLOG_PUBLISHER = {
  "@type": "Organization",
  name: "Sathya Store",
  logo: {
    "@type": "ImageObject",
    url: `${BLOG_SITE_URL}/new_frontend/assets/img/sathya.webp`,
  },
};
export const SCHEMA_INVALID_MESSAGE = "Schema JSON is invalid. Please paste valid JSON-LD.";

function toText(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function stripHtml(html) {
  return toText(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toIsoDate(value) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export function absoluteUrl(path) {
  const text = toText(path);
  if (!text) return "";
  if (/^https?:\/\//i.test(text)) return text;
  return `${BLOG_SITE_URL}/${text.replace(/^\/+/, "")}`;
}

export function blogDetailUrl(slug) {
  return `${BLOG_SITE_URL}/blog-listing/${toText(slug)}`;
}

/** Takes the JSON out of a pasted <script type="application/ld+json"> block. */
export function extractJsonLd(raw) {
  const text = toText(raw);
  const match = text.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
  return (match ? match[1] : text).trim();
}

/**
 * Exist normalizeSchemaJson():
 * empty → null (auto schema), script tags stripped, invalid → error, valid → pretty-printed.
 */
export function normalizeSchemaJson(raw) {
  const json = extractJsonLd(raw);
  if (!json) return { ok: true, value: null };
  try {
    const parsed = JSON.parse(json);
    if (parsed === null || typeof parsed !== "object") {
      return { ok: false, error: SCHEMA_INVALID_MESSAGE };
    }
    return { ok: true, value: JSON.stringify(parsed, null, 2) };
  } catch {
    return { ok: false, error: SCHEMA_INVALID_MESSAGE };
  }
}

export function buildAutoBlogPosting(blog) {
  const url = blogDetailUrl(blog.slug);
  const images = [blog.bannerImage, blog.featuredImage].map(absoluteUrl).filter(Boolean);
  const description = toText(blog.metaDescription) || stripHtml(blog.shortDescription);
  const datePublished = toIsoDate(blog.publishDate || blog.createdAt);
  const dateModified = toIsoDate(blog.updatedAt || blog.publishDate || blog.createdAt);

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: toText(blog.blogTitle),
    ...(description ? { description } : {}),
    ...(images.length ? { image: [...new Set(images)] } : {}),
    author: { "@type": "Person", name: toText(blog.author) || BLOG_DEFAULT_AUTHOR },
    publisher: BLOG_PUBLISHER,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    ...(datePublished ? { datePublished } : {}),
    ...(dateModified ? { dateModified } : {}),
  };
}

export function buildFaqPage(faqs) {
  const items = (faqs || [])
    .map((f) => ({ question: stripHtml(f?.question), answer: stripHtml(f?.answer) }))
    .filter((f) => f.question && f.answer);
  if (!items.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

function hasType(node, type) {
  if (!node || typeof node !== "object") return false;
  if (Array.isArray(node)) return node.some((n) => hasType(n, type));
  const t = node["@type"];
  if (t === type || (Array.isArray(t) && t.includes(type))) return true;
  return Array.isArray(node["@graph"]) && node["@graph"].some((n) => hasType(n, type));
}

/**
 * Exist StoreBlog::schemaScripts():
 * empty schema_json → auto BlogPosting; filled → custom JSON (object / array / @graph);
 * plus auto FAQPage when the blog has FAQs and the JSON has no FAQPage.
 */
export function schemaScripts(blog, faqs = []) {
  let items = [];
  const custom = extractJsonLd(blog?.schemaJson);

  if (custom) {
    try {
      const parsed = JSON.parse(custom);
      if (Array.isArray(parsed)) items = parsed.filter((n) => n && typeof n === "object");
      else if (parsed && typeof parsed === "object") items = [parsed];
    } catch {
      items = [];
    }
  }

  if (!items.length) items = [buildAutoBlogPosting(blog)];

  if (!hasType(items, "FAQPage")) {
    const faqPage = buildFaqPage(faqs);
    if (faqPage) items.push(faqPage);
  }

  return items;
}

/** HTML-safe JSON for <script> (same intent as JSON_HEX_TAG). */
export function serializeJsonLd(item) {
  return JSON.stringify(item)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
