import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Lead from "@/models/leads";
import { isUniletView } from "@/lib/storeView";

export const dynamic = "force-dynamic";

const TEXT_FIELDS = [
  "name",
  "email",
  "mobile",
  "city",
  "store",
  "message",
  "referrel_url",
  "lead_title",
  "lead_source",
  "lead_campaign",
  "product_looking_for",
  "product_category",
  "product_url",
  "preferred_time",
  "lead_type",
  "invoice_id",
  "adtarbo_crm_id",
  "lead_status",
  "manager_comments",
  "date_fr_cmnts",
];

/** Sathya mode only — update lead fields (Exist edit form) */
export async function PUT(req) {
  try {
    await dbConnect();

    if (await isUniletView(req)) {
      return NextResponse.json(
        { success: false, message: "Leads are available in Sathya view only" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const leadId = body.id || body._id;

    if (!leadId || !mongoose.Types.ObjectId.isValid(String(leadId))) {
      return NextResponse.json(
        { success: false, message: "Missing or invalid lead ID" },
        { status: 400 }
      );
    }

    // Phone alias from Exist form
    if (body.phone !== undefined && body.mobile === undefined) {
      body.mobile = body.phone;
    }

    const name = body.name != null ? String(body.name).trim() : "";
    const email = body.email != null ? String(body.email).trim() : "";
    const mobile = body.mobile != null ? String(body.mobile).trim() : "";

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Name is required" },
        { status: 400 }
      );
    }
    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 }
      );
    }
    if (!mobile) {
      return NextResponse.json(
        { success: false, message: "Phone is required" },
        { status: 400 }
      );
    }

    const updateFields = {};
    for (const key of TEXT_FIELDS) {
      if (body[key] !== undefined) {
        updateFields[key] = String(body[key] ?? "").trim() || null;
      }
    }

    if (body.store_id !== undefined) {
      const sid = body.store_id;
      if (sid === null || sid === "") {
        updateFields.store_id = null;
      } else if (/^\d+$/.test(String(sid))) {
        updateFields.store_id = Number(sid);
      }
    }

    const updated = await Lead.findOneAndUpdate(
      { _id: leadId, deleted: { $ne: 1 } },
      { $set: updateFields },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Lead not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Update lead error:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
