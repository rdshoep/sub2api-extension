---
name: sub2api-extension-builder
description: Generate Sub2API Console adapter packs and PanelSpec assemblies from a target admin API. Use when adding a new backend adapter, packing a panel, or validating capability reports for the Sub2API Console extension. Never print secrets.
---

# Sub2API Extension Builder

This skill generates **Adapter Packs** and **PanelSpec** files for the Sub2API Console kernel. It does not replace `sub2api-admin` (that skill performs live admin API calls). Combine them: `sub2api-admin` for reliable API I/O, this skill for extension/panel code.

## Hard rules

1. Read the target system source, OpenAPI, or TypeScript API modules **first**.
2. Emit a **capability report** before any codegen.
3. Discovery calls are **read-only**.
4. Prefer PanelSpec assembly of packed widgets/queries/actions.
5. Scaffold a TypeScript adapter only when packed capabilities cannot express the system.
6. After codegen, run schema validation, unit tests, contract tests, and `pnpm build`.
7. Writes must include before/after, confirmation, reason, and read-after-write.
8. **Never** put secrets in this skill, examples, fixtures, logs, or screenshots.
9. Deliver `adapter-manifest.json`, capability matrix, API map, and a security review.
10. Unknown widget/query/action IDs must fail validation. No `eval`, remote JS, or SecretVault access from specs.

## Workflow

```bash
node scripts/inspect-sub2api.mjs /path/to/sub2api
node scripts/validate-panel-spec.mjs ../../src/packs/sub2api.panel.yaml
node scripts/scaffold-adapter.mjs --id example --out ../../src/providers/example
```

Read [references/capability-contract.md](references/capability-contract.md), [references/panel-spec.md](references/panel-spec.md), and [references/security.md](references/security.md) before generating files.
