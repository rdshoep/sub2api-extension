# Security (builder)

- No Admin API keys, JWTs, cookies, or bearer tokens in generated files.
- Use `optional_host_permissions` + exact origin request.
- Secrets: unlocked local persist is the recommended default; AES-GCM lock optional; session-only still available; never `storage.sync`.
- UI-facing vault API is available/locked/missing only.
- Redact Authorization, Cookie, API Key, Bearer in logs and error details.
- Capability report before codegen. Writes need confirmation + reason + read-after-write.
