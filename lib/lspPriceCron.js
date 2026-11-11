// LSP cron helpers. Schedule times are NOT in-app — trigger via
// /api/cron/lsp-product-report when cron_lsp_price_run_dev=on.
// On-demand PDP comparison is separate: lsp_pdp_live_comparison + /api/price-tracker.

// Env names are matched case-insensitively.
export function readEnv(name) {
  const key = Object.keys(process.env).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? process.env[key] : undefined;
}

// on / 1 / true / yes (any case) is on; anything else or missing is off.
export function isEnvOn(name) {
  const value = String(readEnv(name) ?? "").trim().toLowerCase();
  return ["on", "1", "true", "yes"].includes(value);
}

/** Master switch for /api/cron/lsp-product-report — cron_lsp_price_run_dev=on */
export function isLspCronEnabled() {
  return isEnvOn("cron_lsp_price_run_dev");
}

/** Report mail after a run: cron_lsp_price_mail_send */
export function isLspCronMailEnabled() {
  return isEnvOn("cron_lsp_price_mail_send");
}

/**
 * Product details page only — Live Market Comparison /api/price-tracker.
 * Separate from cron_lsp_price_run_dev. Missing / off = PDP widget + API off.
 */
export function isLspPdpEnabled() {
  return isEnvOn("lsp_pdp_live_comparison");
}
