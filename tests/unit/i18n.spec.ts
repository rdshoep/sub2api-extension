import { describe, expect, it } from 'vitest'
import { setLocale, t } from '@/i18n'
import { formatResetRemaining, quotaStateLabel } from '@/domain/quota'

describe('i18n', () => {
  it('switches catalog strings', () => {
    setLocale('zh')
    expect(t('instances.all')).toBe('全部实例')
    setLocale('en')
    expect(t('instances.all')).toBe('All instances')
    expect(quotaStateLabel('healthy')).toBe('Healthy')
    expect(formatResetRemaining(7200)).toBe('2h')
    setLocale('zh')
    expect(quotaStateLabel('healthy')).toBe('健康')
    expect(t('overview.autoRefresh', { seconds: 30 })).toBe('自动刷新 30s')
    setLocale('en')
    expect(t('overview.autoRefresh', { seconds: 8 })).toBe('Auto refresh 8s')
    setLocale('zh')
  })
})
