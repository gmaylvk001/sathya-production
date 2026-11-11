import { NextResponse } from 'next/server';
import { join } from 'path';
import path from 'path';
import * as XLSX from 'xlsx';
import AdmZip from 'adm-zip';
import fs from 'fs';
import { format } from 'date-fns';
import { writeFile } from 'fs/promises';
import Product from "@/models/product";
import Product_all from "@/models/Product_all";
import Category from  "@/models/ecom_category_info";
import Brand  from "@/models/ecom_brand_info";
import md5 from "md5";
import mongoose from 'mongoose';
import Filter from "@/models/ecom_filter_infos";
import ProductFilter from "@/models/ecom_productfilter_info";

export const config = {
    api: {
      bodyParser: false,
    },
  };

export async function POST(req) {
  try {
    const body = await req.json();
    const stockItems = body.stock;

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

    for (const item of stockItems) {
        const existingProduct = await Product.findOne({
            item_code: item.name,
        });
        const existingBrand = await Brand.findOne({  brand_name: { $regex: new RegExp(`^${item.brand}$`, "i") } });
        const brand_id = existingBrand?._id?.toString() || null;
        console.log(item.brand,existingBrand,brand_id);
        if (existingProduct && item.Status == 'Yes') {
            // await Product.updateOne(
            //     {
            //      item_code: item.name 
            //     },
            //     {
            //         $set: {
            //             price: parseFloat(item.MRP),
            //             special_price: parseFloat(item.SellingPrice),
            //             quantity: parseFloat(item.stock),
            //             movement: item.movement,
            //         },
            //     }
                
            // );
            
            /*
            
            const price = '';
            
            if(item.MRP == '')
            {
                price = 0;
            }
            else
            {
                price = parseFloat(item.MRP);
            }
            
            
            const SellingPrice = '';
            
            if(item.SellingPrice == '')
            {
                SellingPrice = 0;
            }
            else
            {
                SellingPrice = parseFloat(item.SellingPrice);
            }
            
           
              const updateFields = {
                  price: price,
                  special_price: SellingPrice,
                  quantity: parseFloat(item.stock) || 0,
                  // movement: item.movement,
              };
              
              */
              
                const price = item.MRP === '' ? 0 : parseFloat(item.MRP);
                const sellingPrice = item.SellingPrice === '' ? 0 : parseFloat(item.SellingPrice);
                const quantity = parseFloat(item.stock) || 0;

                const updateFields = {
                    price,
                    special_price: sellingPrice,
                    quantity,
                };
              if(brand_id) {
                  updateFields['brand'] = brand_id;
              }
              await Product.updateOne(
                  {
                    item_code: item.name 
                  },
                  { $set: updateFields }
                  
              );
        }
        // else{
          if(item.Status == 'Yes'){
            const existingProductall = await Product_all.findOne({
                item_code: item.name,
            });
            
            const price2 = item.MRP === '' ? 0 : parseFloat(item.MRP);
            const sellingPrice2 = item.SellingPrice === '' ? 0 : parseFloat(item.SellingPrice);
            const quantity2 = parseFloat(item.stock) || 0;
            
            if (existingProductall) {
                await Product_all.updateOne(
                    {
                    item_code: item.name 
                    },
                    {
                        $set: {
                            price: price2,
                            special_price: sellingPrice2,
                            quantity: quantity2,
                            brand : item.brand
                            // movement: item.movement,
                        },
                    }
                    
                );
            }else{
                await Product_all.create({
                    item_code: item.name,
                    price: price2,
                    special_price: sellingPrice2,
                    quantity: quantity2,
                    brand   : item.brand,
                    // movement: item.movement,
                });

            }
          } else if(item.Status == 'No'){
            const existingProductall = await Product_all.findOne({
                item_code: item.name,
            });
            if(existingProductall){
            await Product_all.deleteOne({ item_code: item.name });
            }
            if (existingProductall) {
              // 2️⃣ Find product in Product table
              const existingProductall = await Product.findOne({
                  item_code: item.name,
              });

              if (existingProductall) {
                  // 3️⃣ Update Product status to inactive
                  await Product.updateOne(
                      { item_code: item.name },
                      { $set: { status: 'inactive' } }
                  );
              }
            }
          }

        // }
    }


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