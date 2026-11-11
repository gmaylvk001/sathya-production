import dbConnect from "@/lib/db";
import FilterGroup from "@/models/ecom_filter_group_infos";
import ProductFilter from "@/models/ecom_productfilter_info";
import Product from "@/models/product";

export async function GET(req, { params }) {
  try {
    await dbConnect();
    
    // Find filter groups that are associated with products in this category
    const filterGroups = await Product.aggregate([
      { $match: { category: params.categoryId } },
      { $lookup: {
          from: "ecom_productfilter_infos",
          localField: "_id",
          foreignField: "product_id",
          as: "productFilters"
        }
      },
      { $unwind: "$productFilters" },
      { $lookup: {
          from: "ecom_filter_infos",
          localField: "productFilters.filter_id",
          foreignField: "_id",
          as: "filter"
        }
      },
      { $unwind: "$filter" },
      { $lookup: {
          from: "ecom_filter_group_infos",
          localField: "filter.filter_group",
          foreignField: "_id",
          as: "filterGroup"
        }
      },
      { $unwind: "$filterGroup" },
      { $group: { _id: "$filterGroup._id", filterGroup: { $first: "$filterGroup" } } },
      { $replaceRoot: { newRoot: "$filterGroup" } }
    ]);

    return Response.json({ data: filterGroups }, { status: 200 });
  } catch (error) {
    return Response.json({ error: "Error fetching filter groups" }, { status: 500 });
  }
}