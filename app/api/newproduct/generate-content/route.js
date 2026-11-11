import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ProductAll from "@/models/Product_all";
import Category from "@/models/ecom_category_info";
import Brand from "@/models/ecom_brand_info";
import { generateProductAiContent, formatGeneratedProductName } from "@/lib/productContent/aiContentService";
import { slugifyProductName, uniqueProductSlug } from "@/lib/productSlug";

function normalizeName(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function matchByName(items, name, getName) {
  const needle = normalizeName(name);
  if (!needle) return null;

  const exact = items.find((item) => normalizeName(getName(item)) === needle);
  if (exact) return exact;

  return (
    items.find((item) => {
      const hay = normalizeName(getName(item));
      return hay.includes(needle) || needle.includes(hay);
    }) || null
  );
}

function isLeafCategory(category, categories) {
  const id = category?._id?.toString();
  if (!id) return false;
  return !categories.some((item) => String(item.parentid) === id);
}

function matchCategory(categories, name) {
  const needle = normalizeName(name);
  if (!needle) return null;

  const exactMatches = categories.filter(
    (cat) => normalizeName(cat.category_name) === needle
  );
  const leafExact = exactMatches.find((cat) => isLeafCategory(cat, categories));
  if (leafExact) return leafExact;
  if (exactMatches[0]) return exactMatches[0];

  const fuzzy = categories.filter((cat) => {
    const hay = normalizeName(cat.category_name);
    return hay.includes(needle) || needle.includes(hay);
  });
  return fuzzy.find((cat) => isLeafCategory(cat, categories)) || fuzzy[0] || null;
}

function getParentCategoryId(category, categories) {
  if (!category?.parentid || category.parentid === "none") return "";
  const parent = categories.find(
    (item) => item._id.toString() === String(category.parentid)
  );
  return parent?._id?.toString() || "";
}

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json().catch(() => ({}));
    const id = body.id;
    if (!id) {
      return NextResponse.json({ error: "Product id is required" }, { status: 400 });
    }

    const source = await ProductAll.findById(id).lean();
    if (!source) {
      return NextResponse.json({ error: "New product not found" }, { status: 404 });
    }

    const categoryName = source.group_property || source.category || "";
    const brandName = source.brand || "";
    const productCode = source.item_code || source.brand_code || "";
    const productName =
      source.name || source.item_description || source.item_code || "";

    let content = null;
    let aiError = null;
    try {
      content = await generateProductAiContent({
        category: categoryName,
        brand: brandName,
        productCode,
        productName,
      });
    } catch (err) {
      aiError = err.message;
      console.error("Product AI content error:", err);
    }

    const [categories, brands] = await Promise.all([
      Category.find().lean(),
      Brand.find().lean(),
    ]);

    const matchedCategory = matchCategory(
      categories,
      content?.category || categoryName
    );
    const matchedBrand = matchByName(
      brands,
      content?.brand || brandName,
      (item) => item.brand_name
    );

    const finalName = content?.product_name || productName;
    const slug = await uniqueProductSlug(finalName);

    return NextResponse.json({
      success: true,
      aiError,
      source,
      content: content || {
        category: categoryName,
        brand: brandName,
        product_code: productCode,
        product_name: formatGeneratedProductName(productName, {
          brand: brandName,
          productCode,
        }),
        description: "",
        highlights: [],
        key_features: [],
        meta_title: "",
        meta_description: "",
        meta_keywords: "",
      },
      mapped: {
        slug: slugifyProductName(finalName) || slug,
        uniqueSlug: slug,
        categoryId: matchedCategory?._id?.toString() || "",
        parentCategoryId: getParentCategoryId(matchedCategory, categories),
        brandId: matchedBrand?._id?.toString() || "",
      },
    });
  } catch (error) {
    console.error("Error generating new product content:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate product content" },
      { status: 500 }
    );
  }
}
