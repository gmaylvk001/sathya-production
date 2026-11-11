# Archived build-time dead weight

Moved **out of `app/` / `models/`** so Next.js does not compile these on every `npm run build`.

## Contents
- `legacy-routes/` — design-system playground, unused CSS/JS bundles
- `unused-models/` — duplicate / old mongoose model files (not imported)
- `unused-routes/admin/` — duplicate admin pages superseded by `admin/finance/*`
- `unused-routes/api/` — APIs with no live callers (abandoned alias, sections, productview, etc.)

Restore by moving back under `app/` or `models/` if production still needs a path.
