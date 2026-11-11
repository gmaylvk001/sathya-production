import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Offer from "@/models/ecom_offer_info";
import Product from "@/models/product";
import Category from "@/models/ecom_category_info";
import mongoose from "mongoose";
import { requireAdmin } from "@/lib/adminRequest";

export async function PUT(req) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await dbConnect();

    const requestData = await req.json();

    // Quick path: only toggle fest_offer_status2 without touching other fields
    const bodyKeys = Object.keys(requestData || {});
    const statusOnly =
      requestData?.id &&
      typeof requestData?.fest_offer_status2 === "string" &&
      bodyKeys.every((k) => ["id", "fest_offer_status2"].includes(k));

    if (statusOnly) {
      const s = requestData.fest_offer_status2.trim().toLowerCase();
      if (s !== "active" && s !== "inactive") {
        return NextResponse.json(
          { success: false, error: "Invalid fest_offer_status2 value" },
          { status: 400 }
        );
      }

      const updated = await Offer.findByIdAndUpdate(
        requestData.id,
        { fest_offer_status2: s, updated_at: new Date() },
        { new: true }
      );

      if (!updated) {
        return NextResponse.json(
          { success: false, error: "Offer not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: "Offer display status updated",
          data: updated,
        },
        { status: 200 }
      );
    }

    const {
      id,
      offer_code,
      fest_offer_status,
      fest_offer_status2,
      // NEW: also accept generic status if sent by client
      status,
      notes,
      from_date,
      to_date,
      offer_product_category,
      offer_product,
      offer_category,
      offer_type,
      percentage,
      fixed_price, 
      selected_users,
      limit_enabled,
      offer_limit,
      // NEW: accept selected_user_type
      selected_user_type,
    } = requestData;

    // Validate required fields
    if (!id || !offer_code || !from_date || !to_date || !offer_type) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate offer type specific fields
    if (offer_type === "percentage" && !percentage) {
      return NextResponse.json(
        { success: false, error: "Percentage is required for percentage type offers" },
        { status: 400 }
      );
    }

    if (offer_type === "fixed_price" && !fixed_price) {
      return NextResponse.json(
        { success: false, error: "Fixed price is required for fixed price type offers" },
        { status: 400 }
      );
    }

    // Validate offer application target
    if (offer_product_category === "product" && (!offer_product || offer_product.length === 0)) {
      return NextResponse.json(
        { success: false, error: "At least one product must be selected" },
        { status: 400 }
      );
    }

    if (offer_product_category === "category" && (!offer_category || offer_category.length === 0)) {
      return NextResponse.json(
        { success: false, error: "At least one category must be selected" },
        { status: 400 }
      );
    }

    // Find the existing offer
    const existingOffer = await Offer.findById(id);
    if (!existingOffer) {
      return NextResponse.json(
        { success: false, error: "Offer not found" },
        { status: 404 }
      );
    }

    // Build final product list (for category: expand to active products)
    let finalOfferProduct = offer_product || [];
    if (offer_product_category === "category" && offer_category && offer_category.length > 0) {
      try {
        const activeProducts = await Product.find({
          category: { $in: offer_category },
          status: "Active"
        }).select('_id').lean();

        finalOfferProduct = activeProducts.map(p => p._id.toString());
      } catch (error) {
        console.error("Error fetching products from categories:", error);
        return NextResponse.json(
          { success: false, error: "Failed to fetch products from selected categories" },
          { status: 500 }
        );
      }
    }

    // NEW: robust status normalization (prefer explicit values, no silent fallback to 'inactive')
    const pickStatus = (...vals) => {
      for (const v of vals) {
        if (typeof v === "string" && v.trim()) {
          const s = v.trim().toLowerCase();
          if (s === "active" || s === "inactive") return s;
        }
      }
      return null;
    };
    const normalizedStatus =
      pickStatus(fest_offer_status2, fest_offer_status, status) ??
      pickStatus(existingOffer.fest_offer_status) ?? "inactive";
    console.log("Normalized Status:", normalizedStatus);

    // Ensure ObjectIds and de-dup for product/user arrays without deprecated constructor
    const toObjectIds = (arr = []) =>
      Array.from(new Set(arr.map(v => v?.toString()).filter(v => mongoose.Types.ObjectId.isValid(v))))
        .map(v => mongoose.Types.ObjectId.createFromHexString(v));

    const finalOfferProductIds = toObjectIds(finalOfferProduct);
    const selectedUserIds = toObjectIds(selected_users || []);

    // NEW: normalize selected_user_type
    const normalizedUserType =
      (selected_user_type || "").toLowerCase() === "all" ? "all" : "custom";

    const updatedOffer = await Offer.findByIdAndUpdate(
      id,
      {
        offer_code,
        // NEW: persist both fields in sync (full update path; toggle path handled above)
        fest_offer_status: fest_offer_status,
        fest_offer_status2: normalizedStatus,
        notes,
        from_date: new Date(from_date),
        to_date: new Date(to_date),
        offer_product_category,
        offer_product: finalOfferProductIds,
        offer_category: offer_category || [],
        selected_users: selectedUserIds,
        // NEW: persist selected_user_type
        selected_user_type: normalizedUserType,
        limit_enabled: !!limit_enabled,
        offer_limit: limit_enabled ? Number(offer_limit) : null, 
        offer_type,
        percentage: offer_type === "percentage" ? Number(percentage) : null,
        fixed_price: offer_type === "fixed_price" ? Number(fixed_price) : null,
        updated_at: new Date()
      },
      { new: true }
    );
    console.log("Updated Offer:", updatedOffer.fest_offer_status);

    if (!updatedOffer) {
      return NextResponse.json(
        { success: false, error: "Failed to update offer" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Offer updated successfully",
        data: updatedOffer,
        productCount: finalOfferProductIds.length
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}