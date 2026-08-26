# Sub2API API map (source of truth)

Mapped from `Wei-Shaw/sub2api` **main** on 2026-08-26 via `gh api` (workspace has no Sub2API tree).

## Sources

| File | Role |
| --- | --- |
| `frontend/src/api/admin/accounts.ts` | Accounts, usage, quota reset |
| `frontend/src/api/admin/users.ts` | Users, balance, platform quotas |
| `frontend/src/api/admin/dashboard.ts` | Snapshot v2, models, stats |
| `frontend/src/api/admin/ops.ts` | Ops snapshot, request/upstream errors, requests |
| `frontend/src/api/admin/system.ts` | Version probe |
| `frontend/src/api/client.ts` | Envelope unwrap, timezone, language, 401/404/423 |
| `frontend/src/api/adminUIRequest.ts` | `X-Admin-UI-Request` marker |
| `frontend/src/api/url.ts` | Default API base `/api/v1` |
| `frontend/src/types/index.ts` | Account, usage, dashboard, user types |
| `frontend/src/router/index.ts` | Admin deep-link routes |
| `frontend/tailwind.config.js` + `frontend/src/style.css` | Teal/cyan + slate theme |
| `skills/sub2api-admin/SKILL.md` | `x-api-key` then Bearer JWT |

Axios `baseURL` is `/api/v1`, so client paths like `/admin/accounts` are **`/api/v1/admin/accounts`** on the wire.

## Envelope and headers

- Success body: `{ code: 0, message, data }` — client unwraps `data`.
- Error body: `{ code, message, reason?, metadata? }`.
- Auth (skill + this extension): `x-api-key: <admin-api-key>` **or** `Authorization: Bearer <admin-jwt>`.
- GET query: `timezone=<IANA>` (client interceptor on every GET).
- Header: `Accept-Language` from UI locale.
- Admin UI marker: `X-Admin-UI-Request: 1` when the path is `/api/v1/admin/...`.
- Ops disabled: HTTP 404 with message `Ops monitoring is disabled` → structured `OPS_DISABLED` (not a blank page).
- 423 + `ADMIN_COMPLIANCE_ACK_REQUIRED` is a web-app compliance gate; the extension maps it as locked/forbidden, it does not implement the HTML ack UI.

JWT refresh in the web app uses `localStorage` refresh tokens and cookies (`withCredentials: true`). This extension does **not** copy that cookie session. Admin API Key failures surface as re-enter/regenerate. Stored JWT 401 surfaces as unauthorized (re-enter). No refresh-token flow unless the operator pastes a new access token.

## Mapped endpoints used by the adapter

| Capability | Method | Path | Notes |
| --- | --- | --- | --- |
| `platform.probe` | GET | `/api/v1/admin/system/version` | `{ version }` |
| `stats.today.read` | GET | `/api/v1/admin/dashboard/snapshot-v2` | `timezone`, `include_stats`, `include_model_stats` |
| `stats.models.read` | GET | `/api/v1/admin/dashboard/models` | `timezone`, `start_date`, `end_date` |
| `accounts.list` | GET | `/api/v1/admin/accounts` | `page`, `page_size`, filters; `If-None-Match` / 304 |
| `accounts.quota.read` | POST | `/api/v1/admin/accounts/usage/batch` | `{ account_ids, force }` — **batch uses `force`, not `source`** |
| `accounts.quota.read` (one) | GET | `/api/v1/admin/accounts/:id/usage` | `source=passive\|active`, optional `force=true` |
| `accounts.quota.refresh` | GET | `/api/v1/admin/accounts/:id/usage` | `source=active` (+ `force` when user confirms probe) |
| `accounts.quota.reset` | POST | `/api/v1/admin/accounts/:id/reset-quota` | Local quota usage reset |
| `users.list` | GET | `/api/v1/admin/users` | `page`, `page_size`, `search`, `status` |
| `users.balance.read` | GET | `/api/v1/admin/users/:id` | Detail |
| `users.balance.write` | POST | `/api/v1/admin/users/:id/balance` | `{ balance, operation: set\|add\|subtract, notes }` |
| `users.quota.read` | GET | `/api/v1/admin/users/:id/platform-quotas` | Lazy in user detail |
| `users.quota.reset` | POST | `/api/v1/admin/users/:id/platform-quotas/reset` | `{ platform, window: daily\|weekly\|monthly }` |
| `errors.read` | GET | `/api/v1/admin/ops/request-errors` | 404/feature-disabled → unsupported |
| `errors.read` | GET | `/api/v1/admin/ops/upstream-errors` | same fallback |
| `errors.read` (ops KPI) | GET | `/api/v1/admin/ops/dashboard/snapshot-v2` | error counts / rates |
| `errors.detail.read` | GET | `/api/v1/admin/ops/request-errors/:id` | body redacted in UI |
| `errors.detail.read` | GET | `/api/v1/admin/ops/upstream-errors/:id` | body redacted in UI |
| `links.open` | — | frontend routes below | never guessed |

## Deep links (from `frontend/src/router/index.ts` only)

| Surface | Path |
| --- | --- |
| Admin home | `/admin` |
| Dashboard / 今日概览 | `/admin/dashboard` |
| Accounts | `/admin/accounts` |
| Users | `/admin/users` |
| Ops / 异常 | `/admin/ops` |
| Usage | `/admin/usage` |
| Settings | `/admin/settings` |

There is **no** `/admin/accounts/:id` or `/admin/users/:id` route in the router. Deep links open the list pages above, not invented detail URLs.

## Field mapping (prompt vs source)

### Usage / remaining

`AccountUsageInfo` (`types/index.ts`):

- `source?: 'passive' | 'active'`
- `updated_at: string | null`
- `five_hour` / `seven_day` / extras: `UsageProgress | null`
- `UsageProgress.utilization` is **used percent**, may exceed 100
- `resets_at`, `remaining_seconds`, optional `used_requests` / `limit_requests`

UI remaining:

`remaining = clamp(100 - utilization, 0, 100)`

- `utilization > 100` → remaining `0` and state **超限**
- `progress === null` → **暂无数据** (`unknown`), never `0%`
- unlimited platform limit (`*_limit_usd === null`) → **∞**
- stale `updated_at` past freshness → **数据过期** (`stale`)

Batch usage **does not** take `source=passive|active`. Default path: `POST .../usage/batch` with `force: false` (cached/passive). Active/force probe is only the per-account GET with `source=active` (and optional `force`) after an explicit user action.

### Dashboard snapshot v2

`DashboardSnapshotV2Response`: `generated_at`, `start_date`, `end_date`, `stats?`, `models?`.

`DashboardStats` today fields used:

- `today_requests`, `today_tokens`, `today_actual_cost`, `today_account_cost`
- `rpm`, `tpm`
- account health: `normal_accounts`, `ratelimit_accounts`, `error_accounts`
- **no** `today_error_count` on dashboard stats — error count/rate come from ops snapshot when enabled

`ModelStat`: `model`, `requests`, `total_tokens`, `actual_cost` (not a donut).

### Users

List: `AdminUser` includes `email`, `username`, `status`, `balance`, `last_active_at` / `last_used_at`. Today actual cost is **not** on the list payload; optional batch `POST /admin/dashboard/users-usage` exists but is not required for list fields. Platform quotas are a **separate** GET and must be lazy-loaded in detail.

Reset window body is `{ platform, window }` — never a vague “reset all”.

### Ops errors

`OpsErrorLog`: `id`, `created_at`, `status_code`, `platform`, `model`, `message`, `account_name`, `user_email`, `phase`, `type`, `severity`, `request_id`.

Detail adds `error_body` (redact Authorization / Cookie / API Key / Bearer before render).

## Prompt mismatches (source wins)

1. **Batch usage** uses `{ account_ids, force }` not `source=passive|active`.
2. **Dashboard stats have no today error count**; ops snapshot supplies error metrics.
3. **No per-entity admin detail routes** — deep links are list pages.
4. **Admin UI marker header** is `X-Admin-UI-Request`, not a custom `X-Requested-With`.
5. **Timezone is a GET query param**, not an HTTP header.
6. **OpenAI upstream quota reset** (`POST /admin/openai/accounts/:id/reset-quota`) is a different, credit-consuming API. V1 write is **local** `POST /admin/accounts/:id/reset-quota` only. Optional API-key 5h/1d/7d reset is out of scope.
7. Web client sends cookies (`withCredentials`). The extension uses explicit `x-api-key` / Bearer only.

## Capability matrix (probe)

| id | Probe | Missing behavior |
| --- | --- | --- |
| `platform.probe` | GET `/admin/system/version` | connection `offline` / `unauthorized` |
| `accounts.list` | GET `/admin/accounts?page=1&page_size=1` | `unsupported` |
| `accounts.quota.read` | inferred if list works; batch 404 → `unsupported` | |
| `accounts.quota.refresh` | same as usage GET | `unsupported` (no fake active probe) |
| `accounts.quota.reset` | advertised; 404 on write → `unsupported` | |
| `users.list` | GET `/admin/users?page=1&page_size=1` | `unsupported` |
| `users.balance.write` | advertised from users API | 404 → `unsupported`, never fake success |
| `users.quota.read` | GET platform-quotas on demand | `unsupported` |
| `users.quota.reset` | advertised | 404 → `unsupported` |
| `stats.today.read` | GET snapshot-v2 | `unsupported` |
| `stats.models.read` | GET models | `unsupported` |
| `errors.read` | GET request-errors page_size=1 | 404 / OPS_DISABLED → `unsupported` (graceful) |
| `errors.detail.read` | same family | `unsupported` |
| `links.open` | always local | uses mapped routes only |
