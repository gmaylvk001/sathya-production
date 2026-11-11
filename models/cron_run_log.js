import mongoose from "mongoose";

// One row per scheduled run; the unique (job, run_key) index stops the same slot running twice.
const cronRunLogSchema = new mongoose.Schema(
  {
    job: { type: String, required: true },
    run_key: { type: String, required: true },
    slot_time: { type: String, default: "" },
    status: { type: String, enum: ["running", "success", "failed"], default: "running" },
    result: { type: mongoose.Schema.Types.Mixed, default: null },
    error: { type: String, default: null },
    started_at: { type: Date, default: null },
    finished_at: { type: Date, default: null },
  },
  { timestamps: true, collection: "cron_run_logs" }
);

cronRunLogSchema.index({ job: 1, run_key: 1 }, { unique: true });

export default mongoose.models.CronRunLog || mongoose.model("CronRunLog", cronRunLogSchema);
