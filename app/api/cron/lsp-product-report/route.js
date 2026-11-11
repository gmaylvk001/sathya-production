import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import CronRunLog from "@/models/cron_run_log";
import { runLspProductReport } from "@/lib/lspProductReport";
import { isLspCronEnabled, isLspCronMailEnabled } from "@/lib/lspPriceCron";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const JOB = "lsp_price";

function isAuthorized(req) {
  const secret = process.env.LSP_REPORT_API_TOKEN;
  if (!secret) return false;
  const header = req.headers.get("authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "");
  const querySecret = req.nextUrl?.searchParams?.get("secret");
  return token === secret || querySecret === secret;
}

function todayInKolkata() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

/**
 * GET/POST /api/cron/lsp-product-report
 *
 * External schedule only (crontab / curl / browser). No first_time / run_count in app.
 *
 * Auth: Authorization: Bearer <LSP_REPORT_API_TOKEN>  or  ?secret=<token>
 * Gate: cron_lsp_price_run_dev=on (off/missing => 403)
 * Mail: cron_lsp_price_mail_send (default). Override: ?mail=0 off, ?mail=1 on
 *
 * Examples:
 *   curl "http://localhost:3000/api/cron/lsp-product-report?secret=TOKEN"
 *   curl -H "Authorization: Bearer TOKEN" "https://yoursite.com/api/cron/lsp-product-report"
 *   Browser: https://yoursite.com/api/cron/lsp-product-report?secret=TOKEN
 */
async function handle(req) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!isLspCronEnabled()) {
    return NextResponse.json(
      {
        success: false,
        error: "LSP cron is off. Set cron_lsp_price_run_dev=on to allow runs.",
      },
      { status: 403 }
    );
  }

  const mailParam = req.nextUrl.searchParams.get("mail");
  let sendMail = isLspCronMailEnabled();
  if (mailParam === "0") sendMail = false;
  if (mailParam === "1") sendMail = true;

  const runKey = `api_${todayInKolkata()}_${Date.now()}`;
  await dbConnect();
  await CronRunLog.init();

  try {
    await CronRunLog.create({
      job: JOB,
      run_key: runKey,
      slot_time: "api",
      status: "running",
      started_at: new Date(),
    });
  } catch (err) {
    console.warn("[lsp_report] Could not create cron_run_log:", err?.message || err);
  }

  try {
    const result = await runLspProductReport({ sendMail });
    await CronRunLog.updateOne(
      { job: JOB, run_key: runKey },
      { $set: { status: "success", result, finished_at: new Date() } }
    ).catch(() => {});
    return NextResponse.json({ success: true, run_key: runKey, ...result });
  } catch (error) {
    console.error("[lsp_report] LSP Update Error:", error.message);
    await CronRunLog.updateOne(
      { job: JOB, run_key: runKey },
      { $set: { status: "failed", error: error.message || String(error), finished_at: new Date() } }
    ).catch(() => {});
    return NextResponse.json({ success: false, run_key: runKey, error: error.message }, { status: 500 });
  }
}

export async function GET(req) {
  return handle(req);
}

export async function POST(req) {
  return handle(req);
}
