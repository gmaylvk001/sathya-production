import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getWishlistMailConfig } from "@/lib/wishlistMail";
import { mergeEmailContent } from "@/lib/wishlistMailEmailDefaults";
import WishlistMailLog from "@/models/wishlist_mail_log";
import Product from "@/models/product";

export async function GET() {
  try {
    await connectDB();
    const config = await getWishlistMailConfig();

    const [totalMails, uniqueUsers, uniqueProducts, flaggedCount, recentLogs] =
      await Promise.all([
        WishlistMailLog.countDocuments({}),
        WishlistMailLog.distinct("userId"),
        WishlistMailLog.distinct("productId"),
        Product.countDocuments({ productMailsending: true }),
        WishlistMailLog.find({}).sort({ sentAt: -1 }).limit(50).lean(),
      ]);

    return NextResponse.json({
      success: true,
      config: {
        enabled: config.enabled,
        maxMailsPerUser: config.maxMailsPerUser,
        mailCooldownDays: config.mailCooldownDays,
        cronTime: config.cronTime,
        cronDays: config.cronDays,
        lastRunAt: config.lastRunAt,
        lastRunStats: config.lastRunStats || {},
        adminDigestEmail: config.adminDigestEmail || "",
        emailContent: mergeEmailContent(config.emailContent),
      },
      stats: {
        totalMails,
        uniqueUsers: uniqueUsers.length,
        uniqueProducts: uniqueProducts.length,
        flaggedProducts: flaggedCount,
      },
      logs: recentLogs,
    });
  } catch (error) {
    console.error("wishlist-mail GET error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  try {
    await connectDB();
    const body = await req.json();
    const config = await getWishlistMailConfig();

    if (typeof body.enabled === "boolean") config.enabled = body.enabled;
    if (body.maxMailsPerUser !== undefined)
      config.maxMailsPerUser = Math.max(1, Number(body.maxMailsPerUser) || 1);
    if (body.mailCooldownDays !== undefined)
      config.mailCooldownDays = Math.max(0, Number(body.mailCooldownDays) || 0);
    // Cron time is fixed at 12:00 IST — admin cannot change it
    config.cronTime = "12:00";
    if (Array.isArray(body.cronDays)) {
      config.cronDays = body.cronDays
        .map((d) => Number(d))
        .filter((d) => d >= 0 && d <= 6);
    }
    if (body.adminDigestEmail !== undefined)
      config.adminDigestEmail = String(body.adminDigestEmail || "");
    if (body.emailContent && typeof body.emailContent === "object") {
      config.emailContent = body.emailContent;
      config.markModified("emailContent");
    }

    await config.save();

    return NextResponse.json({
      success: true,
      message: "Settings saved",
      config,
    });
  } catch (error) {
    console.error("wishlist-mail PUT error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Run now is disabled. Wishlist mails are sent only by cron.",
    },
    { status: 405 },
  );
}
