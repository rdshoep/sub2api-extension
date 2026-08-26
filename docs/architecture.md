# Architecture

Sub2API Console is a Chrome/Edge **Manifest V3** extension. The toolbar **popup** is the main UI (it does not push the page aside). There is no content script and no remote JavaScript execution.

```
Popup / Options UI
  → Typed RPC (chrome.runtime messaging)
  → Background service worker
  → ConnectionRegistry + SecretVault + QueryCoordinator
  → PlatformAdapter
  → Sub2APIAdapter
  → Typed HTTP client
  → Sub2API instance (`{origin}/api/v1/...`)
```

Vue components never concatenate HTTP URLs. They call `rpc(method, payload)` only.

## Kernel vs adapter

- **Console Kernel** (`src/core`): connections, optional host permissions, secret vault, RPC, HTTP, cache, write guards, PanelSpec validation, shared widgets.
- **Sub2API Adapter Pack** (`src/providers/sub2api`, `src/packs/sub2api.panel.yaml`): endpoints, envelope-aware calls, field normalizers, deep links, theme tokens, packed views.

A second backend later should implement `PlatformAdapter` and a PanelSpec that references packed widget/query/action IDs. Unknown IDs fail validation. Specs cannot `eval`, load remote JS, or read `SecretVault`.

## Multi-instance

Entities use `${connectionId}:${entityId}`. “全部实例” uses `Promise.allSettled` with per-instance timeouts. Additive metrics (requests, tokens, costs, error counts) are summed. Quota percents are **never** averaged; the UI shows critical count, lowest remaining, and nearest reset.

## Writes (V1)

Only three single-instance writes exist:

1. `POST /api/v1/admin/users/:id/balance` — set / add / subtract
2. `POST /api/v1/admin/users/:id/platform-quotas/reset` — one platform + daily|weekly|monthly
3. `POST /api/v1/admin/accounts/:id/reset-quota` — local quota usage

Each requires Allow Writes, a capability that is not `unsupported`, a reason, before/after confirmation, a double-submit guard, read-after-write, and a secret-free local audit entry.
