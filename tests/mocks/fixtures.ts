export const ALPHA_ORIGIN = 'https://alpha.example.test'
export const BETA_ORIGIN = 'https://beta.example.test'

export function envelope<T>(data: T, code = 0, message = 'ok') {
  return { code, message, data }
}

export const alphaAccounts = [
  {
    id: 1,
    name: 'Claude Prod',
    platform: 'anthropic',
    status: 'active',
    schedulable: true,
    groups: [{ name: 'default' }],
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'GPT Batch',
    platform: 'openai',
    status: 'active',
    schedulable: true,
    groups: [{ name: 'default' }],
    updated_at: new Date().toISOString(),
  },
]

function usageRecord(five: number, seven: number) {
  return {
    source: 'passive' as const,
    updated_at: new Date().toISOString(),
    five_hour: { utilization: five, resets_at: '2026-08-26T06:00:00Z', remaining_seconds: 7200 },
    seven_day: { utilization: seven, resets_at: '2026-09-01T00:00:00Z', remaining_seconds: 400000 },
  }
}

export const alphaUsage: Record<string, ReturnType<typeof usageRecord>> = {
  1: usageRecord(60, 20),
  2: usageRecord(110, 5),
}

export function resetAccountUsage(id: number) {
  const current = alphaUsage[String(id)]
  if (!current) return
  current.updated_at = new Date().toISOString()
  current.five_hour.utilization = 0
  current.seven_day.utilization = 0
}

export const alphaUsers = [
  {
    id: 10,
    email: 'ops@example.test',
    username: 'ops',
    status: 'active',
    balance: 12.5,
    last_active_at: '2026-08-26T00:30:00Z',
    notes: '',
  },
]

export const alphaPlatformQuotas = {
  platform_quotas: [
    {
      platform: 'anthropic',
      daily_limit_usd: 10,
      weekly_limit_usd: 50,
      monthly_limit_usd: null,
      daily_usage_usd: 2,
      weekly_usage_usd: 8,
      monthly_usage_usd: 12,
      daily_window_resets_at: '2026-08-27T00:00:00Z',
      weekly_window_resets_at: '2026-08-31T00:00:00Z',
      monthly_window_resets_at: null,
    },
  ],
}

export const alphaSnapshot = {
  generated_at: '2026-08-26T01:00:00Z',
  start_date: '2026-08-26',
  end_date: '2026-08-26',
  stats: {
    today_requests: 100,
    today_tokens: 5000,
    today_actual_cost: 1.25,
    today_account_cost: 0.8,
    rpm: 10,
    tpm: 400,
    normal_accounts: 2,
    ratelimit_accounts: 0,
    error_accounts: 0,
  },
  models: [{ model: 'claude-sonnet', requests: 80, total_tokens: 4000, actual_cost: 1.0 }],
}

export const betaSnapshot = {
  generated_at: '2026-08-26T01:00:00Z',
  start_date: '2026-08-26',
  end_date: '2026-08-26',
  stats: {
    today_requests: 50,
    today_tokens: 2000,
    today_actual_cost: 0.4,
    today_account_cost: 0.2,
    rpm: 4,
    tpm: 100,
    normal_accounts: 1,
    ratelimit_accounts: 0,
    error_accounts: 1,
  },
  models: [{ model: 'gpt-4.1', requests: 50, total_tokens: 2000, actual_cost: 0.4 }],
}

export const alphaErrors = {
  items: [
    {
      id: 99,
      created_at: '2026-08-26T00:50:00Z',
      status_code: 429,
      platform: 'anthropic',
      model: 'claude-sonnet',
      account_name: 'Claude Prod',
      user_email: 'ops@example.test',
      message: 'rate limited',
    },
  ],
  total: 1,
  page: 1,
  page_size: 20,
  pages: 1,
}

export const alphaErrorDetail = {
  ...alphaErrors.items[0],
  error_body: 'Authorization: Bearer should-not-leak Cookie: session=abc api_key=secret-value',
}

let userBalance = 12.5
let dailyUsage = 2

export function resetMutableFixtures() {
  userBalance = 12.5
  dailyUsage = 2
  alphaUsage[1] = usageRecord(60, 20)
  alphaUsage[2] = usageRecord(110, 5)
}

export function currentUser() {
  return { ...alphaUsers[0], balance: userBalance }
}

export function currentQuotas() {
  const copy = structuredClone(alphaPlatformQuotas)
  copy.platform_quotas[0].daily_usage_usd = dailyUsage
  return copy
}

export function applyBalance(operation: string, amount: number) {
  if (operation === 'set') userBalance = amount
  if (operation === 'add') userBalance += amount
  if (operation === 'subtract') userBalance -= amount
  return currentUser()
}

export function resetDailyQuota() {
  dailyUsage = 0
  return currentQuotas()
}
