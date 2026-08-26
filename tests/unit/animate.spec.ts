import { describe, expect, it } from 'vitest'
import { formatNumericDisplay, splitNumericDisplay } from '@/domain/animate'

describe('splitNumericDisplay', () => {
  it('keeps currency prefix and decimals', () => {
    expect(splitNumericDisplay('$1.65')).toEqual({ prefix: '$', number: 1.65, suffix: '', decimals: 2 })
    expect(formatNumericDisplay(splitNumericDisplay('$1.65')!, 2.5)).toBe('$2.50')
  })

  it('keeps compact suffixes', () => {
    expect(splitNumericDisplay('7.00K')).toMatchObject({ number: 7, suffix: 'K', decimals: 2 })
    expect(formatNumericDisplay(splitNumericDisplay('1.25%')!, 3.5)).toBe('3.50%')
  })
})
