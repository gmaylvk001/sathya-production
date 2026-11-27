import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import ProductQA from "@/models/product_qa";
import { getAuthUserId } from "@/lib/authRequest";

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const productId = String(searchParams.get("productId") || "").trim();

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return NextResponse.json(
        { success: false, message: "Valid productId is required." },
        { status: 400 }
      );
    }

    const items = await ProductQA.find({
      productId,
      status: "active",
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      count: items.length,
      items,
    });
  } catch (error) {
    console.error("GET /api/products/qa error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load questions." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();

    const productId = String(body?.productId || "").trim();
    const question = String(body?.question || "").replace(/<[^>]*>/g, "").trim();
    const userName =
      String(body?.userName || "").replace(/<[^>]*>/g, "").trim().slice(0, 60) ||
      "Customer";

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return NextResponse.json(
        { success: false, message: "Valid productId is required." },
        { status: 400 }
      );
    }

    if (question.length < 5) {
      return NextResponse.json(
        { success: false, message: "Please enter a question (at least 5 characters)." },
        { status: 400 }
      );
    }

    let userId = null;
    try {
      const authId = await getAuthUserId(request);
      if (authId && mongoose.Types.ObjectId.isValid(authId)) {
        userId = authId;
      }
    } catch {
      // Guest question allowed
    }

    const created = await ProductQA.create({
      productId,
      userId,
      userName,
      question: question.slice(0, 500),
      status: "active",
    });

    return NextResponse.json(
      {
        success: true,
        item: created,
        message: "Your question has been posted.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/products/qa error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to post question." },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    await dbConnect();
    const body = await request.json();

    const qaId = String(body?.qaId || "").trim();
    const answer = String(body?.answer || "").replace(/<[^>]*>/g, "").trim();
    const answeredBy =
      String(body?.answeredBy || "Sathya Store").trim() || "Sathya Store";

    if (!qaId || !mongoose.Types.ObjectId.isValid(qaId)) {
      return NextResponse.json(
        { success: false, message: "Valid qaId is required." },
        { status: 400 }
      );
    }

    if (!answer) {
      return NextResponse.json(
        { success: false, message: "Answer text is required." },
        { status: 400 }
      );
    }

    const updated = await ProductQA.findByIdAndUpdate(
      qaId,
      {
        answer: answer.slice(0, 1500),
        answeredBy,
        answeredAt: new Date(),
      },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Question not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      item: updated,
    });
  } catch (error) {
    console.error("PATCH /api/products/qa error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update answer." },
      { status: 500 }
    );
  }
}
