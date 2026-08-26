import { ref } from 'vue'

export type Locale = 'zh' | 'en'

export const LOCALE_KEY = 'sub2api:locale'

export function detectLocale(): Locale {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(LOCALE_KEY)
      if (saved === 'zh' || saved === 'en') return saved
    }
  } catch {}
  const lang =
    (typeof navigator !== 'undefined' && (navigator.language || navigator.languages?.[0])) || ''
  return lang.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

export const locale = ref<Locale>(detectLocale())

export function getLocale(): Locale {
  return locale.value
}

export function applyDocumentLang(next: Locale = locale.value): void {
  if (typeof document === 'undefined') return
  document.documentElement.lang = next === 'zh' ? 'zh-CN' : 'en'
}

export function setLocale(next: Locale): void {
  locale.value = next
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(LOCALE_KEY, next)
  } catch {}
  applyDocumentLang(next)
}

export function toggleLocale(): void {
  setLocale(locale.value === 'zh' ? 'en' : 'zh')
}
