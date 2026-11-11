import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import VideoCard from "@/models/VideoCard";
import fs from "fs";
import path from "path";

// Save File Function (accepts optional upload)
async function saveFile(file) {
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), "public", "uploads", "videocard");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = Date.now() + "-" + file.name.replace(/\s/g, "_");
    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, buffer);

    return "/uploads/videocard/" + filename;
  } catch (err) {
    console.error("Save file error:", err);
    throw err;
  }
}

// Normalize state name helper
function normalizeState(val) {
  if (!val) return "all";
  const s = String(val).trim().toLowerCase();
  if (s.includes("tamil")) return "tamilnadu";
  if (s.includes("andhra")) return "andhra";
  if (s.includes("kerala")) return "kerala";
  if (s.includes("karnat")) return "karnataka";
  if (s.includes("telang")) return "telangana";
  return "all";
}

// ✅ GET video cards
export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const region = searchParams.get("region");
    const forAdmin = searchParams.get("admin") === "true";

    let query = {};
    if (region && !forAdmin) {
      const reg = normalizeState(region);
      query = {
        status: "Active",
        $or: [
          { state: reg },
          { state: "all" },
          { state: { $exists: false } },
          { state: null },
          { state: "" },
        ],
      };
    }

    const videoCards = await VideoCard.find(query).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, videoCards: videoCards || [] });
  } catch (err) {
    console.error("Error in GET /api/videocard:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

// ✅ POST add new video card
export async function POST(req) {
  try {
    await dbConnect();
    const contentType = req.headers.get("content-type") || "";

    let title = "Instagram Reel";
    let video_url = "";
    let state = "all";
    let status = "Active";
    let thumbnailImagePath = "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      title = body.title?.trim() || "Instagram Reel";
      video_url = (body.video_url || body.link || body.instagram_link)?.trim();
      state = normalizeState(body.state);
      status = body.status === "Inactive" ? "Inactive" : "Active";
      thumbnailImagePath = body.thumbnail_image || "";
    } else {
      const formData = await req.formData();
      title = formData.get("title")?.toString().trim() || "Instagram Reel";
      video_url = (formData.get("video_url") || formData.get("link") || formData.get("instagram_link"))?.toString().trim();
      state = normalizeState(formData.get("state"));
      status = formData.get("status") || "Active";

      const thumbnail_image = formData.get("thumbnail_image");
      if (thumbnail_image && typeof thumbnail_image === "object" && thumbnail_image.size > 0) {
        try {
          thumbnailImagePath = await saveFile(thumbnail_image);
        } catch (err) {
          return NextResponse.json(
            { success: false, message: err.message },
            { status: 400 }
          );
        }
      }
    }

    if (!video_url) {
      return NextResponse.json(
        { success: false, message: "Instagram Link is required" },
        { status: 400 }
      );
    }

    const newVideoCard = new VideoCard({
      thumbnail_image: thumbnailImagePath,
      title: title || "Instagram Reel",
      video_url,
      state,
      status,
    });

    await newVideoCard.save();

    return NextResponse.json({ success: true, videoCard: newVideoCard });
  } catch (err) {
    console.error("POST ERROR:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

// ✅ PUT update video card
export async function PUT(req) {
  try {
    await dbConnect();
    const contentType = req.headers.get("content-type") || "";

    let id = "";
    let updateData = { updatedAt: new Date() };

    if (contentType.includes("application/json")) {
      const body = await req.json();
      id = body.id || body._id;
      if (body.title !== undefined) updateData.title = body.title;
      if (body.video_url !== undefined || body.link !== undefined) {
        updateData.video_url = body.video_url || body.link;
      }
      if (body.state !== undefined) updateData.state = normalizeState(body.state);
      if (body.status !== undefined) updateData.status = body.status;
      if (body.thumbnail_image !== undefined) updateData.thumbnail_image = body.thumbnail_image;
    } else {
      const formData = await req.formData();
      id = formData.get("id")?.toString();
      if (!id) {
        return NextResponse.json(
          { success: false, message: "Video Card ID is required" },
          { status: 400 }
        );
      }

      const title = formData.get("title");
      if (title !== null) updateData.title = title.toString();

      const video_url = formData.get("video_url") || formData.get("link");
      if (video_url !== null) updateData.video_url = video_url.toString();

      const state = formData.get("state");
      if (state !== null) updateData.state = normalizeState(state);

      const status = formData.get("status");
      if (status !== null) updateData.status = status.toString();

      const thumbnail_image = formData.get("thumbnail_image");
      if (thumbnail_image && typeof thumbnail_image === "object" && thumbnail_image.size > 0) {
        try {
          const thumbnailImagePath = await saveFile(thumbnail_image);
          updateData.thumbnail_image = thumbnailImagePath;
        } catch (err) {
          return NextResponse.json(
            { success: false, message: err.message },
            { status: 400 }
          );
        }
      }
    }

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Video Card ID is required" },
        { status: 400 }
      );
    }

    const updatedVideoCard = await VideoCard.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updatedVideoCard) {
      return NextResponse.json(
        { success: false, message: "Video Card not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, videoCard: updatedVideoCard });
  } catch (err) {
    console.error("PUT ERROR:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

// ✅ DELETE video card
export async function DELETE(req) {
  try {
    await dbConnect();
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Video Card ID is required" },
        { status: 400 }
      );
    }

    const videoCard = await VideoCard.findById(id);
    if (!videoCard) {
      return NextResponse.json(
        { success: false, message: "Video Card not found" },
        { status: 404 }
      );
    }

    if (videoCard.thumbnail_image && !videoCard.thumbnail_image.startsWith("http")) {
      const filePath = path.join(process.cwd(), "public", videoCard.thumbnail_image);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          /* ignore delete failure */
        }
      }
    }

    await VideoCard.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "Video Card deleted" });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
