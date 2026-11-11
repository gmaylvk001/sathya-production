import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import ExchangeOfferCondition from "@/models/ExchangeOfferCondition";
import Category from "@/models/ecom_category_info";
import Brand from "@/models/ecom_brand_info";
import Product from "@/models/product";
import StoreZone from "@/models/store_zones";
import { collectDescendantIds, isAnyValue, uniqueSorted } from "@/lib/exchangeOfferMatch";

const DEFAULT_CONDITIONS = ["Working", "Not Working"];

async function brandsForCategoryIds(categoryIds) {
  if (!categoryIds.length) return [];
  const objectIds = categoryIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const brandIds = await Product.distinct("brand", {
    status: "Active",
    brand: { $exists: true, $nin: [null, ""] },
    $or: [{ category: { $in: [...categoryIds, ...objectIds] } }, { sub_category: { $in: categoryIds } }],
  });

  const validIds = brandIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  if (!validIds.length) return [];

  const brands = await Brand.find({ _id: { $in: validIds }, status: "Active" })
    .select("brand_name")
    .sort({ brand_name: 1 })
    .lean();
  return brands.map((brand) => brand.brand_name);
}

export async function GET(req) {
  try {
    await dbConnect();
    const categoryName = new URL(req.url).searchParams.get("categoryName");

    const [categories, zones, offerValues] = await Promise.all([
      Category.find({ status: "Active" }).select("_id category_name parentid").sort({ category_name: 1 }).lean(),
      StoreZone.find().select("zonename status").sort({ zonename: 1 }).lean(),
      ExchangeOfferCondition.aggregate([
        {
          $group: {
            _id: null,
            types: { $addToSet: "$type" },
            conditions: { $addToSet: "$condition" },
            zones: { $addToSet: "$zone" },
          },
        },
      ]),
    ]);

    const saved = offerValues[0] || { types: [], conditions: [], zones: [] };
    const activeZones = zones
      .filter((zone) => Number(zone.status) === 1 || zone.status === "Active")
      .map((zone) => zone.zonename);

    let childTypes = [];
    let brandNames = [];
    const selectedCategory =
      categoryName && !isAnyValue(categoryName)
        ? categories.find(
            (item) =>
              String(item.category_name).trim().toLowerCase() === String(categoryName).trim().toLowerCase()
          )
        : null;

    if (selectedCategory?._id) {
      const categoryIds = collectDescendantIds(categories, selectedCategory._id);
      childTypes = categories
        .filter((item) => String(item.parentid) === String(selectedCategory._id))
        .map((item) => item.category_name);
      brandNames = await brandsForCategoryIds(categoryIds);
    } else {
      const allBrands = await Brand.find({ status: "Active" }).select("brand_name").sort({ brand_name: 1 }).lean();
      brandNames = allBrands.map((item) => item.brand_name);
    }

    const savedTypesForCategory = selectedCategory
      ? (
          await ExchangeOfferCondition.distinct("type", {
            $or: [
              { categoryName: new RegExp(`^${String(categoryName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
              { categoryName: { $regex: /^any$/i } },
            ],
          })
        ).filter((item) => !isAnyValue(item))
      : (saved.types || []).filter((item) => !isAnyValue(item));

    return NextResponse.json({
      success: true,
      data: {
        categories: ["ANY", ...uniqueSorted(categories.map((item) => item.category_name))],
        brands: ["ANY", ...uniqueSorted(brandNames)],
        types: ["ANY", ...uniqueSorted([...childTypes, ...savedTypesForCategory])],
        conditions: [
          "ANY",
          ...uniqueSorted([
            ...DEFAULT_CONDITIONS,
            ...(saved.conditions || []).filter((item) => !isAnyValue(item)),
          ]),
        ],
        zones: [
          "ANY",
          ...uniqueSorted([
            ...activeZones,
            ...(saved.zones || []).filter((item) => !isAnyValue(item)),
          ]),
        ],
      },
    });
  } catch (error) {
    console.error("Error fetching exchange offer form options:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load dropdown options" },
      { status: 500 }
    );
  }
}
