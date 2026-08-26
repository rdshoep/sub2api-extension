# Development

## Install and build

```bash
pnpm install
pnpm compile
pnpm test
pnpm lint
pnpm build
pnpm zip
```

Chrome output: `.output/chrome-mv3/`
Zips: `pnpm zip:chrome` / `pnpm zip:edge` → `.output/*.zip`

Push to `main` runs `.github/workflows/pages.yml`: build both zips, copy them to `site/downloads/`, deploy GitHub Pages. The landing page links those zips. Do **not** commit zips.

## Load unpacked

1. Chrome or Edge → `chrome://extensions` (or `edge://extensions`)
2. Enable developer mode
3. Load unpacked → select `.output/chrome-mv3`
4. Pin the toolbar icon; click it to open the popup (it overlays the page and does not change layout)

## Real instance (read-only)

Do **not** put Admin keys in the repo, tests, or screenshots.

1. Add instance name + `https://your-host` (with or without `/api/v1`).
2. Choose `admin-api-key` or `jwt`.
3. Leave **只读** checked.
4. Grant the exact origin permission when prompted.
5. Confirm probe: version, capabilities, 今日概览.

Write tests against production are out of scope. Use the mock (`tests/mocks`) for balance/quota writes.

## Tests

- Unit: `pnpm test:unit`
- Component: `pnpm test:component`
- Contract (MSW + mock fetch): `pnpm test:contract`
- E2E (Playwright harness + mock Sub2API): `pnpm test:e2e`

## GitHub Pages

Push to `main` deploys `site/` via `.github/workflows/pages.yml` (includes Chrome/Edge sideload zips).
Public URL: https://rdshoep.com/sub2api-extension/

Screenshots live in `docs/images/` (README) and `site/images/`. Downloads: `site/downloads/*.zip` (generated in CI).

## AI builder

See `skills/sub2api-extension-builder/SKILL.md`. Run `node skills/sub2api-extension-builder/scripts/inspect-sub2api.mjs` before generating adapters. Never print secrets.
