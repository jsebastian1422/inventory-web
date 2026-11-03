import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readMenuColumns, writeMenuColumns } from './menu-columns'

const KEY = 'inv.pref.menuColumns'
beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('menu columns preference', () => {
  it('defaults to 4', () => {
    expect(readMenuColumns()).toBe(4)
  })
  it('CA-7: persists a valid value', () => {
    writeMenuColumns(3)
    expect(localStorage.getItem(KEY)).toBe('3')
    expect(readMenuColumns()).toBe(3)
  })
  it.each(['9', '1', '0', 'abc', '', '2.5x', '3abc', '3.9', ' 3', '3 ', '2e1', '03', '-3'])(
    'CA-8: invalid stored value %j -> 4',
    (value) => {
      localStorage.setItem(KEY, value)
      expect(readMenuColumns()).toBe(4)
    },
  )
  it.each(['2', '3', '4', '5'])('CA-8: exact integer %j is accepted', (value) => {
    localStorage.setItem(KEY, value)
    expect(readMenuColumns()).toBe(Number(value))
  })
  it('does not write out-of-range values', () => {
    writeMenuColumns(9)
    writeMenuColumns(1)
    expect(localStorage.getItem(KEY)).toBeNull()
  })
  it('CA-8: a storage that throws gives 4 without errors', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(readMenuColumns()).toBe(4)
    expect(() => writeMenuColumns(3)).not.toThrow()
  })
})
