export interface PlatformMeta {
  id: string
  label: string
}

const ALIASES: Record<string, string> = {
  openai: 'openai',
  chatgpt: 'openai',
  codex: 'openai',
  anthropic: 'anthropic',
  claude: 'anthropic',
  gemini: 'gemini',
  google: 'gemini',
  grok: 'grok',
  xai: 'grok',
  antigravity: 'antigravity',
  kimi: 'kimi',
  moonshot: 'kimi',
  zhipu: 'zhipu',
  glm: 'zhipu',
  deepseek: 'deepseek',
}

const LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Gemini',
  grok: 'Grok',
  antigravity: 'Antigravity',
  kimi: 'Kimi',
  zhipu: 'Zhipu',
  deepseek: 'DeepSeek',
}

export function normalizePlatform(raw: string | undefined | null): string {
  const key = String(raw || '').trim().toLowerCase()
  return ALIASES[key] || key || 'unknown'
}

export function platformMeta(raw: string | undefined | null): PlatformMeta {
  const id = normalizePlatform(raw)
  return { id, label: LABELS[id] || raw || id || 'unknown' }
}

export function sortAccountsByPin<T extends { uid: string }>(accounts: T[], pinnedUids: string[]): T[] {
  const rank = new Map(pinnedUids.map((uid, i) => [uid, i]))
  return [...accounts].sort((a, b) => {
    const ai = rank.has(a.uid) ? rank.get(a.uid)! : Number.POSITIVE_INFINITY
    const bi = rank.has(b.uid) ? rank.get(b.uid)! : Number.POSITIVE_INFINITY
    if (ai !== bi) return ai - bi
    return 0
  })
}
