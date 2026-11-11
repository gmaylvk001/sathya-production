import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import store from "@/models/store";

export async function GET() {

    await dbConnect();

    try {
        const stores = await store.aggregate([
            {
                $group: {
                _id: "$city",         // group by city field
                stores: { $push: "$$ROOT" } // push all store docs into an array
                }
            },
            {
                $project: {
                _id: 0,               
                city: "$_id",
                stores: 1
                }
            }
        ]);
        return NextResponse.json({success: true, data: stores}, {status: 200});
    }catch(error) {
        return NextResponse.json({success: false, error: "Error occures to fetching stores!"}, {status: 500})
    }

}
