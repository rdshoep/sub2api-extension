# Sub2API Console

<p align="center"><strong>English</strong> · <a href="README.zh-CN.md">中文</a></p>

<p align="center">
  <img src="public/icon/128.png" width="96" height="96" alt="Sub2API Console">
</p>

<p align="center">
  <strong>A multi-instance Sub2API operations console for Chrome / Edge</strong><br>
  Click the toolbar icon to see quota, usage, users, and errors — without opening the admin site.
</p>

<p align="center">
  Community companion for <a href="https://github.com/Wei-Shaw/sub2api">Sub2API</a> · Manifest V3 popup · no content scripts
</p>

---

One Sub2API instance is fine in the admin UI. Several instances means tab-hopping, comparing remaining quota, and hunting who is burning tokens.

**Sub2API Console** folds those instances into a 480×600 popup: additive overview, remaining quota at a glance, users ranked by spend, and recent errors. Secrets are remembered without a password by default (reload works immediately). Writes require Allow Writes and a reason.

The UI follows your browser language (Chinese or English) and can be switched from the popup footer.

Landing page: [rdshoep.github.io/sub2api-extension](https://rdshoep.github.io/sub2api-extension/)

<p align="center">
  <img src="docs/images/screenshot-overview.png" width="480" alt="Overview: 24h metrics, per-user token trend, auto-refresh countdown">
</p>
<p align="center">
  <img src="docs/images/screenshot-accounts.png" width="480" alt="Accounts: 5h / 7d remaining rings, reset countdown, pin and per-card refresh">
</p>

## What it does

### Many instances, one entry

- Add any number of Sub2API sites (display name + base URL + Admin API key or JWT)
- Switch **All instances** vs a single site; the last tab is remembered
- All-instances **sums** requests, tokens, cost, and errors — remaining quota **is never averaged**
- If one site is down, the others still render, with a partial-failure banner

### Overview

- Today / last 24 hours / last 7 days
- Requests, tokens, actual cost, account cost (with `$`), error rate, RPM / TPM
- Healthy / rate-limited / erroring account counts
- **Per-user token trend**, like the bottom of the Sub2API dashboard — hover a point for that timestamp
- Model usage table

### Account quota

- One card per upstream account: platform logo, 5h / 7d remaining rings
- Center shows remaining percent; below it, status (healthy / warning / exhausted / stale…) and **time until refresh**
- Stale data still draws the last ring in gray; tap ↻ to force-refresh that account
- Pin favorites to the top

### Users

- Sorted by today’s spend, then balance
- Left status bar: green = ok, yellow / red = not ok
- `email (alias)`, with currency on balance and spend
- Adjust balance or reset a user’s daily / weekly / monthly window on one platform (writes must be enabled)

### Errors

- Last 24 hours of request / upstream errors
- **Admin** opens that instance’s dashboard

### Security

- **No content scripts** — the current page is untouched
- No `<all_urls>` at install; adding an instance requests **that origin only**
- Secrets default to **remembered without a password** (reload works immediately). Optional per-instance password lock uses AES-GCM; session-only (no persist) is still available.
- Writes: read-only switch + capability probe + required reason + before/after + double-submit guard
- Overview / accounts / users / errors cache locally for 1 day (show cache first, then refresh)

## Install

Node.js 20+ and [pnpm](https://pnpm.io/). After cloning:

```bash
pnpm install
pnpm build
```

1. Open `chrome://extensions` or `edge://extensions`
2. Enable **Developer mode**
3. **Load unpacked** and select `.output/chrome-mv3`
4. Pin the icon and click it

Zip: `pnpm zip` → `.output/*.zip`

## First run

1. Open the extension → **Instances**
2. Display name + site URL (`https://your-host` or with `/api/v1`)
3. `admin-api-key` or `jwt`, paste the admin secret (never commit it)
4. Leave **Read-only** on. **Remember credentials** is on by default (recommended). Optionally lock with a password. Then **Test and save**
5. Use Overview / Accounts / Users / Errors

To change balances or reset windows, turn off read-only for that instance and fill in a reason.

## What it is not

- Not the official [Sub2API](https://github.com/Wei-Shaw/sub2api) extension — a community console over its Admin API
- Does not proxy model traffic
- No website cookie / JWT refresh; a 401 means re-enter the secret
- Firefox is not a target

## Development

```bash
pnpm install
pnpm dev          # Chrome
pnpm typecheck
pnpm lint
pnpm test:unit && pnpm test:component && pnpm test:contract && pnpm test:e2e
pnpm build
```

Stack: WXT 0.20 · Vue 3 · TypeScript · Pinia · Tailwind CSS.

- [Architecture](docs/architecture.md)
- [Sub2API API map](docs/sub2api-api-map.md)
- [Security](docs/security.md)
- [Development](docs/development.md)

## License

No license file yet. Confirm with the author before reuse.

---

If you also babysit several Sub2API boxes, this popup should save you a few admin tabs. Issues and PRs welcome.
