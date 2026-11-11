import mongoose from "mongoose";

const GroupInfoSchema = new mongoose.Schema({
  category_slug: { type: String, required: true },
  group_name: { type: String, required: true },
});

export default mongoose.models.ecom_group_name_infos || mongoose.model("ecom_group_name_infos", GroupInfoSchema);
