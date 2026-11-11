/**
 * Single-browser session helpers.
 * Prevents two different accounts (store + admin) from being active in the same browser.
 */

export const AUTH_SESSION_KEY = "sathya_auth_session";
export const AUTH_TOKEN_KEY = "token";

export const AUTH_CONFLICT_MESSAGE =
  "Another account is already logged in in this browser. Please log out from that account first, then try again.";

function parseJwtPayload(token) {
  try {
    const part = String(token || "").split(".")[1];
    if (!part) return null;
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function getCookie(name) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function clearCookie(name) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

function setCookie(name, value, maxAgeSeconds = 86400) {
  if (typeof document === "undefined" || !value) return;
  // JWT must be encoded — raw tokens break document.cookie parsing and cause admin redirect loops
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax; max-age=${maxAgeSeconds}`;
}

function sessionFromToken(token, sourceHint) {
  if (!token) return null;
  const payload = parseJwtPayload(token);
  if (!payload?.userId) return null;
  if (payload.exp && payload.exp * 1000 < Date.now()) return null;
  return {
    userId: String(payload.userId),
    role: payload.user_type || payload.role || "user",
    source: sourceHint || "store",
  };
}

/** Active session in this browser (localStorage lock, then token/cookie fallback). */
export function readStoredSession() {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.userId) {
        return {
          userId: String(parsed.userId),
          role: parsed.role || "user",
          source: parsed.source || "store",
          sessionId: parsed.sessionId || null,
          loginAt: parsed.loginAt || null,
        };
      }
    }
  } catch {
    /* ignore */
  }

  const adminTok = getCookie("admin_token");
  const storeTok =
    (typeof localStorage !== "undefined" && localStorage.getItem(AUTH_TOKEN_KEY)) ||
    getCookie("token");

  return (
    sessionFromToken(adminTok, "admin") ||
    sessionFromToken(storeTok, adminTok ? "admin" : "store")
  );
}

/** Returns { ok, message?, active?, sameUser? } */
export function canLoginAs(userId) {
  if (!userId) return { ok: true };
  const active = readStoredSession();
  if (!active?.userId) return { ok: true };
  if (String(active.userId) === String(userId)) {
    return { ok: true, sameUser: true, active };
  }
  return { ok: false, message: AUTH_CONFLICT_MESSAGE, active };
}

/**
 * Persist the only allowed session for this browser.
 * @param {{ token: string, userId: string|number, role?: string, source: 'store'|'admin', user?: any }} opts
 */
export function establishSession({ token, userId, role = "user", source = "store", user = null }) {
  if (typeof window === "undefined" || !token || !userId) return;

  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(
    AUTH_SESSION_KEY,
    JSON.stringify({
      userId: String(userId),
      role: role || "user",
      source,
      loginAt: Date.now(),
      sessionId: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    })
  );

  if (user) {
    try {
      localStorage.setItem("sathya_user", JSON.stringify(user));
    } catch { }
  }

  if (source === "admin") {
    setCookie("token", token);
    setCookie("admin_token", token);
  } else {
    // Storefront must not leave admin cookies active for another identity
    clearCookie("admin_token");
    clearCookie("token");
  }

  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("auth-changed", {
          detail: { isLoggedIn: true, userId: String(userId), role, token, user },
        })
      );
    }
  } catch (e) {
    /* ignore */
  }
}

/** Full logout for store + admin across storage and cookies. */
export function clearBrowserAuth() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem("sathya_user");
  } catch {
    /* ignore */
  }
  clearCookie("token");
  clearCookie("admin_token");

  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("auth-changed", {
          detail: { isLoggedIn: false, userId: null, token: null, user: null },
        })
      );
    }
  } catch (e) {
    /* ignore */
  }
}

export function userIdFromToken(token) {
  return sessionFromToken(token)?.userId || null;
}
