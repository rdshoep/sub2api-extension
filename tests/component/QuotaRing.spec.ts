import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import QuotaRing from '@/components/QuotaRing.vue'
import type { QuotaState } from '@/domain/models'
import { RING_RADIUS, ringCircumference, ringDash } from '@/domain/ring'

const cases: Array<{ remaining: number | undefined; state: QuotaState; expectLabel: string }> = [
  { remaining: 0, state: 'exhausted', expectLabel: '耗尽' },
  { remaining: 15, state: 'warning', expectLabel: '预警' },
  { remaining: 40, state: 'healthy', expectLabel: '健康' },
  { remaining: 100, state: 'healthy', expectLabel: '健康' },
  { remaining: undefined, state: 'unknown', expectLabel: '暂无数据' },
  { remaining: undefined, state: 'unlimited', expectLabel: '无限额' },
  { remaining: 40, state: 'stale', expectLabel: '数据过期' },
]

describe('QuotaRing', () => {
  for (const c of cases) {
    it(`renders ${c.state} with label not color-only`, () => {
      const wrapper = mount(QuotaRing, {
        props: {
          remainingPercent: c.remaining,
          state: c.state,
          label: '5h',
        },
      })
      expect(wrapper.text()).toContain(c.expectLabel)
      expect(wrapper.get('[data-testid="quota-window-label"]').text()).toBe('5h')
      expect(wrapper.text()).not.toContain('已用')
      expect(wrapper.text()).not.toMatch(/[✓!↓?⏱]/)
      expect(wrapper.attributes('aria-label') || wrapper.find('[aria-label]').attributes('aria-label')).toBeTruthy()
    })
  }

  it('fills the whole ring when remaining is 100%', () => {
    const math = ringDash(100, 'healthy')
    expect(math.full).toBe(true)
    expect(math.dash).toBeCloseTo(ringCircumference(RING_RADIUS))
    expect(math.gap).toBe(0)
    const wrapper = mount(QuotaRing, { props: { remainingPercent: 100, state: 'healthy', label: '5h' } })
    const arc = wrapper.get('[data-testid="quota-ring-arc"]')
    expect(arc.attributes('data-full')).toBe('1')
    expect(arc.attributes('stroke-dasharray')).toBeUndefined()
  })

  it('keeps ring progress when data is stale, but renders gray', () => {
    const math = ringDash(40, 'stale')
    expect(math.full).toBe(false)
    expect(math.dash).toBeCloseTo(ringCircumference(RING_RADIUS) * 0.4)
    const wrapper = mount(QuotaRing, { props: { remainingPercent: 40, state: 'stale', label: '5h' } })
    expect(wrapper.text()).toContain('40%')
    expect(wrapper.text()).toContain('数据过期')
    expect(wrapper.attributes('data-stale')).toBe('1')
    const arc = wrapper.get('[data-testid="quota-ring-arc"]')
    expect(arc.attributes('data-full')).toBe('0')
    expect(arc.attributes('stroke')).toBe('var(--ring-unknown)')
  })

  it('shows refresh remaining under the percent', () => {
    const wrapper = mount(QuotaRing, {
      props: { remainingPercent: 40, state: 'healthy', label: '5h', remainingSeconds: 7200 },
    })
    expect(wrapper.get('[data-testid="quota-reset-in"]').text()).toBe('2小时')
  })

  it('does not compute dash from CSS size (would leave a false gap at 100%)', () => {
    const wrongRadius = (64 - 10) / 2
    const wrongCirc = 2 * Math.PI * wrongRadius
    const right = ringDash(100, 'healthy')
    expect(right.circ).toBeGreaterThan(wrongCirc)
    expect(right.full).toBe(true)
  })
})
