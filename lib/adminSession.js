import User from "@/models/User";

export const ADMIN_IDLE_MS = 30 * 60 * 1000;
const TOUCH_MS = 60 * 1000;

export async function startAdminSession(userId) {
  const sid = String(Date.now());
  await User.updateOne(
    { _id: userId },
    { $set: { admin_session_id: sid, admin_active_at: new Date() } }
  );
  return sid;
}

/**
 * Admin token is valid only for the current login, and only if that login
 * was used within the idle window. A matching request refreshes the window.
 */
export async function evaluateAdminSession(userId, sid) {
  if (!userId || !sid) return false;

  const user = await User.findById(userId)
    .select("user_type admin_session_id admin_active_at")
    .lean();
  if (!user || user.user_type !== "admin") return false;
  if (String(user.admin_session_id || "") !== String(sid)) return false;

  const last = user.admin_active_at ? new Date(user.admin_active_at).getTime() : 0;
  if (!last || Date.now() - last > ADMIN_IDLE_MS) return false;

  if (Date.now() - last > TOUCH_MS) {
    await User.updateOne({ _id: userId }, { $set: { admin_active_at: new Date() } });
  }
  return true;
}

export async function revokeAdminSession(userId, sid) {
  if (!userId || !sid) return;
  await User.updateOne(
    { _id: userId, admin_session_id: String(sid) },
    { $set: { admin_session_id: "", admin_active_at: null } }
  );
}
