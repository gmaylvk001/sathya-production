import { NextResponse } from 'next/server';
import { join } from 'path';
import * as XLSX from 'xlsx';
import AdmZip from 'adm-zip';
import fs from 'fs/promises';
import { format } from 'date-fns';
import { writeFile } from 'fs/promises';
import Product from "@/models/product";
import Category from  "@/models/ecom_category_info";
import Brand  from "@/models/ecom_brand_info";
import formidable from 'formidable';
import md5 from "md5";
import mongoose from 'mongoose';
import Filter from "@/models/ecom_filter_infos";
import ProductFilter from "@/models/ecom_productfilter_info";
import { requireAdmin } from "@/lib/adminRequest";

export const config = {
    api: {
      bodyParser: false,
    },
  };

export async function POST(req) {
  try {
    const auth = await requireAdmin(req, "products");
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const formData = await req.formData();
    const excelFile = formData.get('excel');
    const imagesZip = formData.get('images'); // Now optional
    const overviewZip = formData.get('overview');

    if (!excelFile) {
      return NextResponse.json(
        { error: 'Missing required file: Excel file is mandatory.' },
        { status: 400 }
      );
    }

    const allowedExtensions = [".xlsx", ".csv"];
    const fileName = excelFile.name.toLowerCase();
    if (!allowedExtensions.some((ext) => fileName.endsWith(ext))) {
      return NextResponse.json(
        { error: "Invalid file type. Only .xlsx and .csv files are allowed." },
        { status: 400 }
      );
    }

    const uploadDir = join(process.cwd(), 'public/uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    // Process Excel file
    const excelBuffer = Buffer.from(await excelFile.arrayBuffer());
    const workbook = XLSX.read(excelBuffer);
    const products = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });

    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    await writeFile(join(uploadDir, `uploaded-products_${timestamp}.xlsx`), excelBuffer);

    // Process Images ZIP if provided
    if (imagesZip) {
      const imagesBuffer = Buffer.from(await imagesZip.arrayBuffer());
      const imagesZipInstance = new AdmZip(imagesBuffer);
      const imagesPath = join(uploadDir, 'products');
      
      // Get all zip entries
      const zipEntries = imagesZipInstance.getEntries();
      
      for (const entry of zipEntries) {
        // Skip directories
        if (entry.isDirectory) continue;
      
        // Only process files (e.g., images)
        const fileName = entry.entryName.split('/').pop(); // Remove internal folders
        const filePath = join(imagesPath, fileName);
      
        // Write file
        await fs.writeFile(filePath, entry.getData());
      }
    }

    // Process Overview ZIP if exists
    if (overviewZip) {
      const overviewBuffer = Buffer.from(await overviewZip.arrayBuffer());
      const overviewZipInstance = new AdmZip(overviewBuffer);
      const overviewPath = join(uploadDir, 'overview-images');
      overviewZipInstance.extractAllTo(overviewPath, true);
    }

    console.log("products.length ",products.length );
    const validProducts = products.slice(0).filter(row => row && row.length > 0 && row[0]); // Skip header and empty rows
    console.log("Actual product count:", validProducts.length);
    
    if (!validProducts || validProducts.length === 0) {
      return NextResponse.json(
        { error: "No products found in the uploaded Excel file." },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // Detect column index for movement dynamically from header row
    const headerRow = (Array.isArray(products) && products[0]) || (Array.isArray(validProducts) && validProducts[0]) || [];
    const findHeaderIndex = (matcher) => {
      if (!Array.isArray(headerRow)) return -1;
      return headerRow.findIndex(
        (cell) => typeof cell === "string" && matcher.test(String(cell).trim())
      );
    };
    let movementColIdx = findHeaderIndex(/^movement$/i);
    if (movementColIdx === -1 && Array.isArray(validProducts[0])) {
      movementColIdx = validProducts[0].findIndex(cell => 
        typeof cell === 'string' && /movement/i.test(cell.trim())
      );
    }

    // Optional identity / barcode / meta columns from product model (appended after existing sample columns)
    const commonItemCodeColIdx = findHeaderIndex(/^common[_\s-]?item[_\s-]?code$/i);
    const outdoorItemCodeColIdx = findHeaderIndex(/^outdoor[_\s-]?item[_\s-]?code$/i);
    const eanColIdx = findHeaderIndex(/^ean$/i);
    const indoorEanColIdx = findHeaderIndex(/^indoor[_\s-]?ean$/i);
    const outdoorEanColIdx = findHeaderIndex(/^outdoor[_\s-]?ean$/i);
    const metaTitleColIdx = findHeaderIndex(/^meta[_\s-]?title$/i);
    const metaDescriptionColIdx = findHeaderIndex(/^meta[_\s-]?description$/i);
    const productTypeColIdx = findHeaderIndex(/^product[_\s-]?type$/i);
    const highlightsColIdx = findHeaderIndex(/^(product[_\s-]?)?highlights$/i);

    const readOptionalCell = (row, colIdx) => {
      if (colIdx === -1 || row[colIdx] === undefined || row[colIdx] === null) return null;
      return String(row[colIdx]).trim();
    };

    const totalProducts = validProducts.length - 1;
    let createdCount = 0;
    let updatedCount = 0;
    const failedProducts = [];

    console.log(`[Bulk Upload] 🚀 Starting bulk upload processing for ${totalProducts} products...`);

    for (let i = 1; i < validProducts.length; i++) {
      const row = validProducts[i];
      const rowNum = i + 1; // 1-based index in Excel file
      const itemCode = row[0] ? String(row[0]).trim() : '';

      try {
        console.log(`[Bulk Upload] [${i}/${totalProducts}] Processing row ${rowNum} | Item Code: "${itemCode}" | Name: "${row[1] || ''}"`);

        // Process category and brand
        const category = await Category.findOne({ category_name: row[3] }).select("_id");
        const sub_category = await Category.findOne({ category_name: row[4] }).select("_id");
        const brand = await Brand.findOne({ brand_name: row[5] }).select("_id");

        // Process filters
        const size = row[6] || '';
        const star = row[7] || '';
        const filterString = `${size},${star}`;
        const filterNames = filterString.split(',')
          .map(name => name.trim())
          .filter(name => name !== '');
        
        let filterIds = [];
        let filters = []; // Changed from const to let
        if (filterNames.length > 0) {
          filters = await Filter.find({ filter_name: { $in: filterNames } }); // Ensure no status filter
          filterIds = filters.map(filter => filter._id.toString());
        }

        // Process images and variants
        let images = [row[13], row[14], row[15]].filter(img => img);
        let overviewImage = [];
        if (row[16]) overviewImage = row[16].split(',').filter(img => img);
        
        let variants = [];
        if (row[18] && typeof row[18] === 'string' && row[18].trim() !== "") {
          try {
            variants = JSON.parse(row[18].trim());
            if (!Array.isArray(variants)) variants = [];
          } catch (error) {
            console.error(`[Bulk Upload] ⚠️ Error parsing variants at row ${rowNum} (${itemCode}): ${error.message}`);
            variants = [];
          }
        }
        
        // ✅ Price & Special Price with validation
        const rawPrice = row[9]?.toString().replace(/,/g, '') || '0';
        const rawSpecialPrice = row[10]?.toString().replace(/,/g, '') || '';

        const price = parseFloat(rawPrice);
        const specialPrice = parseFloat(rawSpecialPrice);

        if (isNaN(price) || price < 0) {
          console.error(`[Bulk Upload] ❌ Invalid price at row ${rowNum} (${itemCode}): "${rawPrice}". Skipping row.`);
          failedProducts.push({ row: rowNum, item_code: itemCode, error: `Invalid price: "${rawPrice}"` });
          continue;
        }

        if (rawSpecialPrice !== '') {
          if (isNaN(specialPrice) || specialPrice < 0) {
            console.error(`[Bulk Upload] ❌ Invalid special price at row ${rowNum} (${itemCode}): "${rawSpecialPrice}". Skipping row.`);
            failedProducts.push({ row: rowNum, item_code: itemCode, error: `Invalid special price: "${rawSpecialPrice}"` });
            continue;
          }
        }
        
        let highlights = [];
        // Prefer named highlights column; fall back to legacy index 21 only when the new EAN columns are absent
        const highlightsRaw =
          highlightsColIdx !== -1
            ? row[highlightsColIdx]
            : commonItemCodeColIdx === -1 && eanColIdx === -1
              ? row[21]
              : undefined;
        if (highlightsRaw && typeof highlightsRaw === "string") {
          highlights = highlightsRaw.split(",").map((item) => item.trim()).filter(Boolean);
        }
        
        let key_specifications = [];
        if(row[12] && typeof row[12] === 'string'){
          key_specifications = row[12].split(',');
        }

        // Extended warranty (expects JSON string in Excel column 21)
        let extend_warranty = [];
        if (row[20] && typeof row[20] === 'string') {
          try {
            extend_warranty = JSON.parse(row[20].trim());
            if (!Array.isArray(extend_warranty)) extend_warranty = [];
          } catch (error) {
            console.error(`[Bulk Upload] ⚠️ Error parsing extend_warranty at row ${rowNum} (${itemCode}): ${error.message}`);
            extend_warranty = [];
          }
        }

        // Movement field extraction
        let movement = "";
        if (movementColIdx !== -1 && row[movementColIdx] !== undefined && row[movementColIdx] !== null) {
          movement = row[movementColIdx].toString().trim();
        } else if (row[8] !== undefined && row[8] !== null) {
          const col8Val = row[8].toString().trim();
          if (col8Val !== "" && isNaN(Number(col8Val))) {
            movement = col8Val;
          }
        }
        
        // Check for existing product
        const existingProduct = await Product.findOne({
          $or: [
            { item_code: row[0] },
            // { name: row[1] },
          ],
        });

        // Prepare product data
        const productData = {
          item_code: row[0],
          name: row[1],
          quantity: row[2],
          category: category?._id || null,
          sub_category: sub_category?._id || null,
          brand: brand?._id || null,
          price: row[9],
          special_price: row[10],
          description: row[11],
          key_specifications: key_specifications,
          overview_description: row[17],
          hasVariants: variants.length > 0,
          variants: variants,
          status: row[19],
          extend_warranty: extend_warranty,
          stock_status: row[2] > 0 ? "In Stock" : "Out of Stock",
          product_highlights: highlights,
        };

        if (movement) {
          productData.movement = movement;
        } else if (existingProduct && existingProduct.movement) {
          productData.movement = existingProduct.movement;
        } else {
          productData.movement = movement || "";
        }

        const commonItemCode = readOptionalCell(row, commonItemCodeColIdx);
        const outdoorItemCode = readOptionalCell(row, outdoorItemCodeColIdx);
        const ean = readOptionalCell(row, eanColIdx);
        const indoorEan = readOptionalCell(row, indoorEanColIdx);
        const outdoorEan = readOptionalCell(row, outdoorEanColIdx);
        const metaTitle = readOptionalCell(row, metaTitleColIdx);
        const metaDescription = readOptionalCell(row, metaDescriptionColIdx);
        const productTypeRaw = readOptionalCell(row, productTypeColIdx);

        if (commonItemCode !== null) {
          productData.common_item_code = commonItemCode;
        } else if (existingProduct?.common_item_code) {
          productData.common_item_code = existingProduct.common_item_code;
        }

        if (outdoorItemCode !== null) {
          productData.outdoor_item_code = outdoorItemCode;
        } else if (existingProduct?.outdoor_item_code) {
          productData.outdoor_item_code = existingProduct.outdoor_item_code;
        }

        if (ean !== null) {
          productData.ean = ean;
        } else if (existingProduct?.ean) {
          productData.ean = existingProduct.ean;
        }

        if (indoorEan !== null) {
          productData.indoor_ean = indoorEan;
        } else if (existingProduct?.indoor_ean) {
          productData.indoor_ean = existingProduct.indoor_ean;
        }

        if (outdoorEan !== null) {
          productData.outdoor_ean = outdoorEan;
        } else if (existingProduct?.outdoor_ean) {
          productData.outdoor_ean = existingProduct.outdoor_ean;
        }

        if (metaTitle !== null) {
          productData.meta_title = metaTitle;
        } else if (existingProduct?.meta_title) {
          productData.meta_title = existingProduct.meta_title;
        }

        if (metaDescription !== null) {
          productData.meta_description = metaDescription;
        } else if (existingProduct?.meta_description) {
          productData.meta_description = existingProduct.meta_description;
        }

        // product_type: save only normal/gift (case-insensitive); empty keeps existing
        if (productTypeRaw !== null) {
          const normalizedType = productTypeRaw.toLowerCase();
          if (normalizedType === "normal" || normalizedType === "gift") {
            productData.product_type = normalizedType;
          } else if (productTypeRaw === "") {
            // explicit empty cell → do not overwrite existing on update
            if (!existingProduct) productData.product_type = "";
            else if (existingProduct?.product_type) productData.product_type = existingProduct.product_type;
          }
        } else if (existingProduct?.product_type) {
          productData.product_type = existingProduct.product_type;
        }

        // Only update images if new ones are provided in Excel
        if (images.length > 0) {
          productData.images = images;
        } else if (existingProduct) {
          // Preserve existing images if no new ones are provided
          productData.images = existingProduct.images;
        }

        // Only update overview images if new ones are provided in Excel
        if (overviewImage.length > 0) {
          productData.overview_image = overviewImage;
        } else if (existingProduct) {
          // Preserve existing overview images if no new ones are provided
          productData.overview_image = existingProduct.overview_image;
        }

        if (!existingProduct) {
          // Create new product
          let baseSlug = String(productData.name || productData.item_code || "product")
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')        // Remove all non-word characters except spaces and hyphens
            .replace(/\s+/g, '-')            // Replace spaces with hyphens
            .replace(/--+/g, '-')            // Replace multiple hyphens with a single one
            .trim(); 
          if (!baseSlug) baseSlug = `product-${productData.item_code || Date.now()}`;

          let productSlug = baseSlug;
          let counter = 1;
          while (await Product.exists({ slug: productSlug })) {
            productSlug = `${baseSlug}-${counter}`;
            counter++;
          }

          productData.slug = productSlug;
          productData.md5_name = md5(productSlug);

          console.log(`[Bulk Upload] Row ${rowNum}: Creating NEW product (Item Code: "${row[0]}", Slug: "${productSlug}")`);
          const newProduct = await Product.create(productData);
          createdCount++;

          // Create product filters
          if (filterIds.length > 0) {
            await ProductFilter.insertMany(
              filterIds.map(filterId => ({
                product_id: newProduct._id,
                filter_id: filterId
              }))
            );
          }
          console.log(`[Bulk Upload] ✅ Row ${rowNum}: Successfully created product (Item Code: "${row[0]}", ID: ${newProduct._id})`);
        } else {
          // Update existing product
          updatedCount++;
          console.log(`update ${updatedCount}: Product ${row[0]} already exists, updating product (Row ${rowNum}, ID: ${existingProduct._id})`);
          await Product.updateOne(
            { _id: existingProduct._id },
            { $set: productData }
          );

          const existingProductFilters = await ProductFilter.find({ product_id: existingProduct._id });
          const existingFilterIds = existingProductFilters.map(pf => pf.filter_id.toString());

          const newFilterIds = filters.map(f => f._id.toString());

          // Remove associations not present in Excel
          await ProductFilter.deleteMany({
            product_id: existingProduct._id,
            filter_id: { $nin: newFilterIds }
          });

          // Add new associations
          const operations = newFilterIds
            .filter(id => !existingFilterIds.includes(id))
            .map(id => ({
              insertOne: {
                document: {
                  product_id: existingProduct._id,
                  filter_id: id
                }
              }
            }));

          if (operations.length > 0) {
            await ProductFilter.bulkWrite(operations, { ordered: false });
          }
          console.log(`[Bulk Upload] ✅ Row ${rowNum}: Successfully updated product (Item Code: "${row[0]}")`);
        }
      } catch (rowError) {
        console.error(`[Bulk Upload] ❌ ERROR at row ${rowNum} (Item Code: "${itemCode}", Name: "${row[1] || ''}"):`, rowError.message || rowError);
        console.error(rowError);
        failedProducts.push({ row: rowNum, item_code: itemCode, error: rowError.message || String(rowError) });
      }
    }

    console.log(`[Bulk Upload] 🎉 Completed processing. Total: ${totalProducts}, Created: ${createdCount}, Updated: ${updatedCount}, Failed: ${failedProducts.length}`);

    const count =
      validProducts.length > 1
        ? validProducts.length - 1
        : validProducts.length;

    return NextResponse.json({
      message: `Successfully processed ${count} products (${createdCount} created, ${updatedCount} updated${failedProducts.length ? `, ${failedProducts.length} failed` : ''}).`,
      productCount: count,
      createdCount,
      updatedCount,
      failedCount: failedProducts.length,
      errors: failedProducts.slice(0, 50),
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process upload: ' + error.message },
      { status: 500 }
    );
  }
}

// export async function PATCH(req) {
//   // if (req.method !== 'PATCH') {
//   //   return NextResponse.json(
//   //     { error: 'Method not allowed' },
//   //     { status: 405 }
//   //   );
//   // }

//   try {

//     // Parse form data using formidable
//     // const form   = formidable({ multiples: false });
//     const formData        = await req.formData();
//     // const [fields, files] = await form.parse(req);
//     // const file = files.excel;
//     const file = formData.get('excel');

//     if (!file) {
//       return NextResponse.json(
//         { error: 'Excel or CSV file is required.' },
//         { status: 400 }
//       );
//     }

//     const filePath  = file[0].filepath;
//     const fileName  = file[0].originalFilename.toLowerCase();
//     const buffer    = await writeFile(join(process.cwd(), 'temp-upload.xlsx'), await fs.readFile(filePath));

//     let rows = [];

//     if (fileName.endsWith('.csv')) {
//       const csvText   = buffer.toString('utf-8');
//       const workbook  = read(csvText, { type: 'string' });
//       rows            = utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
//     } else {
//       const workbook  = read(buffer);
//       rows            = utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
//     }

//     if (!Array.isArray(rows) || rows.length === 0) {
//       return NextResponse.json(
//         { error: 'No data found in the uploaded file.' },
//         { status: 400 }
//       )
//     }

//     // Prepare bulk operations
//     const bulkOps = rows.map((row, index) => {
//       if (!row.item_code || typeof row.movement === 'undefined') {
//         console.warn(`Skipping row ${index + 2}: Missing item_code or movement`);
//         return null;
//       }

//       return {
//         updateOne: {
//           filter: { item_code: row.item_code },
//           update: { $set: { movement: row.movement } },
//           upsert: false,
//         },
//       };
//     }).filter(Boolean); // Remove nulls

//     // Chunking for large datasets
//     const chunkSize = 1000;
//     let updatedCount = 0;

//     for (let i = 0; i < bulkOps.length; i += chunkSize) {
//       const chunk = bulkOps.slice(i, i + chunkSize);
//       const result = await Product.bulkWrite(chunk, { ordered: false });
//       updatedCount += result.modifiedCount;
//     }

//     return NextResponse.json(
//       { message: `Successfully updated ${updatedCount} products.`, totalRows: rows.length },
//       { status: 200 }
//     );

//   } catch (error) {
//     return NextResponse.json(
//       { error: 'Bulk update error: ' + error.message },
//       { status: 500 }
//     )
//   }
// }

export async function PATCH(req) {
  try {

    const formData  = await req.formData();
    const file      = formData.get('excel');

    if (!file) {
      return NextResponse.json(
        { error: 'Excel or CSV file is required.' },
        { status: 400 }
      );
    }

    const fileName  = file.name.toLowerCase();
    const buffer    = Buffer.from(await file.arrayBuffer());

    let rows = [];

    if (fileName.endsWith('.csv')) {
      const csvText   = buffer.toString('utf-8');
      const workbook  = XLSX.read(csvText, { type: 'string' });
      rows            = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    } else {
      const workbook  = XLSX.read(buffer);
      rows            = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: 'No data found in the uploaded file.' },
        { status: 400 }
      )
    }

    // Prepare bulk operations
    const bulkOps = rows.map((row, index) => {
      if (!row.item_code || typeof row.movement === 'undefined') {
        console.warn(`Skipping row ${index + 2}: Missing item_code or movement`);
        return null;
      }

      return {
        updateOne: {
          filter: { item_code: row.item_code },
          update: { $set: { movement: row.movement } },
          upsert: false,
        },
      };
    }).filter(Boolean); // Remove nulls

    // Chunking for large datasets
    const chunkSize = 1000;
    let updatedCount = 0;

    for (let i = 0; i < bulkOps.length; i += chunkSize) {
      const chunk = bulkOps.slice(i, i + chunkSize);
      const result = await Product.bulkWrite(chunk, { ordered: false });
      updatedCount += result.modifiedCount;
    }

    return NextResponse.json(
      { message: `Successfully updated ${updatedCount} products.`, totalRows: rows.length },
      { status: 200 }
    );

  } catch (error) {
    console.error('Bulk update error:', error);
    return NextResponse.json(
      { error: 'Bulk update error: ' + error.message },
      { status: 500 }
    )
  }
}