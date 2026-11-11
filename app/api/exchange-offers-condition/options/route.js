import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import ExchangeOfferCondition from "@/models/ExchangeOfferCondition";
import Brand from "@/models/ecom_brand_info";
import Category from "@/models/ecom_category_info";
import Product from "@/models/product";
import {
  categoryMatches,
  collectDescendantIds,
  isAnyValue,
  uniqueSorted,
} from "@/lib/exchangeOfferMatch";

const DEFAULT_CONDITIONS = ["Working", "Not Working"];

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const categoryName = searchParams.get("categoryName");

    if (!categoryName) {
      return NextResponse.json(
        { success: false, error: "categoryName is required" },
        { status: 400 }
      );
    }

    const records = await ExchangeOfferCondition.find({ status: "Active" }).lean();
    const matching = records.filter((record) => categoryMatches(record.categoryName, categoryName));

    let types = uniqueSorted(matching.map((record) => record.type).filter((item) => !isAnyValue(item)));
    let brands = uniqueSorted(matching.map((record) => record.brand).filter((item) => !isAnyValue(item)));
    let conditions = uniqueSorted(
      matching.map((record) => record.condition).filter((item) => !isAnyValue(item))
    );

    if (matching.some((record) => isAnyValue(record.brand))) {
      const allCategories = await Category.find({ status: "Active" })
        .select("_id category_name parentid")
        .lean();
      const selectedNames = String(categoryName)
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
      const matchedCategories = allCategories.filter((item) =>
        selectedNames.includes(String(item.category_name || "").trim().toLowerCase())
      );
      const categoryIds = [
        ...new Set(matchedCategories.flatMap((item) => collectDescendantIds(allCategories, item._id))),
      ];
      const objectIds = categoryIds
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
      const brandIds = categoryIds.length
        ? await Product.distinct("brand", {
            status: "Active",
            brand: { $exists: true, $nin: [null, ""] },
            $or: [
              { category: { $in: [...categoryIds, ...objectIds] } },
              { sub_category: { $in: categoryIds } },
            ],
          })
        : [];
      const validIds = brandIds
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
      const catalogBrands = validIds.length
        ? await Brand.find({ _id: { $in: validIds }, status: "Active" }).select("brand_name").lean()
        : [];
      brands = uniqueSorted([...brands, ...catalogBrands.map((item) => item.brand_name)]);
    }

    if (matching.some((record) => isAnyValue(record.type))) {
      types = uniqueSorted([
        ...types,
        ...records.map((record) => record.type).filter((item) => !isAnyValue(item)),
      ]);
    }

    if (matching.some((record) => isAnyValue(record.condition))) {
      conditions = uniqueSorted([...DEFAULT_CONDITIONS, ...conditions]);
    }

    return NextResponse.json({
      success: true,
      data: {
        types,
        brands,
        conditions,
        hasOffers: matching.length > 0,
        maxDiscount: matching.reduce((max, record) => Math.max(max, Number(record.price) || 0), 0),
      },
    });
  } catch (error) {
    console.error("Error fetching Exchange Offer Options:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
