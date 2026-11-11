import dbConnect from "./db.js";
import CronRunLog from "../models/cron_run_log.js";
import { syncBrandProductCounts } from "./brandSyncService.js";

const JOB = "brand_status_sync";
const CHECK_EVERY_MS = 60 * 1000; // Check every minute
const RUN_WINDOW_MINUTES = 30; // Claim window if server comes up within 30 mins

function readEnv(name) {
  const key = Object.keys(process.env).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? process.env[key] : undefined;
}

export function isEnvOn(name) {
  const value = String(readEnv(name) ?? "").trim().toLowerCase();
  return ["on", "1", "true", "yes"].includes(value);
}

export function parseClockTime(value) {
  const match = String(value || "").trim().match(/^(\d{1,2})(?:[.:](\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3]?.toUpperCase();
  if (minutes > 59) return null;

  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    if (meridiem === "AM" && hours === 12) hours = 0;
    if (meridiem === "PM" && hours !== 12) hours += 12;
  } else if (hours > 23) {
    return null;
  }
  return hours * 60 + minutes;
}

function nowInKolkata() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

async function claimSlot(runKey, timeLabel) {
  try {
    await CronRunLog.create({
      job: JOB,
      run_key: runKey,
      slot_time: timeLabel,
      status: "running",
      started_at: new Date(),
    });
    return true;
  } catch (err) {
    if (err?.code === 11000) return false;
    throw err;
  }
}

let isRunning = false;
let intervalId = null;

async function tick() {
  if (isRunning) return;

  // Check if disabled explicitly (default is enabled)
  const envVal = readEnv("cron_brand_sync_run");
  if (envVal !== undefined && !isEnvOn("cron_brand_sync_run")) {
    return;
  }

  // Target run time, default: "00:00" (midnight)
  const timeLabel = readEnv("cron_brand_sync_time") || "00:00";
  const targetMinutes = parseClockTime(timeLabel) ?? 0;

  const { date, minutes } = nowInKolkata();
  const isDue = minutes >= targetMinutes && minutes < targetMinutes + RUN_WINDOW_MINUTES;

  if (!isDue) return;

  isRunning = true;
  try {
    await dbConnect();
    await CronRunLog.init();

    const runKey = `${date}_daily`;
    const claimed = await claimSlot(runKey, timeLabel);
    if (!claimed) {
      return;
    }

    console.info(`[brand_sync_cron] Run started for ${date} (${timeLabel} Asia/Kolkata)`);

    try {
      const summary = await syncBrandProductCounts({
        dryRun: false,
        triggeredBy: "cron",
        runKey,
      });
      console.info(
        `[brand_sync_cron] Finished: Active: ${summary.activeBrands}, Inactive: ${summary.inactiveBrands}, Activated: ${summary.activatedCount}, Deactivated: ${summary.deactivatedCount} (${summary.durationMs}ms)`
      );
    } catch (err) {
      await CronRunLog.updateOne(
        { job: JOB, run_key: runKey },
        {
          $set: {
            status: "failed",
            error: err?.message || String(err),
            finished_at: new Date(),
          },
        }
      );
      console.error("[brand_sync_cron] Execution failed:", err?.message || err);
    }
  } catch (err) {
    console.error("[brand_sync_cron] Scheduler error:", err?.message || err);
  } finally {
    isRunning = false;
  }
}

export function startBrandSyncCron() {
  if (intervalId) return;

  const timeLabel = readEnv("cron_brand_sync_time") || "00:00";
  console.info(`[brand_sync_cron] Scheduled daily at ${timeLabel} (Asia/Kolkata)`);

  // Run initial check after 10 seconds, then tick every minute
  setTimeout(() => {
    tick().catch((e) => console.error("[brand_sync_cron] Initial tick failed:", e));
  }, 10000);

  intervalId = setInterval(tick, CHECK_EVERY_MS);
}

export function stopBrandSyncCron() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
