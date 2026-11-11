// app/api/orders/route.js
import { NextResponse } from 'next/server';
import dbConnect from "@/lib/db";

import Abandoned from "@/models/ecom_abondant_details"; // define this model below if not done

export async function GET() {
  try {
    await dbConnect();
    const orders = await Abandoned.find().sort({ createdAt: -1 });
    return NextResponse.json(orders, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Error fetching orders', error }, { status: 500 });
  }
}
