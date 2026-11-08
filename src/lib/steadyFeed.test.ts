import { describe, expect, it } from 'vitest'
import { firstPaintReady, holdOrder, HOLD_MS } from './steadyFeed'

const s = (key: string, score = 1) => ({ key, score })

describe('firstPaintReady', () => {
  it('paints at once when every source has answered, cached ones included', () => {
    expect(firstPaintReady({ total: 4, answered: 4, withStories: 4, waitedMs: 0 })).toBe(true)
    expect(firstPaintReady({ total: 0, answered: 0, withStories: 0, waitedMs: 0 })).toBe(true)
  })

  it('waits a moment for the rest once the first source answers, rather than painting it alone', () => {
    expect(firstPaintReady({ total: 8, answered: 1, withStories: 1, waitedMs: 200 })).toBe(false)
    expect(firstPaintReady({ total: 8, answered: 7, withStories: 7, waitedMs: 200 })).toBe(false)
    expect(firstPaintReady({ total: 8, answered: 2, withStories: 2, waitedMs: HOLD_MS })).toBe(true)
  })

  it('keeps waiting while nothing has arrived', () => {
    expect(firstPaintReady({ total: 8, answered: 2, withStories: 0, waitedMs: HOLD_MS * 3 })).toBe(false)
  })
})

describe('holdOrder', () => {
  it('shows the list as it is the first time', () => {
    const fresh = [s('a'), s('b')]
    expect(holdOrder(undefined, fresh)).toEqual({ list: fresh, added: 0 })
  })

  it('keeps the order on screen while later sources rank new stories above it', () => {
    const { list, added } = holdOrder(['a', 'b', 'c'], [s('x'), s('c'), s('y'), s('a'), s('b')])
    expect(list.map((x) => x.key)).toEqual(['a', 'b', 'c'])
    expect(added).toBe(2)
  })

  it('updates stories in place and drops ones that are gone (hidden, removed)', () => {
    const { list } = holdOrder(['a', 'b', 'c'], [s('c', 9), s('a', 5)])
    expect(list).toEqual([s('a', 5), s('c', 9)])
  })
})
