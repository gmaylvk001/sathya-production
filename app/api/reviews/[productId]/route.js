import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Review from "@/models/Review";
import product from "@/models/product";
import OrderNew from "@/models/orders_new";
import OrderDetailsNew from "@/models/order_details_new";
import ExistSathyaOrderDetail from "@/models/ExistSathyaOrderDetail";
import ecom_order_info from "@/models/ecom_order_info";
import User from "@/models/User";
import { getAuthUserId } from "@/lib/authRequest";

const ELIGIBLE_STATUS_REGEX =
  /^(complete|completed|delivered|shipped|billed|ordered|order accepted|order placed)$/i;

function cleanCode(code) {
  if (!code) return "";
  return String(code).trim().replace(/^ITEM/i, "").toLowerCase();
}

export async function GET(request, { params }) {
  await dbConnect();
  const { productId } = await params;

  try {
    const reviews = await Review.find({
      product_id: productId,
      review_status: "active",
    })
      .populate("user_id", "name email")
      .sort({ created_date: -1 });

    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.reviews_rating, 0) / reviews.length
        : 0;

    return new Response(
      JSON.stringify({
        success: true,
        reviews,
        avgRating,
        count: reviews.length,
      }),
      { status: 200 }
    );
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
    });
  }
}

export async function POST(request, { params }) {
  await dbConnect();
  const { productId } = await params;

  try {
    const authUserId = await getAuthUserId(request);
    if (!authUserId) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401 }
      );
    }

    const body = await request.json();
    const { reviews_title, reviews_rating, reviews_comments } = body;
    const userId = authUserId;

    if (!reviews_title || !reviews_rating) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400 }
      );
    }

    const currentProduct = await product.findOne({ _id: productId }).lean();
    if (!currentProduct) {
      return new Response(
        JSON.stringify({ success: false, error: "Product not found" }),
        { status: 404 }
      );
    }

    // Collect all valid IDs and item codes (including variant family siblings)
    const targetProductIds = new Set([String(productId)]);
    const cleanCodes = new Set();

    const registerCode = (c) => {
      const cleaned = cleanCode(c);
      if (cleaned) {
        cleanCodes.add(cleaned);
        cleanCodes.add(`item${cleaned}`);
      }
    };

    registerCode(currentProduct.item_code);
    registerCode(currentProduct.model_number);

    if (currentProduct.variantGroupId) {
      try {
        const variants = await product
          .find({ variantGroupId: currentProduct.variantGroupId })
          .select("_id item_code model_number")
          .lean();
        for (const v of variants) {
          targetProductIds.add(String(v._id));
          registerCode(v.item_code);
          registerCode(v.model_number);
        }
      } catch (e) {
        console.error("Variant expansion error in review check:", e.message);
      }
    }

    const targetProductIdsList = [...targetProductIds];
    const targetProductObjectIds = targetProductIdsList
      .filter((id) => mongoose.isValidObjectId(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    // Resolve comprehensive user identifiers (live user, exist_id, phone, email)
    const userDoc = await User.findById(userId).select("_id exist_id email mobile").lean();
    const userIds = new Set([String(userId)]);
    if (mongoose.isValidObjectId(userId)) {
      userIds.add(new mongoose.Types.ObjectId(userId));
    }
    if (userDoc?.exist_id) {
      userIds.add(String(userDoc.exist_id));
      const num = Number(userDoc.exist_id);
      if (Number.isFinite(num)) {
        userIds.add(num);
        userIds.add(String(Math.trunc(num)));
      }
    }

    const userEmails = userDoc?.email ? [String(userDoc.email).trim().toLowerCase()] : [];
    const userMobiles = [];
    if (userDoc?.mobile) {
      const digits = String(userDoc.mobile).replace(/\D/g, "");
      if (digits.length >= 10) {
        const last10 = digits.slice(-10);
        userMobiles.push(digits, last10, `91${last10}`, `+91${last10}`);
      }
    }

    // Query eligible completed / paid / ordered orders in orders_new
    const userOrderQuery = {
      $and: [
        {
          $or: [
            { user_id: { $in: [...userIds] } },
            ...(userEmails.length ? [{ email_address: { $in: userEmails } }] : []),
            ...(userMobiles.length ? [{ order_phonenumber: { $in: userMobiles } }] : []),
          ],
        },
        {
          $or: [
            { order_status: { $regex: ELIGIBLE_STATUS_REGEX } },
            { status: { $regex: ELIGIBLE_STATUS_REGEX } },
            { payment_status: /^paid$/i },
          ],
        },
      ],
    };

    const userOrders = await OrderNew.find(userOrderQuery)
      .select("_id order_number order_item")
      .lean();

    let purchased = false;

    // 1. Check embedded order_item array on user orders
    for (const order of userOrders) {
      const inItems = (order.order_item || []).some((item) => {
        const pid = String(item.productId || item.product_id || item.id || item._id || "");
        if (pid && targetProductIds.has(pid)) return true;

        const itemCodeClean = cleanCode(item.item_code || item.itemCode);
        if (itemCodeClean && cleanCodes.has(itemCodeClean)) return true;

        const modelClean = cleanCode(item.model);
        if (modelClean && cleanCodes.has(modelClean)) return true;

        return false;
      });

      if (inItems) {
        purchased = true;
        break;
      }
    }

    // 2. Batch check in order_details_new if not resolved via embedded order_item
    if (!purchased && userOrders.length > 0) {
      const orderIds = userOrders.map((o) => o._id).filter(Boolean);
      const orderNumbers = userOrders.map((o) => o.order_number).filter(Boolean);

      const codePatterns = [...cleanCodes]
        .filter(Boolean)
        .map((c) => new RegExp(`^(ITEM)?${c}$`, "i"));

      const detailMatch = await OrderDetailsNew.exists({
        $and: [
          {
            $or: [
              { order_id: { $in: orderIds } },
              { orderNumber: { $in: orderNumbers } },
            ],
          },
          {
            $or: [
              { product_id: { $in: [...targetProductIdsList, ...targetProductObjectIds] } },
              ...(codePatterns.length ? [{ item_code: { $in: codePatterns } }] : []),
              ...(codePatterns.length ? [{ model: { $in: codePatterns } }] : []),
            ],
          },
        ],
      });

      if (detailMatch) {
        purchased = true;
      }
    }

    // 3. Fallback for migrated existing Sathya order details
    if (!purchased && (userOrders.length > 0 || userDoc?.exist_id)) {
      const orderNumbers = userOrders.map((o) => o.order_number).filter(Boolean);
      const codePatterns = [...cleanCodes]
        .filter(Boolean)
        .map((c) => new RegExp(`^(ITEM)?${c}$`, "i"));

      const existDetailMatch = await ExistSathyaOrderDetail.exists({
        $and: [
          {
            $or: [
              ...(orderNumbers.length ? [{ orderNumber: { $in: orderNumbers } }] : []),
              { user_id: { $in: [...userIds].map(String) } },
            ],
          },
          {
            $or: [
              { product_id: { $in: [...targetProductIdsList, ...targetProductObjectIds] } },
              ...(codePatterns.length ? [{ item_code: { $in: codePatterns } }] : []),
              ...(codePatterns.length ? [{ model: { $in: codePatterns } }] : []),
            ],
          },
        ],
      });

      if (existDetailMatch) {
        purchased = true;
      }
    }

    // 4. Legacy fallback for old ecom_order_info collection
    if (!purchased && cleanCodes.size > 0) {
      const codePatterns = [...cleanCodes]
        .filter(Boolean)
        .map((c) => new RegExp(`^(ITEM)?${c}$`, "i"));

      const legacyMatch = await ecom_order_info.exists({
        user_id: { $in: [...userIds].map(String) },
        order_status: { $regex: ELIGIBLE_STATUS_REGEX },
        $or: [
          { "order_item.item_code": { $in: codePatterns } },
          { "order_item.model": { $in: codePatterns } },
          { "order_details.item_code": { $in: codePatterns } },
          { "order_details.model": { $in: codePatterns } },
        ],
      });

      purchased = Boolean(legacyMatch);
    }

    if (!purchased) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "You are not buying this product yet, So you cannot Review this product",
        }),
        { status: 403 }
      );
    }

    // Prevent duplicate reviews from the same user for this product
    const review_check = await Review.countDocuments({
      user_id: { $in: [...userIds] },
      product_id: { $in: targetProductIdsList },
    });

    if (review_check >= 1) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "You have already reviewed this product!..",
        }),
        { status: 409 }
      );
    }

    const newReview = await Review.create({
      user_id: userId,
      product_id: productId,
      reviews_title,
      reviews_rating,
      reviews_comments,
    });

    return new Response(
      JSON.stringify({ success: true, review: newReview }),
      { status: 201 }
    );
  } catch (err) {
    console.error("Error in POST /api/reviews:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500 }
    );
  }
}
