import dbConnect from "@/lib/db";
import Filtergroup from "@/models/ecom_filter_group_infos";
import { NextResponse } from "next/server";

export async function POST(req) {
    await dbConnect();
  try {
         const { Id } = await req.json();
     
         if (!Id) {
           return NextResponse.json({ error: "Filter group ID is required" }, { status: 400 });
         }
     
         const filtergroup = await Filtergroup.findById(Id);
         if (!filtergroup) {
           return NextResponse.json({ error: "Filter group not found" }, { status: 404 });
         }

           return NextResponse.json({ data: filtergroup }, {status: 200} );
       } catch (error) {
         console.error("Error deleting Filter:", error);
         return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
       }
}
