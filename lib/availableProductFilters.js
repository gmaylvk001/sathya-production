import ProductFilter from "@/models/ecom_productfilter_info";
import Filter from "@/models/ecom_filter_infos";
import FilterGroup from "@/models/ecom_filter_group_infos";

/** Facet options for the current matching product set (no per-option counts). */
export async function getFiltersForProductIds(productIds = []) {
  const ids = (productIds || [])
    .map((id) => id?.toString?.() || String(id))
    .filter(Boolean);
  if (!ids.length) return [];

  const productFilters = await ProductFilter.find({
    product_id: { $in: ids },
  })
    .select("filter_id")
    .lean();

  const uniqueFilterIds = [
    ...new Set(
      productFilters.map((pf) => pf.filter_id?.toString()).filter(Boolean)
    ),
  ];
  if (!uniqueFilterIds.length) return [];

  const filterDocs = await Filter.find({ _id: { $in: uniqueFilterIds } })
    .populate({
      path: "filter_group",
      select: "filtergroup_name filtergroup_slug",
      model: FilterGroup,
    })
    .lean();

  return filterDocs.map((f) => ({
    _id: f._id,
    filter_name: f.filter_name,
    filter_slug: f.filter_slug,
    filter_group_name: f.filter_group?.filtergroup_name || "Other",
    filter_group_slug: f.filter_group?.filtergroup_slug || "",
    filter_group_id: f.filter_group?._id?.toString() || "other",
  }));
}
