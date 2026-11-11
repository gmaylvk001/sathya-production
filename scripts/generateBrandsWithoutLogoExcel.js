const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");

// Load .env
const envPath = path.join(__dirname, "../.env");
let mongoUri = "mongodb://sathyamongodb:sathyamongodb%40987@213.165.95.239/sathyamongodb";
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        let val = trimmed.substring(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (key === "MONGODB_URI") mongoUri = val;
      }
    }
  }
}

async function generateExcel() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(mongoUri, {
    family: 4,
    directConnection: true,
  });
  console.log("Connected successfully.");

  const brandsColl = mongoose.connection.collection("ecom_brand_infos");
  const productsColl = mongoose.connection.collection("products");

  // Read available image files in public/uploads/Brands
  const brandsDir = path.join(__dirname, "../public/uploads/Brands");
  let existingFiles = new Set();
  if (fs.existsSync(brandsDir)) {
    existingFiles = new Set(fs.readdirSync(brandsDir));
  }
  console.log(`Found ${existingFiles.size} files in public/uploads/Brands`);

  // Fetch all brands sorted alphabetically by brand_name
  const allBrands = await brandsColl.find({}).sort({ brand_name: 1 }).toArray();
  console.log(`Retrieved ${allBrands.length} brands from ecom_brand_infos`);

  // Aggregate product counts per brand
  const productCounts = await productsColl.aggregate([
    {
      $group: {
        _id: "$brand",
        count: { $sum: 1 },
      },
    },
  ]).toArray();

  const countMap = new Map();
  for (const item of productCounts) {
    if (item._id) {
      countMap.set(String(item._id), item.count);
    }
  }

  // Classify brands
  const missingLogoRows = [];
  const allBrandRows = [];

  let countWithLogo = 0;
  let countMissingLogo = 0;
  let countMissingWithProducts = 0;

  for (let i = 0; i < allBrands.length; i++) {
    const b = allBrands[i];
    const idStr = String(b._id);
    const rawImage = (b.image || "").trim();
    const productCount = countMap.get(idStr) || countMap.get(b.brand_name) || 0;
    const brandSlug = b.brand_slug || (b.brand_name || "").toLowerCase().replace(/\s+/g, "-");
    const brandUrl = `https://www.sathya.store/brand/${brandSlug}`;

    let hasValidLogo = false;
    let logoStatus = "";

    if (!rawImage) {
      hasValidLogo = false;
      logoStatus = "No Logo Specified (Empty in Database)";
    } else if (existingFiles.has(rawImage)) {
      hasValidLogo = true;
      logoStatus = "Valid Logo Available";
    } else {
      hasValidLogo = false;
      logoStatus = "Missing - File Not Found on Disk (404)";
    }

    const rowData = {
      brand_id: idStr,
      brand_name: b.brand_name || "",
      brand_slug: brandSlug,
      status: b.status || "Inactive",
      product_count: productCount,
      logo_status: logoStatus,
      registered_image_file: rawImage || "(None)",
      brand_store_url: brandUrl,
      manufacturer_name: b.manufacturer_name || "",
      manufacturer_address: b.manufacturer_address || "",
      created_date: b.createdAt ? new Date(b.createdAt).toISOString().split("T")[0] : "",
      updated_date: b.updatedAt ? new Date(b.updatedAt).toISOString().split("T")[0] : "",
    };

    allBrandRows.push(rowData);

    if (hasValidLogo) {
      countWithLogo++;
    } else {
      countMissingLogo++;
      if (productCount > 0) {
        countMissingWithProducts++;
      }
      missingLogoRows.push(rowData);
    }
  }

  // Sort missingLogoRows: first those with products descending, then by brand_name alphabetically
  missingLogoRows.sort((a, b) => {
    if (b.product_count !== a.product_count) {
      return b.product_count - a.product_count;
    }
    return a.brand_name.localeCompare(b.brand_name, undefined, { sensitivity: "base" });
  });

  // Prepare sheet 1 data: Brands Without Logo
  const sheet1Data = missingLogoRows.map((r, idx) => ({
    "S.No": idx + 1,
    "Brand Name": r.brand_name,
    "Brand Slug": r.brand_slug,
    "Status": r.status,
    "Active Products": r.product_count,
    "Logo Issue": r.logo_status,
    "Registered Image in DB": r.registered_image_file,
    "Brand Page URL": r.brand_store_url,
    "Manufacturer Name": r.manufacturer_name,
    "Manufacturer Address": r.manufacturer_address,
    "Created Date": r.created_date,
    "Brand ID": r.brand_id,
  }));

  // Prepare sheet 2 data: All Brands Status Overview
  const sheet2Data = allBrandRows.map((r, idx) => ({
    "S.No": idx + 1,
    "Brand Name": r.brand_name,
    "Brand Slug": r.brand_slug,
    "Status": r.status,
    "Logo Available?": r.logo_status === "Valid Logo Available" ? "YES" : "NO",
    "Logo Status Details": r.logo_status,
    "Active Products": r.product_count,
    "Registered Image in DB": r.registered_image_file,
    "Brand Page URL": r.brand_store_url,
    "Manufacturer Name": r.manufacturer_name,
    "Created Date": r.created_date,
    "Brand ID": r.brand_id,
  }));

  // Prepare sheet 3 data: Summary KPI
  const nowStr = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const sheet3Data = [
    { "Metric": "Report Title", "Value": "Sathya Store - Brands Without Logo Report" },
    { "Metric": "Generated At", "Value": nowStr + " IST" },
    { "Metric": "Total Brands in Database", "Value": allBrands.length },
    { "Metric": "Brands WITH Logo Available", "Value": countWithLogo },
    { "Metric": "Brands WITHOUT Logo (Missing / 404)", "Value": countMissingLogo },
    { "Metric": "Brands Without Logo Having Active Products", "Value": countMissingWithProducts },
    { "Metric": "Database Collection", "Value": "ecom_brand_infos" },
    { "Metric": "Public Logo Directory", "Value": "public/uploads/Brands" },
  ];

  // Create workbook
  const wb = XLSX.utils.book_new();

  const ws1 = XLSX.utils.json_to_sheet(sheet1Data);
  const ws2 = XLSX.utils.json_to_sheet(sheet2Data);
  const ws3 = XLSX.utils.json_to_sheet(sheet3Data);

  // Auto-fit column widths helper
  function autoFitColumns(ws, data) {
    if (!data || data.length === 0) return;
    const keys = Object.keys(data[0]);
    const colWidths = keys.map((key) => {
      let maxLen = key.length;
      for (const row of data) {
        const val = row[key] !== undefined && row[key] !== null ? String(row[key]) : "";
        if (val.length > maxLen) {
          maxLen = val.length;
        }
      }
      return { wch: Math.min(Math.max(maxLen + 3, 10), 60) };
    });
    ws["!cols"] = colWidths;
  }

  autoFitColumns(ws1, sheet1Data);
  autoFitColumns(ws2, sheet2Data);
  autoFitColumns(ws3, sheet3Data);

  XLSX.utils.book_append_sheet(wb, ws1, "Brands Without Logo");
  XLSX.utils.book_append_sheet(wb, ws2, "All Brands Overview");
  XLSX.utils.book_append_sheet(wb, ws3, "Summary");

  // Output paths
  const outputExcelPath = path.join(__dirname, "../brands_without_logo.xlsx");
  const outputCsvPath = path.join(__dirname, "../brands_without_logo.csv");

  XLSX.writeFile(wb, outputExcelPath);
  console.log(`Excel file created at: ${outputExcelPath}`);

  // Also write CSV version of sheet 1 for convenience
  const csvContent = XLSX.utils.sheet_to_csv(ws1);
  fs.writeFileSync(outputCsvPath, csvContent, "utf8");
  console.log(`CSV file created at: ${outputCsvPath}`);

  console.log("\n==========================================");
  console.log("             EXPORT COMPLETED             ");
  console.log("==========================================");
  console.log(`Total Brands: ${allBrands.length}`);
  console.log(`Brands with Logo: ${countWithLogo}`);
  console.log(`Brands WITHOUT Logo: ${countMissingLogo}`);
  console.log(`Brands Without Logo with Active Products: ${countMissingWithProducts}`);
  console.log(`Excel Location: ${outputExcelPath}`);
  console.log(`CSV Location: ${outputCsvPath}`);
  console.log("==========================================\n");

  await mongoose.disconnect();
}

generateExcel().catch((err) => {
  console.error("Error generating Excel:", err);
  process.exit(1);
});
