const PROMO_WORDS =
  /\b(best|cheapest|no\.?\s*1|number\s*one|#1|top\s*rated|lowest\s*price|must\s*have|amazing|incredible|unbeatable)\b/gi;

function buildPrompt({ category, brand, productCode, productName }) {
  return `You are an e-commerce product content generator.

Generate product details in valid JSON only.

Source product:
{
"Category":"${category}"
"Brand":"${brand}"
"Product Code":"${productCode}"
"Product Name / Description":"${productName}"
}

Instructions:

1. Return ONLY valid JSON. Do not include markdown.
2. Generate SEO-friendly content.
3. Description should be 150-250 words.
4. Highlights should contain 8 bullet points.
5. Key Features should contain 5 bullet points.
6. Meta title maximum 60 characters.
7. Meta description maximum 160 characters.
8. Meta keywords should be comma separated.

9. product_name — generate a clean, customer-facing product title using the source data:
   - 50–100 characters preferred; maximum 150 characters.
   - Brand name MUST appear first (e.g. "Samsung Galaxy S24 Ultra 256GB Black").
   - Include the main product line / model name.
   - Include 2–4 important specifications (storage, size, colour, capacity, connectivity, etc.).
   - Include variant information where applicable (colour, storage, size, etc.).
   - Do NOT repeat the same keyword or spec twice.
   - Do NOT use promotional words: Best, Cheapest, No.1, Number One, Top Rated, Lowest Price, etc.
   - Do NOT use unnecessary punctuation (no exclamation marks, no double spaces, minimal commas).
   - Do NOT use emojis.
   - Do NOT use ALL CAPS — use normal title case.
   - Use the source Product Code and description to infer accurate specs; do not invent model numbers not supported by the source.
   - Do NOT include the Product Code in product_name — it is appended automatically as "-{Product Code}" after generation.

JSON format:

{
  "category":"",
  "brand":"",
  "product_code":"",
  "product_name":"",
  "description":"",
  "highlights":[],
  "key_features":[],
  "meta_title":"",
  "meta_description":"",
  "meta_keywords":""
}`;
}

function stripEmojis(text = "") {
  return String(text).replace(
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu,
    ""
  );
}

function toTitleCaseWord(word) {
  if (!word) return "";
  if (word.length <= 3 && /^[A-Z0-9]+$/.test(word)) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function stripItemCodeSuffix(name, productCode) {
  const code = String(productCode || "").trim();
  if (!code) return String(name || "").trim();
  const suffix = `-${code}`;
  let base = String(name || "").trim();
  if (base.toLowerCase().endsWith(suffix.toLowerCase())) {
    base = base.slice(0, -suffix.length).trim();
  }
  return base;
}

function appendItemCodeSuffix(name, productCode) {
  const code = String(productCode || "").trim();
  if (!code) return String(name || "").trim();

  const suffix = `-${code}`;
  let base = stripItemCodeSuffix(name, code);
  const maxBaseLen = Math.max(1, 150 - suffix.length);

  if (base.length > maxBaseLen) {
    base = base.slice(0, maxBaseLen).replace(/\s+\S*$/, "").trim();
  }

  return `${base}${suffix}`;
}

function normalizeProductName(rawName, { brand = "", productCode = "" } = {}) {
  let name = stripItemCodeSuffix(rawName, productCode);
  name = stripEmojis(name)
    .replace(/[!?]+/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, " ")
    .replace(/\s*-\s*/g, " ")
    .trim();

  name = name.replace(PROMO_WORDS, "").replace(/\s+/g, " ").trim();

  if (/^[A-Z0-9\s\-\/]+$/.test(name.replace(/[^A-Za-z]/g, "")) && /[A-Z]{2,}/.test(name)) {
    name = name
      .split(/\s+/)
      .map((word) => {
        if (/^[A-Z0-9]{2,5}$/.test(word)) return word;
        return toTitleCaseWord(word);
      })
      .join(" ");
  }

  const brandTrimmed = String(brand || "").trim();
  if (brandTrimmed) {
    const brandNorm = brandTrimmed.toLowerCase();
    const nameLower = name.toLowerCase();
    if (!nameLower.startsWith(brandNorm)) {
      name = `${brandTrimmed} ${name}`.trim();
    }
  }

  const tokens = name.split(/\s+/).filter(Boolean);
  const seen = new Set();
  const deduped = [];
  for (const token of tokens) {
    const key = token.toLowerCase().replace(/[^\w]/g, "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(token);
  }
  name = deduped.join(" ").replace(/\s+/g, " ").trim();

  return appendItemCodeSuffix(name, productCode);
}

export function formatGeneratedProductName(rawName, { brand = "", productCode = "" } = {}) {
  return normalizeProductName(rawName, { brand, productCode });
}

function parseJsonContent(raw) {
  if (!raw) return null;
  let text = String(raw).trim();
  text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    text = text.slice(start, end + 1);
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractResponsesText(result) {
  if (result?.output_text) return result.output_text;
  const outputs = Array.isArray(result?.output) ? result.output : [];
  for (const item of outputs) {
    const contents = Array.isArray(item?.content) ? item.content : [];
    for (const part of contents) {
      if (part?.text) return part.text;
    }
  }
  return null;
}

function normalizeContent(parsed, fallback = {}) {
  if (!parsed || typeof parsed !== "object") return null;
  const highlights = Array.isArray(parsed.highlights)
    ? parsed.highlights.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  const keyFeatures = Array.isArray(parsed.key_features)
    ? parsed.key_features.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  const brand = String(parsed.brand || fallback.brand || "").trim();
  const product_code = String(parsed.product_code || fallback.productCode || "").trim();
  const rawProductName = String(parsed.product_name || fallback.productName || "").trim();
  const product_name = normalizeProductName(rawProductName, { brand, productCode: product_code });

  return {
    category: String(parsed.category || fallback.category || "").trim(),
    brand,
    product_code,
    product_name,
    description: String(parsed.description || "").trim(),
    highlights,
    key_features: keyFeatures,
    meta_title: String(parsed.meta_title || "").trim().slice(0, 60),
    meta_description: String(parsed.meta_description || "").trim().slice(0, 160),
    meta_keywords: String(parsed.meta_keywords || "").trim(),
  };
}

async function generateViaResponsesApi({ apiKey, model, prompt }) {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: prompt,
      text: {
        format: {
          type: "json_object",
        },
      },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error?.message || `Responses API ${res.status}`;
    throw new Error(message);
  }

  return parseJsonContent(extractResponsesText(data));
}

async function generateViaChatCompletions({ apiKey, model, prompt }) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an e-commerce product content generator. Return ONLY valid JSON. Product names must start with brand, be 50-100 chars preferred (max 150), title case, no promo words, no emojis, no ALL CAPS.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error?.message || `Chat Completions API ${res.status}`;
    throw new Error(message);
  }

  return parseJsonContent(data?.choices?.[0]?.message?.content);
}

export async function generateProductAiContent({
  category = "",
  brand = "",
  productCode = "",
  productName = "",
} = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const prompt = buildPrompt({ category, brand, productCode, productName });
  const model = process.env.OPENAI_PRODUCT_MODEL || "gpt-4o";
  const fallback = { category, brand, productCode, productName };

  try {
    const parsed = await generateViaResponsesApi({ apiKey, model, prompt });
    const content = normalizeContent(parsed, fallback);
    if (content) return { ...content, _source: "openai-responses" };
  } catch (err) {
    console.warn("OpenAI responses API failed, falling back:", err.message);
  }

  const parsed = await generateViaChatCompletions({ apiKey, model, prompt });
  const content = normalizeContent(parsed, fallback);
  if (!content) {
    throw new Error("OpenAI did not return valid product JSON");
  }
  return { ...content, _source: "openai-chat" };
}
