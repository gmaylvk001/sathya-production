import dbConnect from "@/lib/db";
import ecom_category_info from "@/models/ecom_category_info";
import { resolveCategoryBySlug } from "@/lib/resolveCategorySlug";
import Product from "@/models/product";
import Brand from "@/models/ecom_brand_info"; 
import Filter from "@/models/ecom_filter_infos";
import FilterGroup from "@/models/ecom_filter_group_infos";
import CategoryFilter from "@/models/ecom_categoryfilters_infos";
import mongoose from "mongoose";

async function getCategoryTree(parentId) {
  const categories = await ecom_category_info
    .find({ parentid: parentId })
    .sort({ position: 1, category_name: 1 })
    .lean();
  for (const category of categories) {
    category.subCategories = await getCategoryTree(category._id);
  }
  return categories;
}

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { slug } = await params;
    const parentSlug = new URL(request.url).searchParams.get("parent") || null;

    const main_category = await resolveCategoryBySlug(slug, parentSlug);
    if (!main_category) {
      return Response.json({ error: "Main Category not found" }, { status: 404 });
    }

    return buildCategoryResponse(main_category, getCategoryTree, {
      Product,
      Brand,
      Filter,
      FilterGroup,
      CategoryFilter,
      mongoose,
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}

async function buildCategoryResponse(main_category, getCategoryTree, models) {
  const { Product, Brand, Filter, FilterGroup, CategoryFilter, mongoose } =
    models;

    const categoryTree = await getCategoryTree(main_category._id);

    function getAllCategoryIds(categories) {
      return categories.reduce((acc, category) => {
        acc.push(category._id);
        if (category.subCategories?.length > 0) {
          acc.push(...getAllCategoryIds(category.subCategories));
        }
        return acc;
      }, []);
    }
    const allCategoryIds = [
      main_category._id,
      ...getAllCategoryIds(categoryTree),
    ];

    const categoryIdStrings = allCategoryIds.map((id) => id.toString());
    const objectIdCategoryIds = allCategoryIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const categoryClauses = [
      { category: { $in: [...categoryIdStrings, ...objectIdCategoryIds] } },
      { sub_category: { $in: [...categoryIdStrings, ...objectIdCategoryIds] } },
    ];
    if (main_category.md5_cat_name) {
      categoryClauses.push({
        sub_category_new: {
          $regex: main_category.md5_cat_name,
          $options: "i",
        },
      });
      categoryClauses.push({
        category_new: main_category.md5_cat_name,
      });
    }

    const productMatch = {
      status: "Active",
      $or: categoryClauses,
    };

    // Only price + brand fields — never load full product docs for this endpoint
    const [priceAgg, brandAgg] = await Promise.all([
      Product.aggregate([
        { $match: productMatch },
        {
          $group: {
            _id: null,
            minPrice: {
              $min: {
                $cond: [
                  { $and: [{ $gt: ["$special_price", 0] }, { $lt: ["$special_price", "$price"] }] },
                  "$special_price",
                  "$price",
                ],
              },
            },
            maxPrice: {
              $max: {
                $cond: [
                  { $and: [{ $gt: ["$special_price", 0] }, { $lt: ["$special_price", "$price"] }] },
                  "$special_price",
                  "$price",
                ],
              },
            },
            count: { $sum: 1 },
          },
        },
      ]),
      Product.aggregate([
        { $match: productMatch },
        { $group: { _id: "$brand", count: { $sum: 1 } } },
      ]),
    ]);

    const priceStats = priceAgg[0];
    // Lightweight stubs so clients can still derive min/max price without 1000+ full docs
    const products =
      priceStats && priceStats.count > 0
        ? [
            { price: priceStats.minPrice, special_price: priceStats.minPrice },
            { price: priceStats.maxPrice, special_price: priceStats.maxPrice },
          ]
        : [];

    let brandsWithCount = [];
    const brandIds = brandAgg
      .map((b) => b._id)
      .filter((id) => id && mongoose.Types.ObjectId.isValid(id));

    if (brandIds.length > 0) {
      const brands = await Brand.find({ _id: { $in: brandIds } }).lean();
      const brandCountMap = Object.fromEntries(
        brandAgg.map((b) => [b._id?.toString(), b.count])
      );
      brandsWithCount = brands.map((b) => ({
        ...b,
        count: brandCountMap[b._id.toString()] || 0,
      }));
    }

    const categoryFilters = await CategoryFilter.find({
      category_id: { $in: allCategoryIds },
    }).lean();

    const filterIds = [...new Set(categoryFilters.map((cf) => cf.filter_id))];

    const filters = await Filter.find({ _id: { $in: filterIds } })
      .populate({
        path: "filter_group",
        select: "filtergroup_name filtergroup_slug",
        model: FilterGroup,
      })
      .lean();

    const formattedFilters = filters.map((filter) => ({
      ...filter,
      filter_group_name: filter.filter_group?.filtergroup_name || "No Group",
      filter_group_slug: filter.filter_group?.filtergroup_slug || "",
      filter_group: filter.filter_group?._id,
    }));

    return Response.json({
      main_category,
      category: categoryTree,
      allCategoryIds,
      products,
      brands: brandsWithCount,
      filters: formattedFilters,
    });
}
