import fs from "fs";
import path from "path";
import { writeFile } from "fs/promises";

/**
 * AI Image Generation — marketing banner for combo offers.
 * Primary: SVG composite (logo + title + product thumbs + themed background).
 * Optional: OpenAI Images API when OPENAI_API_KEY + OPENAI_COMBO_IMAGE=1.
 */

const THEME_COLORS = {
  festival: { bg1: "#7c2d12", bg2: "#ea580c", accent: "#fbbf24" },
  gaming: { bg1: "#0f172a", bg2: "#7c3aed", accent: "#22d3ee" },
  kitchen: { bg1: "#1c1917", bg2: "#b45309", accent: "#fcd34d" },
  office: { bg1: "#0c4a6e", bg2: "#0369a1", accent: "#e0f2fe" },
  electronics: { bg1: "#111827", bg2: "#c02020", accent: "#93c5fd" },
  lifestyle: { bg1: "#4c0519", bg2: "#be185d", accent: "#fbcfe8" },
  school: { bg1: "#14532d", bg2: "#15803d", accent: "#bbf7d0" },
  wedding: { bg1: "#4a044e", bg2: "#a21caf", accent: "#f5d0fe" },
  default: { bg1: "#1e3a5f", bg2: "#0ea5e9", accent: "#fef3c7" },
};

function detectTheme(purpose = "") {
  const p = purpose.toLowerCase();
  if (/festiv|diwali|navratri|independence|sale|offer/.test(p)) return "festival";
  if (/gam/.test(p)) return "gaming";
  if (/kitchen|cook/.test(p)) return "kitchen";
  if (/office|work/.test(p)) return "office";
  if (/electron|tech|gadget/.test(p)) return "electronics";
  if (/school|student/.test(p)) return "school";
  if (/wedding|marriage/.test(p)) return "wedding";
  if (/life|home/.test(p)) return "lifestyle";
  return "default";
}

function escapeXml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toPublicUrl(imagePath) {
  if (!imagePath) return "";
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  const cleaned = String(imagePath).replace(/^\/+/, "");
  if (cleaned.startsWith("uploads/")) return `/${cleaned}`;
  return `/uploads/products/${cleaned}`;
}

function buildSvgBanner({
  offerTitle,
  brandName,
  purpose,
  companyLogo,
  productImages = [],
}) {
  const theme = THEME_COLORS[detectTheme(purpose)] || THEME_COLORS.default;
  const W = 1200;
  const H = 630;
  const title = escapeXml((offerTitle || purpose || "Combo Offer").slice(0, 60));
  const brand = escapeXml((brandName || "Sathya").slice(0, 40));

  const thumbs = productImages.slice(0, 4).map((img, i) => {
    const href = escapeXml(toPublicUrl(img));
    const n = Math.min(productImages.length, 4);
    const gap = 24;
    const size = 180;
    const totalW = n * size + (n - 1) * gap;
    const startX = (W - totalW) / 2;
    const x = startX + i * (size + gap);
    const y = 280;
    return `
      <rect x="${x - 4}" y="${y - 4}" width="${size + 8}" height="${size + 8}" rx="16" fill="rgba(255,255,255,0.15)"/>
      <image href="${href}" x="${x}" y="${y}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/>
    `;
  });

  const logoHref = companyLogo ? escapeXml(toPublicUrl(companyLogo)) : "";
  const logoBlock = logoHref
    ? `<image href="${logoHref}" x="48" y="36" width="120" height="60" preserveAspectRatio="xMinYMid meet"/>`
    : `<text x="48" y="72" fill="${theme.accent}" font-family="Arial, sans-serif" font-size="28" font-weight="700">${brand}</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.bg1}"/>
      <stop offset="100%" stop-color="${theme.bg2}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="1100" cy="80" r="160" fill="rgba(255,255,255,0.06)"/>
  <circle cx="80" cy="520" r="120" fill="rgba(255,255,255,0.05)"/>
  ${logoBlock}
  <text x="${W / 2}" y="160" text-anchor="middle" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="700">${title}</text>
  <text x="${W / 2}" y="210" text-anchor="middle" fill="${theme.accent}" font-family="Arial, Helvetica, sans-serif" font-size="22">${escapeXml(purpose || "Exclusive Combo")}</text>
  ${thumbs.join("\n")}
  <text x="${W / 2}" y="560" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-family="Arial, Helvetica, sans-serif" font-size="18">Limited period combo offer</text>
</svg>`;
}

async function optionalOpenAiImage({ offerTitle, purpose, brandName }) {
  if (process.env.OPENAI_COMBO_IMAGE !== "1" || !process.env.OPENAI_API_KEY) {
    return null;
  }
  try {
    const prompt = `Professional e-commerce marketing banner for "${offerTitle || purpose}". Brand: ${brandName}. Theme: ${purpose}. Clean product collage style, no text clutter, high quality advertising look, 16:9.`;
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1792x1024",
        response_format: "b64_json",
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) return null;
    return Buffer.from(b64, "base64");
  } catch (e) {
    console.error("OpenAI image gen failed:", e.message);
    return null;
  }
}

/**
 * Generate and persist marketing banner. Returns public-relative path.
 */
export async function generateComboMarketingImage({
  offerTitle,
  purpose,
  brandName,
  companyLogo,
  productImages = [],
}) {
  // Save under products so storefront image paths keep working
  const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
  if (!fs.existsSync(uploadDir)) {
    await fs.promises.mkdir(uploadDir, { recursive: true });
  }

  const stamp = Date.now();
  const aiPng = await optionalOpenAiImage({ offerTitle, purpose, brandName });
  if (aiPng) {
    const filename = `combo-banner-${stamp}.png`;
    await writeFile(path.join(uploadDir, filename), aiPng);
    return filename;
  }

  const svg = buildSvgBanner({
    offerTitle,
    brandName,
    purpose,
    companyLogo,
    productImages,
  });
  const filename = `combo-banner-${stamp}.svg`;
  await writeFile(path.join(uploadDir, filename), svg, "utf8");
  return filename;
}
