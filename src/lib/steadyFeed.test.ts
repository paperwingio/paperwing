import { describe, expect, it } from 'vitest'
import { firstPaintReady, holdOrder, HOLD_MS } from './steadyFeed'

const s = (key: string, score = 1) => ({ key, score })

describe('firstPaintReady', () => {
  it('paints at once when every source has answered, cached ones included', () => {
    expect(firstPaintReady({ total: 4, answered: 4, waitedMs: 0 })).toBe(true)
    expect(firstPaintReady({ total: 0, answered: 0, waitedMs: 0 })).toBe(true)
  })

  it('waits a moment for the rest once the first source answers, rather than painting it alone', () => {
    expect(firstPaintReady({ total: 8, answered: 1, waitedMs: 200 })).toBe(false)
    expect(firstPaintReady({ total: 8, answered: 7, waitedMs: 200 })).toBe(false)
    expect(firstPaintReady({ total: 8, answered: 2, waitedMs: HOLD_MS })).toBe(true)
  })

  // An empty answer counts: a source that never answers can't keep the skeleton up for good.
  it('keeps waiting only while no source has answered', () => {
    expect(firstPaintReady({ total: 8, answered: 0, waitedMs: HOLD_MS * 3 })).toBe(false)
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

  // A hotter copy of the same link arriving later takes over its row, key and all (rank.ts).
  it('keeps a row in place when a later copy of its link takes it over', () => {
    const row = { key: 'hn-a', score: 3, alsoOn: [{ key: 'rss-a' }] }
    const { list, added } = holdOrder(['rss-a', 'b'], [s('b'), row])
    expect(list).toEqual([row, s('b')])
    expect(added).toBe(0)
  })

  it('keeps a row folded into another’s coverage once, where the first of them was', () => {
    const lead = { key: 'x', coverage: [{ key: 'b' }] }
    const { list, added } = holdOrder(['a', 'b', 'x'], [lead, s('a')])
    expect(list.map((r) => r.key)).toEqual(['a', 'x'])
    expect(added).toBe(0)
  })

  it('updates stories in place and drops ones that are gone (hidden, removed)', () => {
    const { list } = holdOrder(['a', 'b', 'c'], [s('c', 9), s('a', 5)])
    expect(list).toEqual([s('a', 5), s('c', 9)])
  })
})
