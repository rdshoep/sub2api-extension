# Sub2API Console — delivery report

## 1. Goal completion and installability

The workspace is a named **Sub2API Console** Chrome/Edge MV3 extension. `pnpm install`, `pnpm typecheck`, `pnpm lint`, Vitest (unit/component/contract), Playwright E2E (twice), and `pnpm build` (twice) + `pnpm zip` succeed.

Unpacked path: `.output/chrome-mv3/`  
Zip: `.output/sub2api-console-1.0.0-chrome.zip`

Toolbar icon opens a **popup** (does not change page layout). No content scripts. No default `<all_urls>` host permission.

## 2. Architecture and security

Kernel + Sub2API adapter + PanelSpec. UI talks typed RPC only. Secrets default to unlocked local persist (reload without unlock); optional AES-GCM lock per connection; session-only still available. UI vault API is available/locked/missing. Exact-origin optional host permission on add. Writes: Allow Writes + capability + reason + before/after + double-submit guard + read-after-write + secret-free audit.

## 3. Implemented surfaces

- Onboarding / add ≥2 instances (name, Base URL with/without `/api/v1`, admin-api-key or jwt, read-only)
- 今日概览 (IANA timezone + date, additive 全部实例, partial failure)
- 上游账号 5h/7d QuotaRing (remaining, 超限, —, ∞, 暂无数据, 数据过期)
- 用户 search + lazy platform quotas
- 异常 (ops 404 → unsupported)
- Three V1 writes
- Light/dark class theme (Sub2API teal/cyan + slate CSS variables)

## 4. API mapping

See `docs/sub2api-api-map.md` (Wei-Shaw/sub2api main, 2026-08-26). Adapter uses mapped `/api/v1/admin/...` paths, `{code,message,data}` unwrap, `x-api-key` / Bearer, `timezone` query, `Accept-Language`, `X-Admin-UI-Request: 1`.

## 5. Verification results

| Check | Result |
| --- | --- |
| Unit (38) | pass |
| Component (11) | pass |
| Contract (2, MSW + mock fetch) | pass |
| Playwright E2E ×2 (5 tests each, including reload/re-enter) | pass both runs |
| typecheck (`vue-tsc --noEmit`) | pass |
| lint (`eslint .`) | pass |
| Chrome build ×2 | both 150.24 kB, success |
| zip | `.output/sub2api-console-1.0.0-chrome.zip` 55.65 kB |
| Secret scan | no live Admin keys/JWTs in source or `.output` |

## 6. Build / zip paths

- `/Users/zhangliang/project/rdshoep/sub2api-extension/.output/chrome-mv3`
- `/Users/zhangliang/project/rdshoep/sub2api-extension/.output/sub2api-console-1.0.0-chrome.zip`

## 7. Chrome/Edge install

1. `pnpm install && pnpm build`
2. `chrome://extensions` or `edge://extensions` → Developer mode → Load unpacked → `.output/chrome-mv3`
3. Pin the icon and click it to open the popup

## 8. Real instance (read-only)

See `docs/development.md`. Do not put Admin keys in the repo. Keep 只读 on. Writes against unknown production hosts are out of scope.

## 9. Limits

- No live Admin credentials in this environment; mock Sub2API is the automated bar.
- Playwright drives the real Vue app + kernel + adapter + HTTP client against the mock (harness). Unpacked MV3 Side Panel click is not automated here; `tests/e2e/extension-load.spec.ts` checks the built manifest instead.
- JWT cookie refresh from the web app is not copied; 401 requires re-entering the token.
- Optional API-key 5h/1d/7d reset and OpenAI credit reset are out of V1.
- Firefox Side Panel parity is not claimed.
- Chart.js omitted; model stats use a table + bar.

## 10. Next steps

- Load unpacked against a real read-only instance
- Optional persist-vault unlock UX polish
- Packed widget renderer driven entirely by PanelSpec (views are currently assembled in Vue to match the pack)
- Additional adapters via `skills/sub2api-extension-builder`
