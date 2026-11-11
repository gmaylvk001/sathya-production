import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import PaymentOffer from "@/models/PaymentOffer";
import Bank from "@/models/Bank";

export const dynamic = "force-dynamic";

/**
 * Parse raw CSV string into array of objects
 */
function parseCSV(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  // Parse header line
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    // Regex matching CSV values taking commas inside quotes into account
    const values = [];
    let insideQuotes = false;
    let currentValue = "";

    for (let charIdx = 0; charIdx < rawLine.length; charIdx++) {
      const char = rawLine[charIdx];
      if (char === '"' || char === "'") {
        insideQuotes = !insideQuotes;
      } else if (char === "," && !insideQuotes) {
        values.push(currentValue.trim().replace(/^["']|["']$/g, ""));
        currentValue = "";
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim().replace(/^["']|["']$/g, ""));

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] !== undefined ? values[idx] : "";
    });
    records.push(row);
  }

  return records;
}

/**
 * POST /api/payment-offers/bulk-import
 * Accepts JSON { items: [...] } or FormData with CSV file "file"
 */
export async function POST(request) {
  try {
    await dbConnect();

    let rawItems = [];
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") || formData.get("csv");
      if (!file) {
        return NextResponse.json(
          { success: false, error: "No CSV file uploaded" },
          { status: 400 }
        );
      }
      const text = await file.text();
      rawItems = parseCSV(text);
    } else {
      const body = await request.json();
      if (Array.isArray(body.items)) {
        rawItems = body.items;
      } else if (typeof body.csv === "string") {
        rawItems = parseCSV(body.csv);
      }
    }

    if (!rawItems || rawItems.length === 0) {
      return NextResponse.json(
        { success: false, error: "No records found in CSV file" },
        { status: 400 }
      );
    }

    // Load all active banks into a lookup map
    const allBanks = await Bank.find().lean();
    const bankMap = new Map();
    allBanks.forEach((b) => {
      if (b.code) bankMap.set(b.code.toUpperCase(), b._id);
      if (b.shortCode) bankMap.set(b.shortCode.toUpperCase(), b._id);
      if (b.name) bankMap.set(b.name.toUpperCase(), b._id);
    });

    const validOffers = [];
    const errors = [];

    rawItems.forEach((row, index) => {
      const rowNum = index + 2; // Row number in original CSV
      const bankCode = (
        row.bankCode ||
        row.bank ||
        row.code ||
        ""
      ).trim().toUpperCase();

      const bankId = bankMap.get(bankCode);
      if (!bankId) {
        errors.push(`Row ${rowNum}: Unknown bankCode "${bankCode}". Available: ${Array.from(bankMap.keys()).slice(0, 8).join(", ")}`);
        return;
      }

      let offerType = (row.offerType || row.type || "BANK_OFFER")
        .trim()
        .toUpperCase();
      if (!["BANK_OFFER", "EMI_OFFER"].includes(offerType)) {
        if (offerType.includes("EMI")) offerType = "EMI_OFFER";
        else offerType = "BANK_OFFER";
      }

      const title =
        row.title ||
        row.name ||
        `${bankCode} ${offerType === "EMI_OFFER" ? "EMI Scheme" : "Instant Discount"}`;
      const description = row.description || row.terms || "";

      const discountType = (row.discountType || "PERCENTAGE").toUpperCase().includes("FLAT")
        ? "FLAT"
        : "PERCENTAGE";

      const discountValue = Number(row.discountValue || row.discount || 0) || 0;
      const maxDiscountLimit = Number(row.maxLimit || row.maxDiscountLimit || 0) || 0;
      const minOrderValue = Number(row.minOrder || row.minOrderValue || 0) || 0;

      const cardTypeRaw = (row.cardType || "ALL").toUpperCase();
      const cardType = ["CREDIT", "DEBIT", "NETBANKING"].includes(cardTypeRaw)
        ? cardTypeRaw
        : "ALL";

      const isNoCost = ["TRUE", "1", "YES", "Y"].includes(
        String(row.isNoCost || "").trim().toUpperCase()
      );

      const tenureMonths = Number(row.tenureMonths || row.tenure || (offerType === "EMI_OFFER" ? 6 : 0)) || 0;
      const annualInterestRate = isNoCost
        ? 0
        : Number(row.interestRate || row.annualInterestRate || (offerType === "EMI_OFFER" ? 14 : 0)) || 0;

      const priority = Number(row.priority || 50) || 50;
      const isActive =
        row.isActive !== undefined && row.isActive !== ""
          ? !["FALSE", "0", "NO", "N"].includes(String(row.isActive).trim().toUpperCase())
          : true;

      validOffers.push({
        bank: bankId,
        bankId: bankId,
        title,
        name: title,
        description,
        offerType,
        discountType,
        discountValue,
        maxDiscountLimit,
        minOrderValue,
        cardType,
        applicableCategories: ["ALL"],
        emiDetails: {
          tenureMonths,
          annualInterestRate,
          isNoCost,
        },
        priority,
        isActive,
      });
    });

    if (validOffers.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No valid rows could be parsed. Check errors list.",
          errors,
        },
        { status: 400 }
      );
    }

    const inserted = await PaymentOffer.insertMany(validOffers, { ordered: false });

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${inserted.length} payment offers`,
      insertedCount: inserted.length,
      totalRows: rawItems.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Bulk import error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
