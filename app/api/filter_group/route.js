
import  connectDB from "@/lib/db";
import Filtergroup from "@/models/ecom_filter_group_infos";

export async function GET(req) {
  try {
    await connectDB();
    const filtergroup = await Filtergroup.find();
    return Response.json({ data: filtergroup }, {status: 200} );
  } catch (error) {
    return Response.json({ error:error }, { status: 500 });
  }
}
