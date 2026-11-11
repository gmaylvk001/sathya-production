import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Blogs from "@/models/Blogs";
import Category from "@/models/ecom_category_info";
import * as XLSX from "xlsx";

function slugify(text = "") {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeImagePath(imgPath) {
  if (!imgPath) return "";
  let clean = String(imgPath).trim();
  if (!clean || clean.toLowerCase() === "\\n" || clean.toLowerCase() === "null") return "";
  if (clean.startsWith("http://") || clean.startsWith("https://") || clean.startsWith("data:")) {
    return clean;
  }
  if (clean.startsWith("/")) {
    return clean;
  }
  if (clean.startsWith("uploads/")) {
    return `/${clean}`;
  }
  return `/uploads/blogs/${clean}`;
}

const SQL_CATEGORY_MAPPING = {
  "1": "Television",
  "2": "LED TV",
  "4": "Air Conditioner",
  "5": "Refrigerator",
  "6": "Washing Machine",
  "32": "Mobiles",
  "33": "Table Top Wet Grinder",
  "38": "Mixers",
  "87": "Laptops",
  "90": "Computer Accessories",
};

/**
 * Parses MySQL / phpMyAdmin TSV dump where records start with `\d+\t`
 * and description contains multiline unescaped HTML.
 */
function parseRawSqlDump(text) {
  const lines = text.split(/\r?\n/);
  const recordStarts = [];

  for (let i = 0; i < lines.length; i++) {
    // A record line in MySQL TSV dump starts with: numeric ID \t title \t slug \t
    if (/^\d+\t[^\t]+\t[^\t]+\t/.test(lines[i])) {
      recordStarts.push(i);
    }
  }

  if (recordStarts.length === 0) return null;

  const colNames = [
    "id", "title", "slug", "banner_image", "featured_image",
    "short_description", "description", "author", "reading_time",
    "publish_date", "views", "category_id", "store_id",
    "store_ids", "all_stores", "meta_title", "meta_keywords",
    "meta_description", "status", "created_at", "updated_at"
  ];

  const rows = [];

  for (let r = 0; r < recordStarts.length; r++) {
    const start = recordStarts[r];
    const end = r + 1 < recordStarts.length ? recordStarts[r + 1] : lines.length;
    const fullBlock = lines.slice(start, end).join("\n");
    const cols = fullBlock.split("\t");

    const rowObj = {};
    colNames.forEach((name, idx) => {
      let val = cols[idx] !== undefined ? cols[idx].trim() : "";
      if (val === "\\N" || val === "\\n") val = "";
      rowObj[name] = val;
    });

    rows.push(rowObj);
  }

  return rows;
}

export async function POST(req) {
  try {
    await dbConnect();

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No Excel or CSV file uploaded" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let rows = [];

    // Check if the file is a text-based TSV / MySQL dump
    const asText = buffer.toString("utf8");
    const rawSqlRows = parseRawSqlDump(asText);

    if (rawSqlRows && rawSqlRows.length > 0) {
      rows = rawSqlRows;
    } else {
      // Standard Excel (.xlsx, .xls) or standard CSV with headers
      const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        return NextResponse.json(
          { success: false, error: "Spreadsheet sheet is empty" },
          { status: 400 }
        );
      }

      const sheet = workbook.Sheets[firstSheetName];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "No data rows found in uploaded file" },
        { status: 400 }
      );
    }

    // Pre-fetch categories map from DB
    let categoryMap = new Map();
    try {
      const allCats = await Category.find().lean();
      allCats.forEach((cat) => {
        if (cat._id) categoryMap.set(String(cat._id), cat.category_name);
        if (cat.id) categoryMap.set(String(cat.id), cat.category_name);
      });
    } catch (catErr) {
      console.warn("Category lookup pre-fetch skipped:", catErr?.message);
    }

    let inserted = 0;
    let updated = 0;
    let errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 1;

      const title = row.title || row.blogTitle || row.blog_title || row.Title || "";
      if (!title || !String(title).trim()) {
        errors.push(`Row ${rowIndex}: Skipped because title is missing`);
        continue;
      }

      let slug = row.slug || row.blog_slug || row.Slug || "";
      if (!slug || !String(slug).trim()) {
        slug = slugify(title);
      } else {
        slug = slugify(slug);
      }

      const bannerImage = normalizeImagePath(row.banner_image || row.bannerImage || row.banner);
      const featuredImage = normalizeImagePath(row.featured_image || row.featuredImage || row.image);
      let shortDescription = String(row.short_description || row.shortDescription || "").trim();
      let description = String(row.description || row.content || "").trim();

      // Clean up unnecessary backslashes (SQL/CSV escape artifacts)
      const cleanEscapes = (str) => {
        return str
          .replace(/\\n/g, "\n")    // preserve literal newlines
          .replace(/\\r/g, "")      // remove literal carriage returns
          .replace(/\\/g, "");      // brutally remove any other stray backslash
      };

      shortDescription = cleanEscapes(shortDescription);
      description = cleanEscapes(description);
      const author = String(row.author || "Admin").trim();

      const readingTime = parseInt(row.reading_time || row.readingTime, 10) || 5;
      const views = parseInt(row.views, 10) || 0;

      let publishDate = new Date();
      const rawDate = row.publish_date || row.publishDate || row.created_at || row.createdAt;
      if (rawDate) {
        const parsedDate = new Date(rawDate);
        if (!isNaN(parsedDate.getTime())) {
          publishDate = parsedDate;
        }
      }

      const category_id = String(row.category_id || "").trim();
      let category = String(row.category || row.category_name || "").trim();

      if (!category && category_id) {
        if (SQL_CATEGORY_MAPPING[category_id]) {
          category = SQL_CATEGORY_MAPPING[category_id];
        } else if (categoryMap.has(category_id)) {
          category = categoryMap.get(category_id);
        } else {
          category = "General";
        }
      }

      const metaTitle = String(row.meta_title || row.metaTitle || title).trim();
      const metaKeywords = String(row.meta_keywords || row.metaKeywords || "").trim();
      const metaDescription = String(row.meta_description || row.metaDescription || shortDescription).trim();

      const rawStatus = String(row.status || "Active").toLowerCase().trim();
      const status = rawStatus === "inactive" || rawStatus === "0" ? "Inactive" : "Active";

      const existId = String(row.id || row.existId || row.blog_id || "").trim();

      const blogDoc = {
        blogTitle: String(title).trim(),
        slug,
        bannerImage,
        featuredImage,
        shortDescription,
        description,
        author,
        readingTime,
        publishDate,
        views,
        category: category || "General",
        category_id,
        metaTitle,
        metaKeywords,
        metaDescription,
        status,
      };

      if (existId) {
        blogDoc.existId = existId;
      }

      try {
        let existing = null;
        if (existId) {
          existing = await Blogs.findOne({ $or: [{ slug }, { existId }] });
        } else {
          existing = await Blogs.findOne({ slug });
        }

        if (existing) {
          await Blogs.findByIdAndUpdate(existing._id, blogDoc);
          updated++;
        } else {
          await Blogs.create(blogDoc);
          inserted++;
        }
      } catch (saveErr) {
        console.error(`Error saving blog row ${rowIndex}:`, saveErr);
        errors.push(`Row ${rowIndex} (${title}): ${saveErr.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      totalRows: rows.length,
      inserted,
      updated,
      errorsCount: errors.length,
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    console.error("Bulk upload error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process bulk upload" },
      { status: 500 }
    );
  }
}
