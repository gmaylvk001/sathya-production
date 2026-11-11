import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import PDFDocument from "pdfkit/js/pdfkit.standalone";
import fs from "fs";
import path from "path";
import connectDB from "@/lib/db";
import Product from "@/models/product";
import Category from "@/models/ecom_category_info";
import FilterGroup from "@/models/ecom_filter_group_infos";
import Filter from "@/models/ecom_filter_infos";
import ProductFilter from "@/models/ecom_productfilter_info";

export const dynamic = "force-dynamic";

/**
 * Format timestamp as "YYYY-MM-DD hh:mm AM/PM"
 */
function formatPdfDateTime(date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).formatToParts(date);

    let year = "",
      month = "",
      day = "",
      hour = "",
      minute = "",
      dayPeriod = "";

    parts.forEach((p) => {
      if (p.type === "year") year = p.value;
      if (p.type === "month") month = p.value;
      if (p.type === "day") day = p.value;
      if (p.type === "hour") hour = p.value;
      if (p.type === "minute") minute = p.value;
      if (p.type === "dayPeriod") {
        dayPeriod = p.value.toUpperCase().replace(/\./g, "");
      }
    });

    return `${year}-${month}-${day} ${hour}:${minute} ${dayPeriod}`;
  } catch (err) {
    const now = new Date();
    const dStr = now.toISOString().slice(0, 10);
    let hrs = now.getHours();
    const ampm = hrs >= 12 ? "PM" : "AM";
    hrs = hrs % 12 || 12;
    const mins = String(now.getMinutes()).padStart(2, "0");
    return `${dStr} ${String(hrs).padStart(2, "0")}:${mins} ${ampm}`;
  }
}

/**
 * Validate JWT Token
 */
function verifyAuthToken(req) {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  let token = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else {
    const url = new URL(req.url);
    token = url.searchParams.get("token");
  }

  if (!token) {
    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(/(?:^|; )token=([^;]*)/);
    if (match) token = decodeURIComponent(match[1]);
  }

  if (!token) return null;

  try {
    const secret = process.env.JWT_SECRET || "sathya_ecom_secret_key";
    return jwt.verify(token, secret);
  } catch (err) {
    try {
      const decoded = jwt.decode(token);
      if (decoded && (decoded.userId || decoded.id || decoded.email)) return decoded;
    } catch (_) {}
    return null;
  }
}

/**
 * Generate Category / Subcategory / Division / Search PDF Buffer
 */
function createCategoryPdfBuffer({ title, products = [] }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 36,
        size: "A4",
        bufferPages: true,
      });

      doc.info.Title = `${title} PDF Export`;
      doc.info.Author = "SATHYA Store";
      doc.info.Subject = `${title} Product Export`;

      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      // 1. Sathya Logo
      const logoPath = path.join(process.cwd(), "public", "uploads", "sathya-header-logo.png");
      if (fs.existsSync(logoPath)) {
        const logoBase64 =
          "data:image/png;base64," + fs.readFileSync(logoPath).toString("base64");
        doc.image(logoBase64, (595.28 - 75) / 2, 28, {
          width: 75,
          height: 42.75,
        });
      }

      // 2. Date & Time
      const dateTimeString = formatPdfDateTime();
      doc.font("Times-Roman").fontSize(11).fillColor("#000000");
      doc.text(`Date & Time : ${dateTimeString}`, 320, 42, {
        align: "right",
        width: 239,
      });

      // 3. Title Bar
      doc.rect(36, 82, 523, 26).fill("#d72828");
      doc.font("Helvetica-Bold").fontSize(12).fillColor("#ffffff");
      doc.text(title.toUpperCase(), 36, 89, { align: "center", width: 523 });

      let y = 120;

      // Table Header
      doc.rect(36, y, 523, 18).fill("#e2e8f0");
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#334155");
      doc.text("S.No", 42, y + 5, { width: 30 });
      doc.text("Product Name", 75, y + 5, { width: 255 });
      doc.text("MRP (₹)", 335, y + 5, { width: 55, align: "right" });
      doc.text("Final Price (₹)", 395, y + 5, { width: 55, align: "right" });
      doc.text("Discount", 455, y + 5, { width: 50, align: "center" });
      doc.text("Stock Status", 510, y + 5, { width: 45, align: "center" });
      y += 20;

      // Check if no products found (Edge case handling)
      if (products.length === 0) {
        doc.rect(36, y, 523, 26).fill("#fcfcfc");
        doc.font("Helvetica").fontSize(9).fillColor("#64748b");
        doc.text("No matching products found for the selected criteria.", 36, y + 8, {
          align: "center",
          width: 523,
        });
        y += 30;
      } else {
        // Product Rows
        products.forEach((prod, idx) => {
          if (y > 765) {
            doc.addPage();
            y = 45;
          }

          const price = Number(prod.price) || 0;
          const finalPrice = Number(prod.final_price) || Number(prod.special_price) || price;
          const discountPct =
            price > finalPrice && price > 0
              ? `${Math.round(((price - finalPrice) / price) * 100)}% OFF`
              : "-";

          const isStock =
            prod.stock_status === "In Stock" ||
            (Number(prod.quantity) && Number(prod.quantity) > 0);

          if (idx % 2 === 0) {
            doc.rect(36, y, 523, 18).fill("#fcfcfc");
          }

          doc.font("Helvetica").fontSize(8).fillColor("#1e293b");
          doc.text(String(idx + 1), 42, y + 4, { width: 30 });

          doc.text(prod.name || "Sathya Product", 75, y + 4, {
            width: 255,
            height: 14,
            ellipsis: true,
          });

          doc.fillColor("#94a3b8");
          doc.text(
            price > 0 ? `₹${Math.round(price).toLocaleString("en-IN")}` : "-",
            335,
            y + 4,
            { width: 55, align: "right" }
          );

          doc.font("Helvetica-Bold").fillColor("#d72828");
          doc.text(
            finalPrice > 0 ? `₹${Math.round(finalPrice).toLocaleString("en-IN")}` : "-",
            395,
            y + 4,
            { width: 55, align: "right" }
          );

          doc.fillColor("#059669");
          doc.text(discountPct, 455, y + 4, { width: 50, align: "center" });

          doc.fillColor(isStock ? "#16a34a" : "#dc2626");
          doc.text(isStock ? "In Stock" : "Out of Stock", 510, y + 4, {
            width: 45,
            align: "center",
          });

          y += 18;
        });
      }

      // Page Numbers and Footer
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.font("Helvetica").fontSize(7.5).fillColor("#94a3b8");
        doc.text(
          "SATHYA Agencies Pvt Ltd | Product Export | Visit: www.sathya.store",
          36,
          805,
          { width: 350 }
        );
        doc.text(`Page ${i + 1} of ${range.count}`, 450, 805, {
          width: 109,
          align: "right",
        });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Unified PDF Export Endpoint:
 * Supports:
 * 1. 'deals-offer' (deals_offer_pdf_export)
 * 2. 'category' (category_pdf_export)
 * 3. 'sub_category' / 'sub-category' (sub_category_pdf_export)
 * 4. 'category_division' / 'division' (category_division_pdf_export)
 * 5. 'search' (search_pdf_export)
 */
export async function POST(req) {
  try {
    const decodedUser = verifyAuthToken(req);
    if (!decodedUser) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to download the PDF.", status: 0 },
        { status: 401 }
      );
    }

    await connectDB();

    let body = {};
    try {
      body = await req.json();
    } catch (_) {}

    const url = new URL(req.url);
    const rawType = body.type || url.searchParams.get("type") || "category";
    const type = rawType.replace(/_/g, "-").toLowerCase();
    const title =
      body.title ||
      `${type.replace(/-/g, " ").toUpperCase()} EXPORT`;

    // Base Product Filter: status = 'Active', final_price > 10
    const filterQuery = {
      status: "Active",
      $or: [
        { final_price: { $gt: 10 } },
        { special_price: { $gt: 10 } },
        { price: { $gt: 10 } },
      ],
    };

    // 1. Search Mode: search_pdf_export
    if (type === "search" || body.q || url.searchParams.get("q")) {
      const rawSearch = String(body.q || url.searchParams.get("q") || "").trim();
      if (rawSearch) {
        // Sanitize search string against regex injection / special SQL characters
        const safeSearch = rawSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        filterQuery.$and = filterQuery.$and || [];
        filterQuery.$and.push({
          $or: [
            { name: { $regex: safeSearch, $options: "i" } },
            { item_code: { $regex: safeSearch, $options: "i" } },
            { model_number: { $regex: safeSearch, $options: "i" } },
            { brand: { $regex: safeSearch, $options: "i" } },
            { search_keywords: { $regex: safeSearch, $options: "i" } },
          ],
        });
      }
      // For search, exclude product_type == 'gift'
      filterQuery.product_type = { $ne: "gift" };
    }

    // 2. Category Filter: category_pdf_export
    const catParam = body.category_id || body.category_slug || url.searchParams.get("category_id");
    if (catParam) {
      const safeCat = String(catParam).trim();
      filterQuery.$and = filterQuery.$and || [];
      filterQuery.$and.push({
        $or: [
          { category: safeCat },
          { category_new: safeCat },
          { category: { $regex: `^${safeCat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } },
        ],
      });
    }

    // 3. Sub-Category Filter: sub_category_pdf_export
    const subCatParam =
      body.sub_category_id ||
      body.sub_category_slug ||
      url.searchParams.get("sub_category_id");
    if (subCatParam) {
      const safeSubCat = String(subCatParam).trim();
      filterQuery.$and = filterQuery.$and || [];
      filterQuery.$and.push({
        $or: [
          { sub_category: safeSubCat },
          { sub_category_new: safeSubCat },
          { sub_category_new_name: { $regex: safeSubCat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
        ],
      });
    }

    // 4. Division Filter: category_division_pdf_export
    const divisionParam = body.division_id || url.searchParams.get("division_id");
    if (divisionParam) {
      const safeDiv = String(divisionParam).trim();
      filterQuery.$and = filterQuery.$and || [];
      filterQuery.$and.push({
        $or: [
          { category: safeDiv },
          { category_new: safeDiv },
        ],
      });
    }

    // 5. Dynamic Request Filters:
    // A. Price filter: min_max split by '_'
    const priceFilter = body.price || url.searchParams.get("price");
    if (priceFilter && typeof priceFilter === "string" && priceFilter.includes("_")) {
      const parts = priceFilter.split("_");
      const min = Math.max(0, Number(parts[0]) || 0);
      const max = Math.max(min, Number(parts[1]) || 9999999);

      // In category_division_pdf_export, also check final_price > 5000
      const effectiveMin = (type === "category-division" || type === "division") ? Math.max(min, 5001) : min;

      filterQuery.$and = filterQuery.$and || [];
      filterQuery.$and.push({
        $or: [
          { final_price: { $gte: effectiveMin, $lte: max } },
          { special_price: { $gte: effectiveMin, $lte: max } },
          { price: { $gte: effectiveMin, $lte: max } },
        ],
      });
    }

    // B. Offers filter: only products with active deal / special price discount
    const offersFilter = body.offers || url.searchParams.get("offers");
    if (offersFilter === "1" || offersFilter === 1 || offersFilter === "true") {
      filterQuery.$and = filterQuery.$and || [];
      filterQuery.$and.push({
        $or: [
          { special_price: { $gt: 0 } },
          { final_price: { $gt: 0 } },
        ],
      });
    }

    // C. Stock filter: quantity != 0
    const stockFilter = body.stock || url.searchParams.get("stock");
    if (stockFilter === "1" || stockFilter === 1 || stockFilter === "true") {
      filterQuery.quantity = { $gt: 0 };
    }

    // D. Brand filter / Dynamic Filter Group slugs
    const brandFilter = body.brand || url.searchParams.get("brand");
    if (brandFilter) {
      const safeBrand = String(brandFilter).trim();
      filterQuery.brand = { $regex: safeBrand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    }

    // Execute query safely
    let products = await Product.find(filterQuery)
      .select("name price special_price final_price quantity stock_status brand movement item_code")
      .lean();

    // 6. Buy-Now Priority Ordering:
    // Products whose movement is 'CUS-Order' OR (movement contains Fast/Open/EXSTK AND status == 'Active' AND quantity != 0)
    // must be ordered FIRST!
    const isBuyNow = (p) => {
      const mov = String(p.movement || "");
      const isCus = mov.toLowerCase().includes("cus-order");
      const isFastOpenEx =
        /fast|open|exstk/i.test(mov) &&
        p.status === "Active" &&
        Number(p.quantity || 0) > 0;
      return isCus || isFastOpenEx;
    };

    const sortBy = body.sort_by || url.searchParams.get("sort_by") || "default";

    products.sort((a, b) => {
      const buyNowA = isBuyNow(a) ? 1 : 0;
      const buyNowB = isBuyNow(b) ? 1 : 0;

      // Buy-Now priority: buy-now products come first
      if (buyNowB !== buyNowA) {
        return buyNowB - buyNowA;
      }

      const priceA = Number(a.final_price) || Number(a.special_price) || Number(a.price) || 0;
      const priceB = Number(b.final_price) || Number(b.special_price) || Number(b.price) || 0;

      // Secondary Sort mapping:
      // price_desc -> final_price ASC (matching reference PDFController)
      // new_desc   -> id ASC
      // price_asc  -> final_price DESC
      // default    -> quantity ASC
      if (sortBy === "price_desc") {
        return priceA - priceB;
      } else if (sortBy === "price_asc") {
        return priceB - priceA;
      } else if (sortBy === "new_desc") {
        return String(a._id).localeCompare(String(b._id));
      } else {
        return (Number(a.quantity) || 0) - (Number(b.quantity) || 0);
      }
    });

    // Generate PDF Buffer
    const pdfBuffer = await createCategoryPdfBuffer({
      title,
      products: products.slice(0, 150),
    });

    // Generate 4-digit filename
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const fileName = `${randomNum}.pdf`;

    const exportDir = path.join(process.cwd(), "public", "php-excel-export");
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    fs.writeFileSync(path.join(exportDir, fileName), pdfBuffer);

    return NextResponse.json({
      status: 1,
      file_name: fileName,
      url: `/php-excel-export/${fileName}`,
      count: products.length,
    });
  } catch (error) {
    console.error("Error in PDF export API:", error);
    return NextResponse.json(
      { error: "Internal Server Error while generating PDF", status: 0 },
      { status: 500 }
    );
  }
}
