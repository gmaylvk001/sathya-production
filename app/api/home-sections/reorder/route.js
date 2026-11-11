import connectDB from "@/lib/db";
import HomeSection from "@/models/homeSection";

export default async function handler(req, res) {
  if (req.method === "PUT") {
    await connectDB();
    const { updatedOrder } = req.body; // Array of {_id, order}
    for (const item of updatedOrder) {
      await HomeSection.findByIdAndUpdate(item._id, { order: item.order });
    }
    res.json({ success: true });
  }
}
