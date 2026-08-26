# Security

- Production manifest uses `optional_host_permissions` (`http://*/*`, `https://*/*`) so the extension can **request one exact origin** when an instance is added. It does **not** set `host_permissions` to `<all_urls>` and does not ship content scripts.
- Connection metadata (name, origin, capabilities) lives in `storage.local`.
- Credentials default to **unlocked persist** in `storage.local` (plain, recommended) so reload does not require unlock. Optional password lock encrypts that connection with AES-GCM (unwrap key stays in session after unlock). Session-only (no persist) remains available. `storage.sync` is unused.
- `SecretVault.getUiStatus()` returns only `available | locked | missing`. Plaintext is revealed solely inside the background HTTP client (`revealForRequest`).
- Logs, toasts, audit entries, and error details run through `redactSecrets`. Authorization, Cookie, API Key, and Bearer tokens are stripped.
- Read-only is a UI/kernel guard, not a substitute for server ACLs.
- Writes require capability + Allow Writes + confirmation. Missing server capability is `unsupported`, never a fake success.
- Production Vue build disables devtools. Debug `safeLog` only runs when `import.meta.env.DEV` is true.
- Error bodies are truncated (2 KB) and never stored in full.
