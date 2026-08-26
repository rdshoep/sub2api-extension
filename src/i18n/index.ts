import { messages, type MessageKey } from './messages'
import { applyDocumentLang, getLocale, locale, setLocale, toggleLocale, type Locale } from './locale'

export type { Locale, MessageKey }
export { locale, getLocale, setLocale, toggleLocale, applyDocumentLang }

export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const table = messages[getLocale()] ?? messages.en
  let text = table[key] ?? messages.en[key] ?? key
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value))
    }
  }
  return text
}
