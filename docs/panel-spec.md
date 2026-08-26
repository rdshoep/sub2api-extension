# PanelSpec

PanelSpec is a **packed assembly** file, not a programming language.

Schema: `schemas/panel-spec.schema.json`. Adapter contract: `schemas/adapter-spec.schema.json`.

The Sub2API pack is `src/packs/sub2api.panel.yaml`. It is parsed and validated at runtime (`src/core/specs/validate.ts`). Unknown widget, query, action, or formatter IDs fail. Strings may not contain `eval`, `new Function`, dynamic `import(`, or `SecretVault`.

## Packed IDs

Widgets: MetricGrid, MetricCard, ModelUsageTable, ErrorFeed, EntityGrid, EntityTable, AccountQuotaCard, QuotaRing, QuotaRingPair, QuotaWindowGrid, TrendChart, UserBalanceCard, LastUpdated, EmptyState, PartialFailureBanner.

Queries: `stats.today`, `stats.models.today`, `errors.latest`, `accounts.list`, `users.list`.

Actions: `user.balance.adjust`, `user.quota.reset`, `accounts.quota.reset`.

## Confirmation policy

Write actions declare:

- `showBeforeAfter`
- `requireReason`
- `requireTargetIdentity`
- `verifyAfterWrite`

The kernel enforces those flags. The spec cannot bypass them with expressions.
