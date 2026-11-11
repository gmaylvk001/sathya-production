import connectDB from "@/lib/db";
import Filter from "@/models/ecom_filter_infos";
import FilterGroup from "@/models/ecom_filter_group_infos";

export async function GET(req) {
  try {
    await connectDB();
    
    const filters = await Filter.find()
      .populate({
        path: 'filter_group',
        select: 'filtergroup_name -_id',
        model: FilterGroup
      })
      .lean();

    // Transform the response format
    const formattedFilters = filters.map(filter => ({
      ...filter,
      filter_group_name: filter.filter_group?.filtergroup_name || 'No Group',
      filter_group: filter.filter_group?._id // Keep original ID
    }));

    return Response.json({ data: formattedFilters }, { status: 200 });
  } catch (error) {
    console.error("Error fetching filters:", error);
    return Response.json({ error: "Error fetching filters" }, { status: 500 });
  }
}