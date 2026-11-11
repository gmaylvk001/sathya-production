import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import BlogFaq from "@/models/BlogFaq";
import * as XLSX from "xlsx";

/**
 * Parses raw MySQL / TSV dump of blogs_faq table
 * Standard format: id \t exist_id \t question \t answer (\t timestamp)
 */
function parseRawFaqTsvDump(text) {
  const lines = text.split(/\r?\n/);
  const rows = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check if line starts with numeric ID and tab
    if (/^\d+\t\d+\t/.test(line)) {
      const parts = line.split("\t");
      if (parts.length >= 4) {
        rows.push({
          id: parts[0]?.trim() || "",
          exist_id: parts[1]?.trim() || "",
          question: parts[2]?.trim() || "",
          answer: parts[3]?.trim() || "",
          timestamp: parts[4]?.trim() || "",
        });
      }
    }
  }

  return rows.length > 0 ? rows : null;
}

export async function POST(req) {
  try {
    await dbConnect();

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No FAQ file uploaded" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let rows = [];

    // 1. Try text-based TSV / MySQL dump
    const asText = buffer.toString("utf8");
    const tsvRows = parseRawFaqTsvDump(asText);

    if (tsvRows && tsvRows.length > 0) {
      rows = tsvRows;
    } else {
      // 2. Try Excel / CSV with headers
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
        { success: false, error: "No data rows found in uploaded FAQ file" },
        { status: 400 }
      );
    }

    let insertedOrUpdated = 0;
    let errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 1;

      // Match foreign key: "exist id", "exist_id", "existId", "blog_id", "blogId"
      const existId = String(
        row["exist id"] ??
        row["exist_id"] ??
        row["existId"] ??
        row["exist ID"] ??
        row["Exist Id"] ??
        row.blog_id ??
        row.blogId ??
        row.blog_ids ??
        ""
      ).trim();

      const question = String(
        row.question ??
        row.Question ??
        row.faq_question ??
        row.title ??
        row.q ??
        ""
      ).trim();

      const answer = String(
        row.answer ??
        row.Answer ??
        row.faq_answer ??
        row.description ??
        row.content ??
        row.a ??
        ""
      ).trim();

      if (!question || !answer) {
        errors.push(`Row ${rowIndex}: Missing question or answer`);
        continue;
      }

      if (!existId) {
        errors.push(`Row ${rowIndex}: Missing exist id / foreign key`);
        continue;
      }

      // Only store the FAQ data — blogId linking is done later via the Match button
      try {
        await BlogFaq.findOneAndUpdate(
          {
            existId: existId,
            question: question,
          },
          {
            existId: existId,
            question: question,
            answer: answer,
          },
          { upsert: true, new: true }
        );
        insertedOrUpdated++;
      } catch (saveErr) {
        console.error(`Error saving FAQ row ${rowIndex}:`, saveErr);
        errors.push(`Row ${rowIndex}: ${saveErr.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      totalRows: rows.length,
      insertedOrUpdated,
      errorsCount: errors.length,
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    console.error("FAQ Bulk upload error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process FAQ bulk upload" },
      { status: 500 }
    );
  }
}
