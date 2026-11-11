import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import HomeSection from "@/models/homeSection";

// ✅ Add new section
export async function POST(request) {
  await dbConnect();
  const { name, status } = await request.json();

  const maxSection = await HomeSection.findOne().sort({ position: -1 });
  const newSection = new HomeSection({
    name,
    status,
    position: maxSection ? maxSection.position + 1 : 0,
  });

  await newSection.save();
  return NextResponse.json({ section: newSection });
}

// ✅ Edit section
export async function PUT(request) {
  await dbConnect();
  const { _id, name, status } = await request.json();

  const updated = await HomeSection.findByIdAndUpdate(
    _id,
    { name, status },
    { new: true }
  );

  return NextResponse.json({ section: updated });
}

// ✅ Delete section
export async function DELETE(request) {
  try {
    await dbConnect();
    const { _id } = await request.json();
    if (!_id) {
      return NextResponse.json({ error: "Section ID required" }, { status: 400 });
    }

    await HomeSection.findByIdAndDelete(_id);

    const remaining = await HomeSection.find().sort({ position: 1 });
    const bulkOps = remaining.map((s, i) => ({
      updateOne: {
        filter: { _id: s._id },
        update: { $set: { position: i } },
      },
    }));
    if (bulkOps.length) await HomeSection.bulkWrite(bulkOps);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete section" }, { status: 500 });
  }
}
