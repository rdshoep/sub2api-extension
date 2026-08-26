# Sub2API 浏览器插件：产品设计与 Goal-Oriented Agent 启动提示词

## 一、产品定位

产品工作名：**Sub2API Console**。

它不是把 Sub2API 管理后台缩小后塞进浏览器，而是一个面向日常运维的、多实例聚合的浏览器侧边栏控制台：快速查看上游账号额度、用户余额与平台额度、今日统计和异常，并对高风险写操作提供严格保护。

第一版即采用两层结构：

1. **Console Kernel**：浏览器运行时、多实例管理、权限、认证、缓存、通用组件、配置解析、安全动作框架。
2. **Sub2API Adapter Pack**：Sub2API API 适配、字段归一化、深链、主题 Token、面板装配配置。

只实现一个 Sub2API Adapter，但从第一天就保持适配器边界；不要在第一期建设拖拽式低代码平台，也不要支持任意远程 JavaScript。

---

## 二、建议的信息架构

### 1. 今日概览

- 顶部必须明确区分：
  - **实例**：不同 Sub2API 部署地址。
  - **上游平台**：OpenAI、Anthropic、Gemini、Grok 等。
- 支持“全部实例”和单实例视图。
- 显示今日请求量、Token、实际扣费、账号成本、错误数/错误率、正常/限流/异常账号数、RPM、TPM。
- 模型统计使用横向条形图或表格，不使用环形图；环形图只用于额度。
- 显示最新异常，并提供跳转到对应 Sub2API 后台的深链。

### 2. 上游账号

- 支持按实例、上游平台、状态、分组、关键词筛选。
- 列表卡片显示：账号名称、平台、状态、调度状态、数据更新时间、额度数据来源。
- 对 5h 和 7d 额度，在列表中使用两个独立的小环形图；详情中可以使用双层环形图，但必须带图例。
- 环形图中心显示“剩余百分比”，而不是“已用百分比”。
- 环下显示“已用百分比、绝对重置时间、倒计时、最后更新时间”。
- `utilization` 超过 100 时，剩余量固定为 0，并显示“超限”状态。
- `null`、无限额、无数据、过期数据必须分别显示为 `—`、`∞`、`暂无数据`、`数据过期`，不能混为 0%。
- 默认只读取被动采集的数据；“主动刷新/强制刷新”必须由用户手动触发，并标记可能产生上游探测。

### 3. 用户

- 用户列表显示：邮箱、用户名、状态、余额、今日实际消费、最近活跃时间。
- 用户详情分为：余额、平台额度、API Key 三个区域。
- “重置”不能做成含义模糊的单按钮，必须拆成：
  - 设置/增加/扣减用户余额。
  - 重置某一上游平台的 daily/weekly/monthly 使用窗口。
  - 重置某个上游账号的本地配额使用量。
  - 可选：重置某个 API Key 的 5h/1d/7d 使用量。
- 所有写操作显示变更前、变更后、目标实例、目标用户/账号、动作类型，并要求填写原因。
- 默认禁止跨实例批量写操作。

### 4. 异常

- 显示请求错误、上游错误、状态码、模型、平台、账号、用户、时间和摘要。
- 支持按实例、时间、平台、状态码、模型、错误类型筛选。
- 错误详情默认隐藏可能包含隐私信息的正文；展开时对 Token、Authorization、Cookie、API Key 等做脱敏。
- 支持跳转到 Sub2API 原后台查看完整上下文。

### 5. 实例管理

每个连接包含：

- 显示名称。
- Base URL。
- 认证方式：Admin API Key 或 Admin JWT。
- 默认只读/允许写操作开关。
- 是否启用后台告警。
- 最后连接时间、版本、能力探测结果。
- “测试连接”“打开后台”“编辑”“锁定凭证”“删除”。

添加实例时，仅申请该实例精确 Origin 的运行时主机权限，不在安装时申请所有网站权限。

---

## 三、组件与领域模型

### 通用组件

- `AppShell`
- `InstanceSwitcher`
- `ConnectionHealthBadge`
- `MetricGrid`
- `MetricCard`
- `QuotaRing`
- `QuotaRingPair`
- `QuotaWindowGrid`
- `TrendChart`
- `ModelUsageTable`
- `EntityTable`
- `AccountQuotaCard`
- `UserBalanceCard`
- `ErrorFeed`
- `LastUpdated`
- `EmptyState`
- `PartialFailureBanner`
- `ConfirmActionDialog`
- `SecretUnlockDialog`

### 归一化领域模型

```ts
interface PlatformConnection {
  id: string
  name: string
  baseUrl: string
  authRef: string
  authMode: 'admin-api-key' | 'jwt'
  readOnly: boolean
  version?: string
  status: 'online' | 'offline' | 'unauthorized' | 'degraded'
  capabilities: Record<string, 'supported' | 'degraded' | 'unsupported'>
  lastCheckedAt?: string
}

interface QuotaWindow {
  id: string
  label: string
  usedPercent?: number
  remainingPercent?: number
  used?: number
  limit?: number
  unit?: 'percent' | 'usd' | 'requests' | 'tokens' | 'credits'
  resetAt?: string | null
  remainingSeconds?: number | null
  source?: 'passive' | 'active' | 'local' | 'upstream'
  updatedAt?: string | null
  state: 'healthy' | 'warning' | 'critical' | 'exhausted' | 'unlimited' | 'unknown' | 'stale'
}

interface NormalizedAccount {
  uid: string // `${connectionId}:${accountId}`
  connectionId: string
  id: number
  name: string
  upstreamPlatform: string
  status: string
  schedulable?: boolean
  quotaWindows: QuotaWindow[]
  raw?: unknown
}

interface NormalizedUser {
  uid: string
  connectionId: string
  id: number
  email: string
  username: string
  balance: number
  status: string
  todayActualCost?: number
  platformQuotas?: QuotaWindow[]
}

interface TodaySnapshot {
  connectionId: string
  date: string
  timezone: string
  requests: number
  tokens: number
  actualCost: number
  accountCost?: number
  errorCount?: number
  errorRate?: number
  rpm?: number
  tpm?: number
  models: Array<{
    model: string
    requests: number
    tokens: number
    actualCost: number
  }>
}
```

---

## 四、配置化方案

配置化分成两类：

### 1. Assembly Mode

通过签名或本地导入的 JSON/YAML 配置，装配已随扩展打包的组件、查询和动作。禁止 `eval`、动态 import 远程代码、任意脚本表达式。

```yaml
schemaVersion: 1
pack:
  id: sub2api-admin
  adapter: sub2api
  minAdapterVersion: 1

theme:
  preset: sub2api

views:
  overview:
    scopes: [all-instances, instance]
    widgets:
      - type: MetricGrid
        query: stats.today
        fields: [requests, tokens, actualCost, errorCount, rpm, tpm]
      - type: ModelUsageTable
        query: stats.models.today
      - type: ErrorFeed
        query: errors.latest
        limit: 10

  accounts:
    widgets:
      - type: EntityGrid
        query: accounts.list
        itemComponent: AccountQuotaCard
        itemProps:
          preferredWindows: [five-hour, seven-day]

  users:
    widgets:
      - type: EntityTable
        query: users.list

actions:
  user.balance.adjust:
    capability: users.balance.write
    confirmation:
      showBeforeAfter: true
      requireReason: true
      requireTargetIdentity: true
      verifyAfterWrite: true

  user.quota.reset:
    capability: users.quota.reset
    confirmation:
      showBeforeAfter: true
      requireReason: true
      verifyAfterWrite: true
```

### 2. Adapter Code Mode

当新系统无法通过预置能力表达时，AI 生成 TypeScript Adapter、Normalizer、深链和必要组件；代码必须进入仓库、经过测试和构建，再随扩展发布。不能下载远程 JavaScript 后立即执行。

### 能力标识

```text
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

---

## 五、推荐项目结构

```text
sub2api-console-extension/
├── entrypoints/
│   ├── background.ts
│   ├── sidepanel/
│   └── options/
├── src/
│   ├── core/
│   │   ├── adapters/
│   │   ├── capabilities/
│   │   ├── connections/
│   │   ├── http/
│   │   ├── messaging/
│   │   ├── query-cache/
│   │   ├── security/
│   │   ├── specs/
│   │   └── widgets/
│   ├── domain/
│   ├── providers/
│   │   └── sub2api/
│   │       ├── adapter.ts
│   │       ├── endpoints.ts
│   │       ├── normalizers.ts
│   │       ├── capabilities.ts
│   │       ├── deep-links.ts
│   │       └── theme.ts
│   ├── packs/
│   │   └── sub2api.panel.yaml
│   ├── components/
│   ├── stores/
│   └── styles/
├── schemas/
│   ├── panel-spec.schema.json
│   └── adapter-spec.schema.json
├── skills/
│   └── sub2api-extension-builder/
│       ├── SKILL.md
│       ├── references/
│       └── scripts/
├── tests/
│   ├── unit/
│   ├── component/
│   ├── contract/
│   └── e2e/
├── docs/
│   ├── architecture.md
│   ├── panel-spec.md
│   ├── sub2api-api-map.md
│   ├── security.md
│   └── development.md
└── README.md
```

---

# Goal-Oriented Agent 启动提示词

将下面整段直接交给编码 Agent：

```text
你是一名资深浏览器扩展架构师、Vue/TypeScript 工程师、产品工程负责人和安全审查员。你需要在当前工作区内独立完成一个可构建、可安装、可测试的 Sub2API 浏览器扩展，而不是只输出设计文档、伪代码或静态 Mockup。

# GOAL

交付一个名为 “Sub2API Console” 的 Chrome/Edge Manifest V3 浏览器扩展。它以 Side Panel 为主界面，支持管理多个 Sub2API 实例，聚合查看上游账号额度、用户余额和平台额度、今日统计、模型使用量与异常信息，并允许在严格确认和审计保护下执行有限的额度/余额重置操作。

扩展必须同时具备面向未来的配置化基础：通用 Console Kernel + Sub2API Adapter Pack + PanelSpec。第一期只实现 Sub2API Adapter，不建设拖拽式低代码编辑器，不允许运行远程 JavaScript。

# DEFINITION OF DONE

只有同时满足以下条件，任务才算完成：

1. 项目可以使用包管理器安装依赖并成功构建 Chrome MV3 扩展。
2. 扩展可以以 unpacked extension 方式安装，并通过工具栏图标打开 Side Panel。
3. 可以添加至少两个 Sub2API 实例，测试连接、切换单实例和查看全部实例聚合数据。
4. 可以查看上游账号及其 5h/7d 等额度窗口，使用环形图展示剩余比例、重置时间、数据来源和新鲜度。
5. 可以搜索用户、查看余额和平台额度。
6. 可以执行三种受控写操作：调整用户余额、重置用户某平台某窗口额度、重置上游账号本地配额；没有服务端能力时必须显示 unsupported，而不是伪造成功。
7. 可以查看今日请求量、Token、实际扣费、账号成本、RPM、TPM、模型维度统计和异常列表。
8. 支持浅色/深色主题，视觉与 Sub2API 当前管理后台保持一致。
9. 所有敏感凭证都不出现在日志、错误报告、DOM 文本或导出配置中。
10. 单元测试、组件测试、API Contract Mock 测试和关键 E2E 流程通过。
11. 产出完整 README、架构文档、配置规范、安全说明和 AI Builder Skill。
12. 最终给出构建产物路径、安装方法、测试结果、已知限制和后续建议。

# SOURCE OF TRUTH

按以下优先级判断事实，禁止凭记忆猜接口：

1. 当前工作区中的 Sub2API 源码。
2. Wei-Shaw/sub2api 当前主分支源码。
3. Sub2API 自带的 sub2api-admin Skill、API 类型与前端 API 封装。
4. 对测试实例执行的只读请求结果。
5. 文档和 README。

如果接口、字段或路由与本提示词不同，以源码为准，并在 docs/sub2api-api-map.md 中记录差异。

开始编码前先检查：

- frontend/src/api/admin/accounts.ts
- frontend/src/api/admin/users.ts
- frontend/src/api/admin/dashboard.ts
- frontend/src/api/admin/ops.ts
- frontend/src/api/client.ts
- frontend/src/api/adminUIRequest.ts
- frontend/src/types/index.ts
- frontend/tailwind.config.js
- frontend/src/style.css
- skills/sub2api-admin/SKILL.md

不得把测试或生产 Admin API Key 写进源码、测试快照、提交记录、日志或截图。

# PRODUCT MODEL

必须在界面和代码中区分：

- Instance：一个 Sub2API 部署地址。
- Upstream Platform：OpenAI、Anthropic、Gemini、Grok、Antigravity 等上游平台。

所有跨实例实体使用复合 UID，例如 `${connectionId}:${entityId}`，避免 ID 冲突。

“全部实例”视图只聚合可加总的指标，例如请求数、Token、费用和错误数。不得平均多个账号的额度百分比；应显示临界账号数量、最低剩余比例和最近重置时间。

# REQUIRED USER FLOWS

## Flow A：首次配置

1. 安装后打开 Side Panel。
2. 没有实例时显示 onboarding。
3. 添加实例：名称、Base URL、认证方式、凭证、只读开关。
4. 标准化 Base URL，自动处理是否带 `/api/v1`。
5. 请求该实例精确 Origin 的 optional host permission。
6. 执行只读能力探测，显示版本、认证状态和 capability matrix。
7. 保存非敏感元数据；凭证按安全规则保存。

## Flow B：今日概览

1. 默认显示上次使用的实例；可以切换到全部实例。
2. 今日时间范围必须显式传递浏览器 IANA timezone，并在界面显示日期和时区。
3. 显示 KPI、模型统计和最新异常。
4. 多实例请求使用独立超时和 Promise.allSettled；部分实例失败时显示 partial failure，不得让整个页面报错。
5. 显示每个数据块的更新时间和 stale 状态。

## Flow C：上游账号额度

1. 获取账号列表，优先利用 ETag 或服务端已有缓存能力。
2. 使用批量额度接口，避免逐账号 N+1 请求；批量大小以服务端实际限制为准。
3. 默认读取 passive usage，不自动 force active probe。
4. 手动主动刷新时，清晰提示会触发上游探测。
5. 将 Sub2API 的不同额度结构归一化为 QuotaWindow[]。
6. OpenAI/Anthropic 类账号优先显示 5h 和 7d；其他平台按 Adapter 定义的窗口优先级显示。
7. API 中 utilization 表示已用比例时，UI 计算 remaining = clamp(100 - utilization, 0, 100)。
8. 列表使用两个独立小环；详情可使用双层环，但必须有标签、图例和文本数值。

## Flow D：用户与额度操作

1. 用户列表只加载列表可直接返回的字段；平台额度在用户详情中懒加载，避免 N+1。
2. 余额调整支持 set/add/subtract，显示 before/after，要求 notes/reason。
3. 用户平台额度重置必须选择 platform 和 window，不能使用含义不明的“全部重置”。
4. 上游账号配额重置必须显示实例、账号名称、账号 ID 和当前额度状态。
5. 所有写操作：
   - 连接必须显式开启 Allow Writes。
   - 只读连接禁用按钮，并解释原因。
   - 防止双击和重复提交。
   - 显示 before/after 和目标身份。
   - 要求填写原因。
   - 成功后立即 read-after-write 验证。
   - 失败时保留原数据并显示结构化错误。
   - 记录不含秘密的本地审计条目。
6. 第一版禁止跨实例批量写操作。

## Flow E：异常

1. 优先使用 Admin Ops 能力；Ops 未启用或返回 feature-disabled/404 时优雅降级。
2. 支持请求错误、上游错误和异常概览。
3. 错误列表显示摘要；详情默认折叠。
4. 对 Authorization、Cookie、API Key、Bearer Token 和疑似密钥内容脱敏。
5. 提供打开原 Sub2API 后台的深链；路由必须从源码确认，不能猜测。

# API CAPABILITIES TO VERIFY

以下只是需要验证和映射的候选能力，不得跳过源码检查：

- GET `/api/v1/admin/accounts`
- POST `/api/v1/admin/accounts/usage/batch`
- GET `/api/v1/admin/accounts/:id/usage`
- POST `/api/v1/admin/accounts/:id/reset-quota`
- GET `/api/v1/admin/users`
- POST `/api/v1/admin/users/:id/balance`
- GET `/api/v1/admin/users/:id/platform-quotas`
- POST `/api/v1/admin/users/:id/platform-quotas/reset`
- GET `/api/v1/admin/dashboard/snapshot-v2`
- GET `/api/v1/admin/dashboard/models`
- GET `/api/v1/admin/ops/dashboard/snapshot-v2`
- GET `/api/v1/admin/ops/request-errors`
- GET `/api/v1/admin/ops/upstream-errors`
- GET `/api/v1/admin/ops/requests`

认证优先支持：

- `x-api-key: <admin-api-key>`
- `Authorization: Bearer <admin-jwt>`

同时检查并复用 Sub2API 管理前端需要的 timezone、Accept-Language、管理 UI 标记和标准 `{code,message,data}` 响应解包逻辑。

# ARCHITECTURE

使用以下分层，不得让 Vue 组件直接拼接 HTTP URL：

Side Panel / Options UI
  -> Typed RPC / Messaging
  -> MV3 Background Service Worker
  -> ConnectionRegistry + SecretVault + QueryCoordinator
  -> PlatformAdapter interface
  -> Sub2APIAdapter
  -> Typed HTTP Client
  -> Sub2API instance

必须定义 PlatformAdapter 接口，至少包含：

- probeConnection
- listAccounts
- getAccountQuotaBatch
- refreshAccountQuota
- resetAccountQuota
- listUsers
- getUser
- getUserPlatformQuotas
- adjustUserBalance
- resetUserQuotaWindow
- getTodaySnapshot
- getTodayModelStats
- listErrors
- getErrorDetail
- getDeepLinks

Adapter 返回归一化领域对象，不将 Sub2API 原始字段泄漏到通用组件。允许在 `raw` 字段中保留调试用原始对象，但生产日志不得输出。

# CONFIGURATION SYSTEM

实现两个明确层次：

1. Adapter Contract：把具体系统接口转为规范化 capabilities、queries、actions 和 domain models。
2. PanelSpec：使用已打包组件装配 views、widgets、queries 和 actions。

PanelSpec 使用 JSON Schema 进行校验，至少支持：

- schemaVersion
- pack metadata
- adapter id/version
- theme preset/tokens
- views
- widgets
- query references
- action references
- capability requirements
- confirmation policy
- empty/loading/error/unsupported states

严禁：

- eval/new Function
- 远程 JavaScript
- 远程动态 import
- 配置中的任意脚本表达式
- 配置直接读取 SecretVault

配置只允许引用已注册 query、action、formatter 和 component ID。未知 ID 必须校验失败。

# TECH STACK

优先使用：

- WXT 当前稳定版并锁定依赖版本。
- Manifest V3。
- Vue 3 + TypeScript。
- Pinia。
- Tailwind CSS。
- Chart.js/vue-chartjs 仅用于趋势或模型图。
- 自定义 SVG QuotaRing，用于大量小型环形额度图，必须提供 aria-label 和文本替代。
- Vitest + Vue Test Utils。
- Mock Service Worker 或等价 HTTP Mock。
- Playwright Chromium E2E。
- pnpm。

项目必须能够构建 Chrome；代码结构保留未来 Edge/Firefox 适配空间，但不要为了 Firefox 延误 Chrome/Edge MVP。

# UI AND THEME

从 Sub2API 当前主题提取设计 Token，使用 CSS Variables 包装，不要在组件内散落硬编码颜色。

至少包含：

- Primary teal/cyan 体系。
- 深色 slate 背景。
- light/dark class mode。
- rounded-xl/rounded-2xl。
- card/glass card、轻边框、轻阴影。
- primary gradient button。
- danger/warning/success 状态。
- 系统字体并兼容中文。

QuotaRing 状态建议：

- remaining >= 40%：healthy。
- 15% <= remaining < 40%：warning。
- remaining < 15%：critical。
- remaining <= 0：exhausted。
- 无数据：unknown。
- 超过 freshness threshold：stale。

不能只靠颜色传递状态，必须同时有标签或图标。

Side Panel 推荐结构：

- 顶部：实例切换、连接状态、刷新、打开后台。
- 主导航：概览、账号、用户、异常。
- 底部或设置入口：实例管理、安全锁、主题。

不要实现 content script，不要抓取或修改 Sub2API 页面 DOM；本扩展通过正式 API 工作。

# SECURITY

1. 使用 optional_host_permissions，在添加实例时申请精确 Origin；不要默认申请 `<all_urls>`。
2. 非敏感连接元数据存入 storage.local。
3. 默认将凭证只保存在 storage.session；提供可选的持久化加密 Vault：AES-GCM + Web Crypto，密钥只保存在 session，用户解锁后可用。
4. 不把秘密存入 storage.sync。
5. UI 通过 background RPC 发请求，Side Panel 组件不直接读取原始 Admin Key/JWT。
6. SecretVault API 只能返回“可用/锁定/缺失”状态，不能把明文凭证返回 UI。
7. 日志、Toast、错误边界、审计记录、截图、测试 Fixtures 都必须脱敏。
8. 连接提供 readOnly 标记；这是 UI 安全层，不得声称它替代服务端权限控制。
9. 所有写动作均需 capability 检查、连接 write-enabled 检查和确认策略。
10. 不执行远程代码，不接受包含代码的 PanelSpec。
11. 对 API 错误正文设置最大长度，默认不持久化完整错误 body。
12. 生产构建关闭调试日志和 Vue Devtools。

# PERFORMANCE AND RESILIENCE

- Account usage 使用批量接口，并根据服务端限制分块。
- 用户平台额度仅详情懒加载。
- 多实例查询使用 Promise.allSettled，并保留每个实例独立错误。
- 支持 AbortController，切换实例时取消陈旧请求。
- 背景自动刷新默认只使用 passive data。
- Side Panel 关闭时不持续高频轮询；后台告警单独 opt-in。
- 支持 ETag/If-None-Match 时复用。
- 对 401、403、429、423、feature disabled、network error 做结构化映射。
- 失效 JWT 可以按源码支持的 refresh 流程刷新；Admin API Key 失败时明确提示重新生成。
- 缓存对象包含 fetchedAt、source、staleAt；UI 永远显示更新时间。

# FILES TO DELIVER

至少创建：

- 完整扩展源码。
- `schemas/panel-spec.schema.json`
- `schemas/adapter-spec.schema.json`
- `src/providers/sub2api/*`
- `src/packs/sub2api.panel.yaml` 或 JSON。
- `docs/architecture.md`
- `docs/panel-spec.md`
- `docs/sub2api-api-map.md`
- `docs/security.md`
- `docs/development.md`
- `skills/sub2api-extension-builder/SKILL.md`
- `skills/sub2api-extension-builder/references/capability-contract.md`
- `skills/sub2api-extension-builder/references/panel-spec.md`
- `skills/sub2api-extension-builder/references/security.md`
- `skills/sub2api-extension-builder/scripts/inspect-sub2api.mjs`
- `skills/sub2api-extension-builder/scripts/validate-panel-spec.mjs`
- `skills/sub2api-extension-builder/scripts/scaffold-adapter.mjs`
- 单元、组件、contract、E2E 测试。
- `.env.example`，只包含变量名和说明，不包含真实值。
- 构建后的扩展目录和 zip 包。

# AI BUILDER SKILL REQUIREMENTS

新 Skill 的目标是让后续 Agent 能为其他后台系统生成 Adapter Pack 或 PanelSpec，而不是替代现有 sub2api-admin Skill。

Skill 必须规定：

1. 先读取目标系统源码/OpenAPI/类型定义。
2. 先生成 capability report，再生成代码。
3. 发现阶段只做只读调用。
4. 优先通过 PanelSpec 装配已有组件。
5. 无法表达时才 scaffold TypeScript Adapter。
6. 生成 Adapter 后自动运行 schema、unit、contract 和 build 验证。
7. 写操作必须有 before/after、确认、原因、read-after-write。
8. 禁止在 Skill、示例或日志中输出秘密。
9. 输出 `adapter-manifest.json`、capability matrix、API map 和安全评审。
10. 与现有 `sub2api-admin` Skill 组合使用：后者负责可靠管理 API 调用，新的 Skill 负责扩展/面板生成。

# TEST REQUIREMENTS

至少覆盖以下单元测试：

- Base URL 标准化。
- API envelope 解包。
- 5h/7d utilization -> remaining 转换。
- utilization > 100、null、unlimited、stale。
- 不同平台 QuotaWindow 归一化。
- capability fallback。
- PanelSpec 校验成功与失败。
- SecretVault 加密、锁定、解锁、错误密码。
- 日志脱敏。
- 多实例聚合与 partial failure。
- 写操作的 before/after 和 read-after-write。

至少覆盖以下组件测试：

- QuotaRing 的 0、15、40、100、unknown、unlimited、stale 状态。
- 只读连接禁用写按钮。
- ConfirmActionDialog 要求 reason。
- 错误详情脱敏。
- 浅色/深色主题。

至少覆盖以下 E2E：

1. 添加两个 Mock Sub2API 实例。
2. 全部实例概览正确聚合。
3. 一个实例离线时显示 partial failure，另一个仍可用。
4. 查看账号 5h/7d 环形额度。
5. 搜索用户并查看平台额度。
6. 只读连接无法重置。
7. 写测试连接完成余额调整和额度重置，并验证刷新后的值。
8. 打开对应 Sub2API 后台深链。
9. 重新加载扩展后，非敏感配置保留；session-only 凭证需要重新解锁/输入。

# IMPLEMENTATION WORKFLOW

按以下顺序自主推进，不要停在规划阶段：

1. 检查当前工作区；如不存在扩展项目，创建 `sub2api-console-extension`。
2. 检查 Sub2API 源码，生成 `docs/sub2api-api-map.md` 和 capability matrix。
3. 建立 WXT + Vue + TypeScript 基础工程，并确保空项目可以 build。
4. 实现 ConnectionRegistry、权限申请、SecretVault、typed messaging 和 HTTP client。
5. 实现 PlatformAdapter Contract 与 Sub2APIAdapter。
6. 实现归一化领域模型和缓存/错误处理。
7. 实现 Sub2API 主题 Token 和通用组件。
8. 实现实例配置、概览、账号、用户、异常四个核心界面。
9. 实现受控写操作和审计。
10. 实现 PanelSpec schema、registry 和 Sub2API pack。
11. 实现 AI Builder Skill 及脚本。
12. 完成 mock、unit、component、contract、E2E 测试。
13. 执行 lint、typecheck、test、build、zip。
14. 检查最终 manifest 权限是否最小化。
15. 检查构建产物中是否存在密钥、测试凭证、远程代码或 source map 泄露。
16. 给出最终交付报告。

如果没有真实实例凭证：

- 不要停止。
- 使用严格模拟 Sub2API 响应格式的 Mock Server 完成实现和自动化测试。
- 将真实只读验证步骤写入 docs/development.md。
- 绝不对未知生产实例执行写测试。

# NON-GOALS FOR V1

- 不复制整个 Sub2API 管理后台。
- 不做用户、账号、分组的完整 CRUD。
- 不做拖拽式页面编辑器。
- 不运行远程 JavaScript。
- 不通过 content script 抓取登录态或页面数据。
- 不默认后台持续高频轮询。
- 不做跨实例批量余额或额度重置。
- 不承诺 Firefox Side Panel 与 Chrome 完全一致；先保证 Chrome/Edge。

# FINAL REPORT FORMAT

完成后输出：

1. Goal 完成度和可安装状态。
2. 关键架构与安全决策。
3. 已实现功能清单。
4. Sub2API API 映射与兼容性说明。
5. 测试、typecheck、lint、build 的实际结果。
6. 构建目录和 zip 路径。
7. Chrome/Edge 安装步骤。
8. 真实实例接入步骤和凭证安全说明。
9. 仍存在的限制或无法验证项，必须诚实说明。
10. 主要文件清单和下一步建议。

从现在开始直接执行。先检查工作区和 Sub2API 源码，然后创建可构建的工程；不要只回复计划。
```
