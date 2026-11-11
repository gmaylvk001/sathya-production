/**
 * AI Content Generation for Combo Offers.
 * Uses OpenAI when OPENAI_API_KEY is set; otherwise deterministic template engine
 * built from selected product schema fields (never invents EAN/SKU/IDs).
 */

const EDITABLE_FIELDS = [
  "name",
  "shortDescription",
  "longDescription",
  "metaTitle",
  "metaDescription",
  "metaKeywords",
  "highlights",
  "keyBenefits",
  "whyBuy",
  "tagline",
  "offerTitle",
  "ctaContent",
  "socialCaption",
];

function stripHtml(value = "") {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickUsefulProductFields(product) {
  return {
    name: product?.name || "",
    brand: product?.brand || product?.brand_name || "",
    description: stripHtml(product?.description || ""),
    short_description: product?.short_description || "",
    price: product?.special_price || product?.price || 0,
    highlights: product?.highlights || product?.key_features || [],
    features: product?.features || [],
    warranty: product?.warranty || "",
    category: product?.category_name || product?.root_category || "",
  };
}

function joinProductNames(products) {
  const names = products.map((p) => p.name).filter(Boolean);
  if (names.length <= 1) return names[0] || "Combo";
  if (names.length === 2) return `${names[0]} + ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

function templateGenerate({ products, purpose, brandName }) {
  const useful = products.map(pickUsefulProductFields);
  const names = joinProductNames(useful);
  const purposeClean = (purpose || "Special Combo Offer").trim();
  const brand = (brandName || "Sathya").trim();
  const offerTitle = `${purposeClean}`;
  const name = `${purposeClean} — ${names}`.slice(0, 180);
  const tagline = `Save more with the ${purposeClean} from ${brand}`;
  const shortDescription = `Exclusive ${purposeClean} bundling ${useful.length} products: ${names}. Curated for value, convenience, and performance.`;
  const longDescription = [
    `Introducing the ${offerTitle} by ${brand} — a carefully curated combo of ${useful.length} products designed around: ${purposeClean}.`,
    "",
    "Included products:",
    ...useful.map(
      (p) =>
        `• ${p.name}${p.brand ? ` (${p.brand})` : ""}${
          p.short_description
            ? ` — ${String(p.short_description).slice(0, 120)}`
            : ""
        }`
    ),
    "",
    `Buy together and enjoy exclusive combo pricing. Perfect for ${purposeClean.toLowerCase()}.`,
  ].join("\n");

  const highlights = useful
    .map((p) => p.name)
    .filter(Boolean)
    .slice(0, 6)
    .map((n) => `Includes ${n}`);

  if (highlights.length < 3) {
    highlights.push("Exclusive combo pricing", "Single checkout convenience");
  }

  const keyBenefits = [
    `Everything you need for ${purposeClean}`,
    "Better value than buying separately",
    "Hand-picked complementary products",
    `Trusted ${brand} combo bundle`,
  ];

  const whyBuy = `Choose this ${purposeClean} combo to get ${names} in one package — save time, money, and enjoy a complete setup without shopping separately.`;

  const metaTitle = `${offerTitle} | ${brand} Combo Offer`.slice(0, 60);
  const metaDescription = shortDescription.slice(0, 160);
  const metaKeywords = [
    purposeClean,
    "combo offer",
    "bundle",
    brand,
    ...useful.map((p) => p.name).slice(0, 5),
  ]
    .filter(Boolean)
    .join(", ");

  const ctaContent = `Grab the ${purposeClean} now — limited stock!`;
  const socialCaption = `${tagline} Shop the ${offerTitle} today at ${brand}. #ComboOffer #${purposeClean.replace(
    /\s+/g,
    ""
  )}`;

  return {
    name,
    shortDescription,
    longDescription,
    metaTitle,
    metaDescription,
    metaKeywords,
    highlights,
    keyBenefits,
    whyBuy,
    tagline,
    offerTitle,
    ctaContent,
    socialCaption,
    _source: "template",
  };
}

async function openAiGenerate({ products, purpose, brandName }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const useful = products.map(pickUsefulProductFields);
  const system = `You are an e-commerce marketing copywriter for combo/bundle offers.
Return ONLY valid JSON with keys: ${EDITABLE_FIELDS.join(", ")}.
highlights and keyBenefits must be string arrays.
Do NOT invent SKU, EAN, product codes, or database IDs.
Keep metaTitle ≤ 60 chars, metaDescription ≤ 160 chars.
longDescription and shortDescription must be plain text only — NO HTML tags.`;

  const user = JSON.stringify({
    purpose,
    brandName,
    products: useful,
  });

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_COMBO_MODEL || "gpt-4o-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("OpenAI combo content error:", res.status, errText);
    return null;
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    const out = {};
    for (const key of EDITABLE_FIELDS) {
      if (parsed[key] !== undefined) out[key] = parsed[key];
    }
    if (out.longDescription) out.longDescription = stripHtml(out.longDescription);
    if (out.shortDescription) {
      out.shortDescription = stripHtml(out.shortDescription);
    }
    out._source = "openai";
    return out;
  } catch {
    return null;
  }
}

/**
 * Generate marketing content for a combo.
 */
export async function generateComboContent({
  products = [],
  purpose = "",
  brandName = "",
}) {
  if (!Array.isArray(products) || products.length < 2) {
    throw new Error("At least 2 products are required for AI content generation");
  }

  try {
    const ai = await openAiGenerate({ products, purpose, brandName });
    if (ai) return ai;
  } catch (e) {
    console.error("AI content generation failed, using template:", e.message);
  }

  return templateGenerate({ products, purpose, brandName });
}

export { EDITABLE_FIELDS, pickUsefulProductFields, stripHtml };
