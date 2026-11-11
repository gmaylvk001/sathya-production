import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';

import Product from "@/models/product";
import Brand from "@/models/ecom_brand_info";
import Product_all from "@/models/Product_all";
import md5 from "md5";
//import ProductStore from '@/models/product_store';
//import ZTrackApi from '@/models/z_track_api';
export const config = {
  api: {
    bodyParser: false,
  },
};
// .env on_sathya_price_update=on -> products prices updated; off or missing -> only stock/status etc.
function onSathyaPriceUpdate() {
  return String(process.env.on_sathya_price_update || "").trim().toLowerCase() === "on";
}

/* stock_price */
export async function POST(req) {
  try {
    const body = await req.json();
    const API_SECRET = process.env.MY_SECRET_TOKEN;

    // Fail closed: missing env or missing token must reject
    if (!API_SECRET || !body.api_token || API_SECRET !== body.api_token) {
      return NextResponse.json({ error: 'Invalid API token' }, { status: 401 });
    }

    const stockItems = body.sku;

    if (!Array.isArray(stockItems)) {
      return NextResponse.json({ error: 'Invalid payload format' }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'public', 'uploads', 'allstock');
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(filePath, { recursive: true });
    }

    const filename = `stock_${Date.now()}.json`;
    fs.writeFileSync(path.join(filePath, filename), JSON.stringify(body, null, 2));

    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    const get_indoor_array = [];
    const priceUpdateOn = onSathyaPriceUpdate();

    for (const item of stockItems) {
      let common_item_code_product_all = null;
      let is_ctype = 0;

      if (item.Common_Type === 'No') {
        is_ctype = 0;
      } else {
        is_ctype = 1;
        common_item_code_product_all = item.Common_Model ?? null;
      }

      const existingProduct = await Product.findOne({ item_code: item.item_code });
      const existingBrand = await Brand.findOne({ brand_name: item.brand });

      const existingName = item.item_description || '';
      const brand_id = existingBrand?._id?.toString() || null;

      let Status = "Active";
      if (item.Status === "InActive") {
        Status = "Inactive";
      }

      const isDemoItemcode = item.item_code.toUpperCase().includes("DEMO");

      if (isDemoItemcode) {
        Status = "Inactive";
      }

      const isDemoTitle = item.item_description.toUpperCase().includes(" DEMO");

      if (isDemoTitle) {
        Status = "Inactive";
      }
      const stock_status = parseFloat(item.quantity) > 0 ? "In Stock" : "Out of Stock";
   

      if (existingProduct) {
        const updateFields = {
          quantity: parseFloat(item.quantity),
          stock_status: stock_status,
          brand_code: item.brand_code,
          movement: item.movement,
          rank: item.rank,
          ean: item.EANCode,
        };
        if (priceUpdateOn) {
          updateFields['store_price'] = item.branch_price;
          updateFields['price'] = parseFloat(item.price);
        }

        if(brand_id) {
          updateFields['brand'] = brand_id;
        }
        if (existingProduct.is_common_type === 1) {
          updateFields['indoor_ean'] = item.Common_EANCode;
          updateFields['common_item_code'] = item.Common_Model;
          if (priceUpdateOn) {
            updateFields['id_spl_price'] = parseFloat(item.spl_price);
            updateFields['id_final_price'] = parseFloat(item.final_price);
            updateFields['id_price'] = parseFloat(item.price);
            updateFields['id_store_price'] = item.branch_price;
          }
        }

        // if (existingProduct.is_sync_status === 0) {
          updateFields['status'] = Status;
        // }

        // if (existingProduct.is_manual_price === 0) {
        if (priceUpdateOn) {
          updateFields['special_price'] = parseFloat(item.spl_price);
          updateFields['final_price'] = parseFloat(item.final_price);
        }
        // }

        if (item.brand === 'GIFT') {
          const giftFields = {
            quantity: parseFloat(item.quantity),
            status: Status,
            name: existingName,
            brand_code: item.brand_code,
            movement: item.movement,
            rank: item.rank,
            ean: item.EANCode,
          };
          if (priceUpdateOn) {
            giftFields['price'] = parseFloat(item.price);
            giftFields['special_price'] = parseFloat(item.spl_price);
            giftFields['final_price'] = item.final_price;
            giftFields['store_price'] = item.branch_price;
          }
          await Product.updateOne(
            { item_code: item.item_code },
            { $set: giftFields }
          );
        } else {
          await Product.updateOne(
            { item_code: item.item_code },
            { $set: updateFields }
          );
        }

        if (item.Common_Type === "In-Door" && item.Common_Model) {
          get_indoor_array.push(item.Common_Model);
        }

        if (priceUpdateOn && existingProduct.bajaj_mid) {
          await Product.updateOne(
            { item_code: item.item_code, bajaj_mid: existingProduct.bajaj_mid },
            {
              $set: {
                bajaj_ivc_amt: item.final_price,
                bajaj_max_amt: item.final_price,
              },
            }
          );
        }
      }

      const existingProductall = await Product_all.findOne({ item_code: item.item_code });
      const brandValue = existingBrand?._id?.toString() ?? item.brand;

      const commonData = {
        item_code: item.item_code,
        price: parseFloat(item.price),
        special_price: parseFloat(item.spl_price),
        quantity: parseFloat(item.quantity),
        brand: brandValue,
        name: item.item_description,
        final_price: item.final_price,
        brand_code: item.brand_code,
        movement: item.movement,
        rank: item.rank,
        item_description: item.item_description,
        group_property: item.group_property,
        bfl_id: item.bfl_id,
        status: Status,
        ean: item.EANCode,
        is_common_type: is_ctype,
        common_item_code: common_item_code_product_all,
      };
      if(brand_id) {
        commonData['brand'] = brand_id;
      }

      if (existingProductall) {
        await Product_all.updateOne({ item_code: item.item_code }, { $set: commonData });
      } else {
        if (!existingProduct) {
          await Product_all.create(commonData);
        }
      }
    }
    //await ZTrackApi.create({ type: 'prod_all_master' });
    return NextResponse.json({
      message: 'Stock items processed successfully',
    });
  } catch (error) {
    console.error('Sap Items Bulk upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process upload: ' + error.message },
      { status: 500 }
    );
  }
}