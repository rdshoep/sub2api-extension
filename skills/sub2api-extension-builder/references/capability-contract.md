# Capability contract

Required adapter methods: `probeConnection`, `listAccounts`, `getAccountQuotaBatch`, `refreshAccountQuota`, `resetAccountQuota`, `listUsers`, `getUser`, `getUserPlatformQuotas`, `adjustUserBalance`, `resetUserQuotaWindow`, `getTodaySnapshot`, `getTodayModelStats`, `listErrors`, `getErrorDetail`, `getDeepLinks`.

Capability IDs:

```
platform.probe
accounts.list
accounts.quota.read
accounts.quota.refresh
accounts.quota.reset
users.list
users.balance.read
users.balance.write
users.quota.read
users.quota.reset
stats.today.read
stats.models.read
errors.read
errors.detail.read
links.open
```

Probe with read-only GETs. Map 404 / feature-disabled to `unsupported`. Never fake a successful write.
