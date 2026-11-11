import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';

import Product from "@/models/product";
import Brand from "@/models/ecom_brand_info";
import Product_all from "@/models/Product_all";
import md5 from "md5";
import ProductStore from '@/models/product_store';
import ZTrackApi from '@/models/z_track_api';
export const config = {
  api: {
    bodyParser: false,
  },
};

/* store_stock */
export async function POST(req) {
  try {
    const body = await req.json();
    const API_SECRET = process.env.MY_SECRET_TOKEN;

    // Fail closed: missing env or missing token must reject
    if (!API_SECRET || !body.api_token || API_SECRET !== body.api_token) {
      return NextResponse.json({ error: 'Invalid API token' }, { status: 401 });
    }

    const filePath = path.join(process.cwd(), 'public', 'uploads', 'store_stock');
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(filePath, { recursive: true });
    }

    const filename = `stock_${Date.now()}.json`;
    fs.writeFileSync(path.join(filePath, filename), JSON.stringify(body, null, 2));

     await ZTrackApi.create({ type: 'Branch_all_master' });
    return NextResponse.json({
      message: 'Stock stored successfully',
    });
  } catch (error) {
    console.error('Sap stock file upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process upload: ' + error.message },
      { status: 500 }
    );
  }
}