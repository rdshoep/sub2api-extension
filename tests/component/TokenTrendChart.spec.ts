import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TokenTrendChart from '@/components/TokenTrendChart.vue'
import type { UserTrendSeries } from '@/domain/models'

const series: UserTrendSeries[] = [
  {
    uid: '10',
    label: 'ops',
    points: [
      { at: '2026-08-26T00:00:00Z', tokens: 100, requests: 2 },
      { at: '2026-08-26T12:00:00Z', tokens: 300, requests: 5 },
    ],
  },
  {
    uid: '11',
    label: 'dev',
    points: [
      { at: '2026-08-26T00:00:00Z', tokens: 50, requests: 1 },
      { at: '2026-08-26T12:00:00Z', tokens: 80, requests: 2 },
    ],
  },
]

describe('TokenTrendChart', () => {
  it('shows per-user values for the nearest time on hover', async () => {
    const wrapper = mount(TokenTrendChart, { props: { points: [], series } })
    const svg = wrapper.get('[data-testid="token-trend-svg"]')
    Object.defineProperty(svg.element, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, width: 320, height: 96, right: 320, bottom: 96, x: 0, y: 0, toJSON() {} }),
    })
    expect(wrapper.find('[data-testid="trend-tooltip"]').exists()).toBe(false)
    await svg.trigger('mousemove', { clientX: 312, clientY: 40 })
    const tip = wrapper.get('[data-testid="trend-tooltip"]')
    expect(tip.text()).toContain('ops')
    expect(tip.text()).toContain('dev')
    expect(tip.text()).toContain('300')
    expect(tip.text()).toContain('80')
    await svg.trigger('mouseleave')
    expect(wrapper.find('[data-testid="trend-tooltip"]').exists()).toBe(false)
  })
})
