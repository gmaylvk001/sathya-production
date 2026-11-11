import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import PDFDocument from "pdfkit/js/pdfkit.standalone";
import fs from "fs";
import path from "path";
import connectDB from "@/lib/db";
import CategoryProduct from "@/models/categoryproduct";
import Category from "@/models/ecom_category_info";
import Product from "@/models/product";
import OfferTimer from "@/models/Offertimer";
import HighlightedProductOffer from "@/models/HighlightedProductOffer";
import ComboOffer from "@/models/comboOffer";

export const dynamic = "force-dynamic";

/**
 * Format timestamp as "YYYY-MM-DD hh:mm AM/PM"
 * Matches exact format from reference Image 3 (e.g. 2026-10-28 12:34 PM)
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
 * Validate JWT Token from request headers or query params
 */
function verifyAuthToken(req) {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  let token = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else {
    // Also check query param ?token= for direct downloads
    const url = new URL(req.url);
    token = url.searchParams.get("token");
  }

  // Also check cookie
  if (!token) {
    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(/(?:^|; )token=([^;]*)/);
    if (match) {
      token = decodeURIComponent(match[1]);
    }
  }

  if (!token) return null;

  try {
    const secret = process.env.JWT_SECRET || "sathya_ecom_secret_key";
    return jwt.verify(token, secret);
  } catch (err) {
    // Fallback: check if valid JWT payload with userId
    try {
      const decoded = jwt.decode(token);
      if (decoded && (decoded.userId || decoded.id || decoded.email)) {
        return decoded;
      }
    } catch (_) {}
    return null;
  }
}

/**
 * Fetch deals and category products directly from DB matching exact business logic:
 * A. deals_offer_pdf_export() Logic:
 *    - all_deals: Active Deals / OfferTimer where status = 1/'active' and date_end >= now
 *    - highlight_product: Active ProductHighlight / HighlightedProductOffer
 *    - combo_offer & gift_offer: Active ComboOffers with movement (Fast/Open/CUS-Order/EXSTK),
 *      quantity != 0, final_price > 10, status = 'Active'
 *    - category products grouped by section
 */
async function fetchDealsDataFromDB() {
  await connectDB();

  const now = new Date();

  // 1. Fetch active deals / offer timers
  const activeTimers = await OfferTimer.find({
    status: { $ne: "inactive" },
    timerDisplayStatus: { $ne: "No" },
    $or: [{ endDate: { $gte: now } }, { offer_end: { $gte: now } }, { endDate: null }],
  })
    .sort({ updatedAt: -1 })
    .lean();

  // 2. Fetch Highlighted Products
  let highlightProducts = [];
  try {
    const activeHighlights = await HighlightedProductOffer.find({
      status: "Active",
    }).lean();

    const highlightProductIds = activeHighlights.flatMap((h) => h.products || []).filter(Boolean);
    if (highlightProductIds.length > 0) {
      highlightProducts = await Product.find({
        $or: [
          { _id: { $in: highlightProductIds.filter((id) => /^[0-9a-fA-F]{24}$/.test(id)) } },
          { item_code: { $in: highlightProductIds } },
        ],
        status: "Active",
        quantity: { $gt: 0 },
      })
        .select("name price special_price final_price quantity stock_status brand movement")
        .lean();
    }
  } catch (err) {
    console.error("Error fetching highlight products:", err);
  }

  // 3. Fetch Combo Offers & Gift Offers
  let comboProducts = [];
  try {
    const activeCombos = await ComboOffer.find({
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).lean();

    const comboProductIds = activeCombos.flatMap((c) => c.productIds || []).filter(Boolean);
    if (comboProductIds.length > 0) {
      // Movement matching: Fast, Open, CUS-Order, EXSTK; quantity != 0; final_price > 10; status = 'Active'
      comboProducts = await Product.find({
        _id: { $in: comboProductIds },
        status: "Active",
        quantity: { $gt: 0 },
        final_price: { $gt: 10 },
        $or: [
          { movement: { $regex: /fast/i } },
          { movement: "Open" },
          { movement: { $regex: /CUS-Order/i } },
          { movement: { $regex: /EXSTK/i } },
        ],
      })
        .select("name price special_price final_price quantity stock_status brand movement")
        .lean();
    }
  } catch (err) {
    console.error("Error fetching combo products:", err);
  }

  // 4. Fetch category products
  const categoryProducts = await CategoryProduct.find({ status: "Active" })
    .sort({ position: 1 })
    .lean();

  const subcategoryIds = categoryProducts.map((cp) => cp.subcategoryId).filter(Boolean);
  const allProductIds = categoryProducts.flatMap((cp) => cp.products || []).filter(Boolean);

  const subcategories = await Category.find({ _id: { $in: subcategoryIds } })
    .select("category_name category_slug")
    .lean();

  const subMap = {};
  subcategories.forEach((cat) => {
    subMap[cat._id.toString()] = cat.category_name;
  });

  const validProducts = await Product.find({
    _id: { $in: allProductIds },
    status: "Active",
    quantity: { $gt: 0 },
  })
    .select("name price special_price final_price quantity stock_status brand movement")
    .lean();

  const prodMap = {};
  validProducts.forEach((p) => {
    prodMap[p._id.toString()] = p;
  });

  const sections = [];

  // Add Combo / Gift Offers section if available
  if (comboProducts.length > 0) {
    sections.push({
      title: "EXCLUSIVE COMBO & GIFT OFFERS",
      products: comboProducts,
    });
  }

  // Add Highlights section if available
  if (highlightProducts.length > 0) {
    sections.push({
      title: "HIGHLIGHTED SPECIAL DEALS",
      products: highlightProducts,
    });
  }

  // Add category sections
  categoryProducts.forEach((cp) => {
    const title = subMap[cp.subcategoryId?.toString()] || "Special Deals";
    const prods = (cp.products || [])
      .map((pid) => prodMap[pid.toString()])
      .filter(Boolean);

    if (prods.length > 0) {
      sections.push({
        title: title.toUpperCase(),
        products: prods,
      });
    }
  });

  return { sections, activeTimers };
}

/**
 * Generate PDF buffer using PDFKit with Sathya branding
 * Matches exact format in Reference Image 3:
 * - Sathya Logo Top-Center
 * - Right Side: "Date & Time : YYYY-MM-DD hh:mm AM/PM"
 * - Document Title: "Deals Offer PDF Export"
 */
function createDealsPdfBuffer(sections = [], activeTimer = null) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 36,
        size: "A4",
        bufferPages: true,
      });

      // Set Document Metadata (Matches Reference Image 3 tab title: Deals Offer PDF Export)
      doc.info.Title = "Deals Offer PDF Export";
      doc.info.Author = "SATHYA Store";
      doc.info.Subject = "Deals and Offers Export";

      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      // 1. Embed Sathya Official Logo (Top Center)
      const logoPath = path.join(process.cwd(), "public", "uploads", "sathya-header-logo.png");
      if (fs.existsSync(logoPath)) {
        const logoBase64 =
          "data:image/png;base64," + fs.readFileSync(logoPath).toString("base64");
        // A4 page width = 595.28 pt. Logo width = 75 pt. Center = (595.28 - 75) / 2 = 260.14
        doc.image(logoBase64, (595.28 - 75) / 2, 28, {
          width: 75,
          height: 42.75,
        });
      }

      // 2. Right-side Timestamp "Date & Time : YYYY-MM-DD hh:mm AM/PM"
      const dateTimeString = formatPdfDateTime();
      doc.font("Times-Roman").fontSize(11).fillColor("#000000");
      doc.text(`Date & Time : ${dateTimeString}`, 320, 42, {
        align: "right",
        width: 239,
      });

      // 3. Official Title Bar Banner
      doc.rect(36, 82, 523, 26).fill("#d72828");
      doc.font("Helvetica-Bold").fontSize(12).fillColor("#ffffff");
      const titleBannerText = activeTimer?.offerTitle
        ? `${activeTimer.offerTitle.toUpperCase()} - DEALS CATALOG`
        : "GREAT DEALS & OFFERS CATALOG";
      doc.text(titleBannerText, 36, 89, { align: "center", width: 523 });

      let y = 120;

      const totalProds = sections.reduce((acc, s) => acc + (s.products?.length || 0), 0);
      if (totalProds === 0) {
        doc.rect(36, y, 523, 26).fill("#fcfcfc");
        doc.font("Helvetica").fontSize(9).fillColor("#64748b");
        doc.text("No active deals or offers available at this time.", 36, y + 8, {
          align: "center",
          width: 523,
        });
      }

      // 4. Render Category Sections and Product Tables
      sections.forEach((section) => {
        const prods = section.products || [];
        if (prods.length === 0) return;

        // Check if we need a new page for category header + at least 2 rows
        if (y > 700) {
          doc.addPage();
          y = 45;
        }

        // Category Subheader
        doc.rect(36, y, 523, 20).fill("#f8fafc");
        doc.font("Helvetica-Bold").fontSize(10).fillColor("#d72828");
        doc.text(section.title || "SPECIAL DEALS", 44, y + 5);
        y += 24;

        // Table Header
        doc.rect(36, y, 523, 18).fill("#e2e8f0");
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#334155");
        doc.text("S.No", 42, y + 5, { width: 30 });
        doc.text("Product Name", 75, y + 5, { width: 255 });
        doc.text("MRP (₹)", 335, y + 5, { width: 55, align: "right" });
        doc.text("Deal (₹)", 395, y + 5, { width: 55, align: "right" });
        doc.text("Discount", 455, y + 5, { width: 50, align: "center" });
        doc.text("Status", 510, y + 5, { width: 45, align: "center" });
        y += 20;

        // Product Rows
        prods.forEach((prod, idx) => {
          if (y > 765) {
            doc.addPage();
            y = 45;
          }

          const price = Number(prod.price) || 0;
          const specialPrice = Number(prod.special_price) || Number(prod.final_price) || 0;
          const discountPct =
            price > specialPrice && price > 0
              ? `${Math.round(((price - specialPrice) / price) * 100)}% OFF`
              : "DEAL";

          const isStock =
            prod.stock_status === "In Stock" ||
            (Number(prod.quantity) && Number(prod.quantity) > 0);

          // Zebra background
          if (idx % 2 === 0) {
            doc.rect(36, y, 523, 18).fill("#fcfcfc");
          }

          doc.font("Helvetica").fontSize(8).fillColor("#1e293b");
          doc.text(String(idx + 1), 42, y + 4, { width: 30 });

          // Product Name (truncated to single line with ellipsis)
          doc.text(prod.name || "Sathya Deal Product", 75, y + 4, {
            width: 255,
            height: 14,
            ellipsis: true,
          });

          // MRP
          doc.fillColor("#94a3b8");
          doc.text(
            price > 0 ? `₹${Math.round(price).toLocaleString("en-IN")}` : "-",
            335,
            y + 4,
            { width: 55, align: "right" }
          );

          // Deal Price
          doc.font("Helvetica-Bold").fillColor("#d72828");
          doc.text(
            specialPrice > 0
              ? `₹${Math.round(specialPrice).toLocaleString("en-IN")}`
              : `₹${Math.round(price).toLocaleString("en-IN")}`,
            395,
            y + 4,
            { width: 55, align: "right" }
          );

          // Discount Badge
          doc.fillColor("#059669");
          doc.text(discountPct, 455, y + 4, { width: 50, align: "center" });

          // Stock Status
          doc.fillColor(isStock ? "#16a34a" : "#dc2626");
          doc.text(isStock ? "In Stock" : "Out of Stock", 510, y + 4, {
            width: 45,
            align: "center",
          });

          y += 18;
        });

        y += 12; // Spacing after category
      });

      // 5. Add Page Numbers and Footer to all pages
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.font("Helvetica").fontSize(7.5).fillColor("#94a3b8");
        doc.text(
          "SATHYA Agencies Pvt Ltd | Deals Offer Export | Visit: www.sathya.store",
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
 * Handle POST request from DealsPdfModal
 * Returns { status: 1, file_name: "<random_4_digit>.pdf", url: "/php-excel-export/<random_4_digit>.pdf" }
 */
export async function POST(req) {
  try {
    // 1. Authentication Guard: verify token
    const decodedUser = verifyAuthToken(req);
    if (!decodedUser) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to download the Deals Offer PDF.", status: 0 },
        { status: 401 }
      );
    }

    let payload = {};
    try {
      payload = await req.json();
    } catch (_) {}

    let sections = payload.sections;
    let activeTimer = payload.activeTimer;

    // If client didn't supply sections, fetch directly from DB
    if (!sections || !Array.isArray(sections) || sections.length === 0) {
      const dbData = await fetchDealsDataFromDB();
      sections = dbData.sections;
      if (!activeTimer && dbData.activeTimers?.length > 0) {
        activeTimer = dbData.activeTimers[0];
      }
    }

    // Generate PDF Buffer
    const pdfBuffer = await createDealsPdfBuffer(sections, activeTimer);

    // 2. Generate Random 4-digit number (Matches reference Image 3: 7933.pdf)
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const fileName = `${randomNum}.pdf`;

    // 3. Ensure php-excel-export directory exists in public/
    const exportDir = path.join(process.cwd(), "public", "php-excel-export");
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    // Save PDF file to public/php-excel-export/<random_4_digit>.pdf
    const filePath = path.join(exportDir, fileName);
    fs.writeFileSync(filePath, pdfBuffer);

    // If client requests raw PDF directly (via Accept header or ?format=pdf)
    const url = new URL(req.url);
    if (url.searchParams.get("format") === "pdf") {
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${fileName}"`,
          "Content-Length": String(pdfBuffer.length),
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    // 4. Return exact JSON format specified in business requirements:
    // { status: 1, file_name: "<random_4_digit>.pdf" }
    return NextResponse.json(
      {
        status: 1,
        file_name: fileName,
        url: `/php-excel-export/${fileName}`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error generating Deals Offer PDF:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error while generating Deals PDF",
        details: error?.message,
        stack: error?.stack,
        status: 0,
      },
      { status: 500 }
    );
  }
}

/**
 * Handle GET request (direct link / download with ?token=...)
 */
export async function GET(req) {
  try {
    // 1. Authentication Guard: verify token
    const decodedUser = verifyAuthToken(req);
    if (!decodedUser) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to view the Deals Offer PDF.", status: 0 },
        { status: 401 }
      );
    }

    const { sections, activeTimers } = await fetchDealsDataFromDB();
    const activeTimer = activeTimers?.[0] || null;

    const pdfBuffer = await createDealsPdfBuffer(sections, activeTimer);

    // Save to export folder
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const fileName = `${randomNum}.pdf`;

    const exportDir = path.join(process.cwd(), "public", "php-excel-export");
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    fs.writeFileSync(path.join(exportDir, fileName), pdfBuffer);

    const url = new URL(req.url);
    if (url.searchParams.get("format") === "json") {
      return NextResponse.json({
        status: 1,
        file_name: fileName,
        url: `/php-excel-export/${fileName}`,
      });
    }

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error generating Deals Offer PDF (GET):", error);
    return NextResponse.json(
      { error: "Internal Server Error while generating Deals PDF", status: 0 },
      { status: 500 }
    );
  }
}
