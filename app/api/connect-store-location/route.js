import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Lead from "@/models/leads";
import StoreListing from "@/models/store_listings";

export const dynamic = "force-dynamic";

/**
 * Exist HomeController@connectStoreLoc
 * POST → Eywa CRM → on Success insert `leads`
 */
export async function POST(req) {
  try {
    await dbConnect();

    const data = await req.json();
    const name = data.name != null ? String(data.name).trim() : "";
    const email = data.email != null ? String(data.email).trim() : "";
    const mobileRaw = data.mobile != null ? String(data.mobile).trim() : String(data.phone || "").trim();
    const mobile = mobileRaw.replace(/\D/g, "");
    const message = data.message != null ? String(data.message) : "";
    const timings = data.timings != null ? String(data.timings) : "";
    const referrel_url =
      data.referrel_url != null
        ? String(data.referrel_url)
        : data.referral_url != null
          ? String(data.referral_url)
          : "";
    const lead_title = data.lead_title != null ? String(data.lead_title).trim() : "";
    let utm_source = data.utm_source != null ? String(data.utm_source).trim() : "";
    const utm_campaign = data.utm_campaign != null ? String(data.utm_campaign).trim() : "";
    const cookie_id =
      data.cookie_id != null
        ? String(data.cookie_id)
        : data.doc != null
          ? String(data.doc)
          : "";
    const leadType = data.lead_type != null ? String(data.lead_type) : "";
    const invoiceID = data.invoice != null ? String(data.invoice) : data.invoice_id != null ? String(data.invoice_id) : "";
    const productLookingFor =
      data.product != null
        ? String(data.product)
        : data.product_looking_for != null
          ? String(data.product_looking_for)
          : "";
    const productCategory =
      data.product_category != null ? String(data.product_category) : "";
    const productUrl = data.product_url != null ? String(data.product_url) : "";
    const city = data.city != null ? String(data.city) : "";
    const event_category = data.event_category != null ? String(data.event_category) : "";
    const address = data.address != null ? String(data.address) : "";
    const storeIdRaw = data.store != null ? data.store : data.store_id != null ? data.store_id : null;

    // Exist Validator:: name, email, mobile
    if (!name || !/^[a-zA-Z0-9\s.,/]*$/.test(name)) {
      return NextResponse.json(
        { success: false, message: "Invalid name format" },
        { status: 400 }
      );
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: "Invalid email" },
        { status: 400 }
      );
    }
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid 10-digit mobile number" },
        { status: 400 }
      );
    }

    // Exist #offer-enquire: message max 180 when provided
    if (message && String(message).length > 180) {
      return NextResponse.json(
        { success: false, message: "Message must be 180 characters or less" },
        { status: 400 }
      );
    }

    if (utm_source === "") {
      utm_source = lead_title;
    }

    let storeName = "";
    let storeId = null;
    if (storeIdRaw != null && String(storeIdRaw).trim() !== "") {
      const sid = String(storeIdRaw).trim();
      storeId = sid;
      if (mongoose.Types.ObjectId.isValid(sid)) {
        const storeDoc = await StoreListing.findById(sid).lean();
        if (storeDoc) {
          storeName =
            storeDoc.title || storeDoc.name || storeDoc.store_name || storeDoc.slug || "";
        }
      } else {
        // Exist listings.id lookup miss → empty name; allow branch_code title fallback
        const storeDoc = await StoreListing.findOne({
          $or: [
            { branch_code: sid },
            { location_id: sid },
            { title: sid },
          ],
        })
          .select("title name store_name slug _id")
          .lean();
        if (storeDoc) {
          storeName =
            storeDoc.title || storeDoc.name || storeDoc.store_name || storeDoc.slug || "";
          storeId = String(storeDoc._id);
        } else {
          storeName = "";
        }
      }
    }

    const ip_address =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      (data.ipaddress != null ? String(data.ipaddress) : "") ||
      "";

    const eywaAuth =
      process.env.EYWA_API_TOKEN ||
      process.env.ADTARBO_CRM_TOKEN ||
      "2|vo02OiIBiPWAZ5wBTQwBHWKoeN-ub42ZAs_9c6opoak";
    const crmUrl =
      process.env.EYWA_LEAD_URL ||
      process.env.ADTARBO_CRM_URL ||
      "https://sathya.adtarbo.com/api/lead-create-api";

    const leadSource = utm_source.trim() !== "" ? utm_source : lead_title;

    const postdata = {
      api_token: eywaAuth,
      last_name: name || "",
      email: email || "",
      title: lead_title || "",
      mobile: mobile || "",
      store: storeName || "",
      city: city || "",
      referral_url: referrel_url || "",
      comments: message || "",
      lead_source: leadSource || "",
      lead_campaign: utm_campaign || "",
      cookie_id: cookie_id || "",
      ip_address: ip_address || "",
      product: productLookingFor || "",
      lead_type: leadType || "",
      invoice_id: invoiceID || "",
      category: productCategory || "",
      product_url: productUrl || "",
      preferred_call_time: timings || "",
    };

    const fieldsString = Object.entries(postdata)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value ?? "")}`)
      .join("&");

    let crmJson = null;
    try {
      const crmResponse = await fetch(crmUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: fieldsString,
        cache: "no-store",
      });
      crmJson = await crmResponse.json().catch(() => null);
    } catch (crmErr) {
      console.error("Eywa CRM error:", crmErr?.message || crmErr);
      return NextResponse.json(
        {
          success: false,
          message: "Lead CRM request failed. Please try again.",
        },
        { status: 502 }
      );
    }

    // Exist: insert leads only when CRM status is Success and lead_id is present.
    const crmStatusOk =
      crmJson && String(crmJson.status || "").toLowerCase() === "success";
    const crmLeadId =
      crmJson?.lead_id != null ? String(crmJson.lead_id).trim() : "";

    if (!crmStatusOk || !crmLeadId) {
      return NextResponse.json(
        {
          success: false,
          message: !crmStatusOk
            ? crmJson?.message ||
              crmJson?.error ||
              "Lead submission failed at CRM. Please try again."
            : "Lead submission failed at CRM. No lead id returned.",
          crm: crmJson,
        },
        { status: 400 }
      );
    }

    const numericStoreId =
      storeId != null && /^\d+$/.test(String(storeId)) ? Number(storeId) : null;

    await Lead.create({
      name,
      email,
      mobile,
      message: message || "",
      preferred_time: timings || "",
      referrel_url: referrel_url || "",
      lead_title: lead_title || "",
      store: storeName || "",
      city: city || "",
      store_id: numericStoreId,
      lead_source: utm_source || "",
      lead_campaign: utm_campaign || "",
      cookie_id: cookie_id || "",
      lead_type: leadType || "",
      invoice_id: invoiceID || "",
      ip_address: ip_address || "",
      product_looking_for: productLookingFor || "",
      product_category: productCategory || "",
      product_url: productUrl || "",
      adtarbo_crm_id: crmLeadId,
      event_category: event_category || "",
      event_image_video: "",
      address: address || "",
      deleted: 0,
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Thank you!. Your message has been sent. We will Contact you shortly.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Connect Store Lead Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
