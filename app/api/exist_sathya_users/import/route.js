import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import { parseExistUserSheetDate, readExistUserSheetRows } from "@/lib/existUserSheetDates";
import ExistSathyaUser, { ensureExistSathyaUserIndexes } from "@/models/ExistSathyaUser";
import ExistSathyaUserSkipped from "@/models/ExistSathyaUserSkipped";

function emptyToNull(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }
  return String(value).trim();
}

function parseSheetDate(value) {
  return parseExistUserSheetDate(value);
}

function parseExistId(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  const text = String(value).trim();
  return text === "" ? null : text;
}

function normalizeExistIdKey(value) {
  const id = parseExistId(value);
  if (!id) return null;
  if (/^\d+(\.0+)?$/.test(id)) {
    return String(Math.trunc(Number(id)));
  }
  return id;
}

function getCell(row, keys) {
  for (const key of keys) {
    const compact = key.replace(/_/g, "");
    const match = Object.keys(row).find((header) => {
      const normalized = header.toLowerCase().trim().replace(/\s+/g, "_");
      return normalized === key || normalized.replace(/_/g, "") === compact;
    });
    if (match !== undefined && row[match] !== undefined && row[match] !== null) {
      return row[match];
    }
  }
  return "";
}

function preserveSheetPhone(rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return "";
  }

  if (typeof rawValue === "string") {
    const text = rawValue.trim().replace(/^'/, "");
    return text;
  }

  if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
    const digits = String(Math.trunc(rawValue));
    if (digits.length === 9) {
      return `0${digits}`;
    }
    return digits;
  }

  return String(rawValue).trim();
}

function contactPairKey(email, phone) {
  const emailKey = String(email || "").trim().toLowerCase();
  const phoneKey = String(phone || "").trim();
  if (!emailKey || !phoneKey) {
    return "";
  }
  return `${emailKey}||${phoneKey}`;
}

async function resolvePassword(rawPassword) {
  const password = emptyToNull(rawPassword);
  if (!password) {
    return null;
  }
  if (password.startsWith("$2a$") || password.startsWith("$2b$") || password.startsWith("$2y$")) {
    return password;
  }
  return bcrypt.hash(password, 10);
}

export async function POST(req) {
  try {
    await dbConnect();
    await ensureExistSathyaUserIndexes();

    const formData = await req.formData();
    const file = formData.get("excel") || formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const fileName = (file.name || "").toLowerCase();
    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".csv") && !fileName.endsWith(".sql") && !fileName.endsWith(".xml")) {
      return NextResponse.json({ error: "Only .xlsx, .csv, .sql, and .xml files are allowed" }, { status: 400 });
    }

    let rows = [];
    const buffer = Buffer.from(await file.arrayBuffer());

    if (fileName.endsWith(".sql")) {
      const sqlText = buffer.toString("utf-8");
      const insertRegex = /INSERT INTO .*?\((.*?)\)\s+VALUES\s+(.*);/gi;
      let match;
      while ((match = insertRegex.exec(sqlText)) !== null) {
        const columnsStr = match[1];
        const valuesStr = match[2];
        const columns = columnsStr.split(',').map(c => c.trim().replace(/['"`]/g, ''));
        
        const valGroupRegex = /\(([^)]+)\)/g;
        let valMatch;
        while ((valMatch = valGroupRegex.exec(valuesStr)) !== null) {
          const rawVals = valMatch[1];
          const vals = rawVals.match(/('(?:[^'\\]|\\.)*'|[^,]+)/g);
          if (vals && columns.length === vals.length) {
            const rowObj = {};
            columns.forEach((col, i) => {
              let val = vals[i].trim();
              if (val.toUpperCase() === 'NULL') {
                rowObj[col] = null;
              } else {
                rowObj[col] = val.replace(/^'|'$/g, '').replace(/\\'/g, "'");
              }
            });
            rows.push(rowObj);
          }
        }
      }
      if (!rows.length) {
        return NextResponse.json({ error: "No valid INSERT statements found in SQL file" }, { status: 400 });
      }
    } else if (fileName.endsWith(".xml")) {
      const xmlText = buffer.toString("utf-8");
      const { XMLParser } = require("fast-xml-parser");
      const parser = new XMLParser({ ignoreAttributes: false, parseAttributeValue: true });
      const jsonObj = parser.parse(xmlText);
      
      const allObjects = [];
      const findRows = (obj) => {
        if (Array.isArray(obj)) {
          obj.forEach(findRows);
        } else if (typeof obj === 'object' && obj !== null) {
          const lowerKeys = Object.keys(obj).map(k => k.toLowerCase());
          if (lowerKeys.includes("phone") || lowerKeys.includes("exist_id") || lowerKeys.includes("email")) {
            allObjects.push(obj);
          } else {
            for (let key in obj) {
              findRows(obj[key]);
            }
          }
        }
      };
      findRows(jsonObj);
      rows = allObjects;
      if (!rows.length) {
        return NextResponse.json({ error: "No valid data rows found in XML file" }, { status: 400 });
      }
    } else {
      const sheet = readExistUserSheetRows(buffer, fileName.endsWith(".csv"));
      if (sheet.error) {
        return NextResponse.json({ error: sheet.error }, { status: 400 });
      }
      rows = sheet.rows;
      if (!rows.length) {
        return NextResponse.json({ error: "File has no data rows" }, { status: 400 });
      }
    }

    let addedCount = 0;
    let skippedCount = 0;
    let skippedExistingCount = 0;
    let skippedExistIdCount = 0;
    const errors = [];
    const skippedEmails = [];
    const skippedUsers = [];
    const skippedExistIdsInBatch = new Set();
    const existingSkippedExistIds = new Set(
      (await ExistSathyaUserSkipped.find({}, { exist_id: 1 }).lean())
        .map((row) => normalizeExistIdKey(row.exist_id))
        .filter(Boolean)
    );

    const queueSkippedUser = (existIdValue, skippedReason, emailValue, phoneValue) => {
      const skippedExistId = normalizeExistIdKey(existIdValue);
      if (skippedExistId && (existingSkippedExistIds.has(skippedExistId) || skippedExistIdsInBatch.has(skippedExistId))) {
        return;
      }

      skippedUsers.push({
        exist_id: skippedExistId,
        email: emailValue || null,
        phone: phoneValue ? String(phoneValue) : null,
        skipped_reason: skippedReason,
      });

      if (skippedExistId) {
        skippedExistIdsInBatch.add(skippedExistId);
        existingSkippedExistIds.add(skippedExistId);
      }
    };

    const existingUsers = await ExistSathyaUser.find({}, { email: 1, phone: 1, exist_id: 1 }).lean();
    const existingPairs = new Set(
      existingUsers.map((user) => contactPairKey(user.email, user.phone)).filter(Boolean)
    );
    const pairsInFile = new Set();
    const existingExistIds = new Set(
      existingUsers.map((user) => normalizeExistIdKey(user.exist_id)).filter(Boolean)
    );
    const existIdActual = new Map();
    const pairToExistId = new Map();
    for (const user of existingUsers) {
      const normalized = normalizeExistIdKey(user.exist_id);
      if (normalized && user.exist_id != null) {
        existIdActual.set(normalized, String(user.exist_id).trim());
      }
      const pair = contactPairKey(user.email, user.phone);
      if (pair && user.exist_id != null) {
        pairToExistId.set(pair, String(user.exist_id).trim());
      }
    }
    const existIdsInFile = new Set();
    const dateUpdates = [];
    let datesUpdatedCount = 0;

    const readUserDates = (row) => ({
      created_at: parseSheetDate(getCell(row, ["created_at", "created", "createdat", "created_on"])),
      updated_at: parseSheetDate(getCell(row, ["updated_at", "updated", "updatedat", "updated_on"])),
      logged_in: parseSheetDate(getCell(row, ["logged_in"])),
    });

    const queueDateUpdate = (filter, dates) => {
      const dateUpdate = {};
      if (dates.created_at) dateUpdate.created_at = dates.created_at;
      if (dates.updated_at) dateUpdate.updated_at = dates.updated_at;
      if (dates.logged_in) dateUpdate.logged_in = dates.logged_in;
      if (!filter || !Object.keys(dateUpdate).length) return;
      dateUpdates.push({
        updateOne: { filter, update: { $set: dateUpdate } },
      });
    };

    const passwordCache = new Map();
    const resolvePasswordCached = async (rawPassword) => {
      const password = emptyToNull(rawPassword);
      if (!password) return null;
      if (password.startsWith("$2a$") || password.startsWith("$2b$") || password.startsWith("$2y$")) {
        return password;
      }
      if (passwordCache.has(password)) {
        return passwordCache.get(password);
      }
      const hash = await bcrypt.hash(password, 10);
      passwordCache.set(password, hash);
      return hash;
    };

    const usersToInsert = [];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const excelRow = index + 2;

      const first_name = emptyToNull(getCell(row, ["first_name"]));
      const emailRaw = emptyToNull(getCell(row, ["email"]));
      const email = emailRaw ? String(emailRaw).trim().toLowerCase() : null;
      const phone = preserveSheetPhone(getCell(row, ["phone"]));
      const rawPassword = getCell(row, ["password"]);
      const existId = normalizeExistIdKey(getCell(row, ["exist_id", "id"]));

      if (existId && (existingExistIds.has(existId) || existIdsInFile.has(existId))) {
        queueDateUpdate(
          { exist_id: existIdActual.get(existId) || existId },
          readUserDates(row)
        );
        skippedExistIdCount += 1;
        continue;
      }

      if (!phone) {
        skippedCount += 1;
        queueSkippedUser(existId, "phone is required", email, phone);
        errors.push({
          row: excelRow,
          error: "phone is required",
        });
        continue;
      }

      const pairKey = contactPairKey(email, phone);
      if (pairKey && (existingPairs.has(pairKey) || pairsInFile.has(pairKey))) {
        queueDateUpdate(
          existId
            ? { exist_id: existIdActual.get(existId) || existId }
            : pairToExistId.get(pairKey)
              ? { exist_id: pairToExistId.get(pairKey) }
              : { email, phone },
          readUserDates(row)
        );
        skippedCount += 1;
        skippedExistingCount += 1;
        skippedEmails.push({ row: excelRow, email, phone });
        queueSkippedUser(existId, "existing email and phone", email, phone);
        continue;
      }

      if (pairKey) {
        pairsInFile.add(pairKey);
      }
      if (existId) {
        existIdsInFile.add(existId);
      }

      const hashedPassword = await resolvePasswordCached(rawPassword);

      const confirmedValue = emptyToNull(getCell(row, ["confirmed"]));
      const notifyStatusValue = emptyToNull(getCell(row, ["notify_status"]));

      const now = new Date();
      const sheetDates = readUserDates(row);
      const created_at = sheetDates.created_at || now;
      const updated_at = sheetDates.updated_at || now;

      usersToInsert.push({
        _excelRow: excelRow,
        _pairKey: pairKey,
        _existId: existId,
        exist_id: existId,
        first_name,
        last_name: emptyToNull(getCell(row, ["last_name"])),
        store_id: emptyToNull(getCell(row, ["store_id"])),
        role_id: emptyToNull(getCell(row, ["role_id"])),
        zone_id: emptyToNull(getCell(row, ["zone_id"])),
        email,
        phone,
        password: hashedPassword,
        remember_token: emptyToNull(getCell(row, ["remember_token"])),
        confirmed: confirmedValue === null ? null : Number(confirmedValue),
        confirmation_code: emptyToNull(getCell(row, ["confirmation_code"])),
        provider: emptyToNull(getCell(row, ["provider"])),
        provider_id: emptyToNull(getCell(row, ["provider_id"])),
        avatar: emptyToNull(getCell(row, ["avatar"])),
        avatar_original: emptyToNull(getCell(row, ["avatar_original"])),
        notify_pincode: emptyToNull(getCell(row, ["notify_pincode"])),
        notify_status: notifyStatusValue === null ? 0 : Number(notifyStatusValue),
        logged_in: sheetDates.logged_in,
        created_at,
        updated_at,
      });
    }

    if (dateUpdates.length) {
      const result = await ExistSathyaUser.bulkWrite(dateUpdates, { ordered: false });
      datesUpdatedCount = result.modifiedCount || 0;
    }

    if (usersToInsert.length > 0) {
      try {
        const result = await ExistSathyaUser.insertMany(usersToInsert, { ordered: false });
        addedCount += result.length;
        result.forEach(user => {
          const pairKey = contactPairKey(user.email, user.phone);
          if (pairKey) existingPairs.add(pairKey);
          if (user.exist_id) existingExistIds.add(normalizeExistIdKey(user.exist_id));
        });
      } catch (error) {
        if (error.code === 11000 || (error.writeErrors && error.writeErrors.length > 0)) {
          const insertedDocs = error.insertedDocs || [];
          addedCount += insertedDocs.length;
          insertedDocs.forEach(user => {
            const pairKey = contactPairKey(user.email, user.phone);
            if (pairKey) existingPairs.add(pairKey);
            if (user.exist_id) existingExistIds.add(normalizeExistIdKey(user.exist_id));
          });
          
          const writeErrors = error.writeErrors || [];
          writeErrors.forEach(err => {
            const failedDoc = err.err.op || usersToInsert[err.index];
            if (failedDoc) {
              skippedCount += 1;
              if (err.code === 11000) {
                skippedExistingCount += 1;
                skippedEmails.push({ row: failedDoc._excelRow, email: failedDoc.email, phone: failedDoc.phone });
                queueSkippedUser(failedDoc.exist_id, "existing email and phone", failedDoc.email, failedDoc.phone);
              } else {
                queueSkippedUser(failedDoc.exist_id, err.errmsg || "other skipped", failedDoc.email, failedDoc.phone);
                errors.push({ row: failedDoc._excelRow, error: err.errmsg });
              }
            }
          });
        } else {
          console.error("Exist sathya users bulk insert error:", error);
          throw error;
        }
      }
    }

    let skippedSavedCount = 0;
    if (skippedUsers.length) {
      try {
        const inserted = await ExistSathyaUserSkipped.insertMany(skippedUsers, { ordered: false });
        skippedSavedCount = inserted.length;
      } catch (error) {
        const insertedIds = error.result?.insertedIds || error.insertedIds || {};
        skippedSavedCount = Object.keys(insertedIds).length || 0;
        console.error("Exist sathya skipped users save error:", error.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed. Added ${addedCount}, dates updated ${datesUpdatedCount}, skipped existing exist_id ${skippedExistIdCount}, skipped existing email and phone ${skippedExistingCount}, other skipped ${skippedCount - skippedExistingCount}.`,
      addedCount,
      datesUpdatedCount,
      skippedCount,
      skippedExistingCount,
      skippedExistIdCount,
      skippedSavedCount,
      skippedEmails,
      errors,
    });
  } catch (error) {
    console.error("Exist sathya users import error:", error);
    return NextResponse.json({ error: "Import failed", details: error.message }, { status: 500 });
  }
}
