import { useEffect, useState } from 'react'

// A feed that holds still. A channel's sources answer one by one, and each answer re-ranks the
// whole list; shown as they land, the rows reshuffle under your thumb. So the first paint waits for
// every source, or a moment past the first one's answer (sources fetch side by side, so the rest
// are usually close behind), and after that the order on screen stays put: stories that arrive
// later wait behind a "new stories" button instead of pushing in (FeedPage).

/** How long the first paint waits on the other sources once the first has answered. */
export const HOLD_MS = 1200

/**
 * Whether a channel's list can paint: every source has answered (a cached answer counts), or one
 * has and the moment since (`waitedMs`) is up. An empty answer counts, so a source that never
 * answers can't keep the skeleton up for good.
 */
export function firstPaintReady(p: { total: number; answered: number; waitedMs: number }): boolean {
  if (p.answered >= p.total) return true
  return p.answered > 0 && p.waitedMs >= HOLD_MS
}

/** A row and the stories folded into it: other copies of its link, and other coverage of its event. */
interface Row {
  key: string
  alsoOn?: readonly { key: string }[]
  coverage?: readonly { key: string }[]
}
const membersOf = (r: Row) => [r.key, ...(r.alsoOn ?? []).map((s) => s.key), ...(r.coverage ?? []).map((s) => s.key)]

/**
 * The list as it stands on screen (`shown`, keys in order) brought up to date with the freshly
 * ranked one: each row takes its fresh copy, rows that are gone drop out, and the order stays. A row
 * a later copy of its link took over (or that folded into another's coverage) is found through the
 * stories folded into it, and keeps the first place any of them had. `added` counts fresh rows none
 * of whose stories is on screen. With nothing shown yet, the fresh list is it.
 */
export function holdOrder<T extends Row>(shown: readonly string[] | undefined, fresh: readonly T[]): { list: T[]; added: number } {
  if (!shown) return { list: [...fresh], added: 0 }
  const rowOf = new Map<string, T>()
  for (const r of fresh) for (const k of membersOf(r)) if (!rowOf.has(k)) rowOf.set(k, r)
  const placed = new Set<T>()
  const list: T[] = []
  for (const k of shown) {
    const r = rowOf.get(k)
    if (r && !placed.has(r)) {
      placed.add(r)
      list.push(r)
    }
  }
  return { list, added: fresh.reduce((n, r) => n + (placed.has(r) ? 0 : 1), 0) }
}

/**
 * A channel's list as it should show: held back (`loading`) until it can paint, then in a steady
 * order, with `added` stories waiting. `stories` should already be filtered to what the reader can
 * see, so the count means what it says.
 *
 * - `paintKey` names the set of sources (channel and variant): a new one waits for its first paint.
 * - `listKey` names the order (sort and filters as well): once the sources have painted, a new one
 *   takes the fresh order at once rather than blanking the list again.
 * - `showNew` brings the waiting stories in; `refresh` refetches and, since the reader asked for it,
 *   brings the new order in when it lands.
 * - `live` (Spicy, whose order is its point) passes the list straight through once it can paint.
 */
export function useSteadyList<T extends Row>(feed: { stories: T[]; statuses: { status: string }[]; refetch: () => Promise<unknown> }, keys: { paintKey: string; listKey: string }, live = false) {
  // `firstAt`: when a source first answered, which starts the wait for the rest. A wait, so
  // performance.now(): it only goes forward, whatever the wall clock does.
  const [hold, setHold] = useState<{ paintKey: string; listKey: string; painted?: boolean; firstAt?: number; shown?: string[]; adopt?: boolean }>(() => ({ ...keys }))
  let current = hold
  // Render-time, so no frame shows the old list: new sources start over; a new order is re-taken.
  if (hold.paintKey !== keys.paintKey) current = { ...keys }
  else if (hold.listKey !== keys.listKey) current = { ...keys, painted: hold.painted, firstAt: hold.firstAt, adopt: true }

  const answered = feed.statuses.filter((s) => s.status !== 'pending').length
  if (answered > 0 && current.firstAt === undefined) current = { ...current, firstAt: performance.now() }
  const firstAt = current.firstAt
  const ready = !!current.painted || firstPaintReady({ total: feed.statuses.length, answered, waitedMs: firstAt === undefined ? 0 : performance.now() - firstAt })

  // Take the order on screen: at the first paint, when asked to, and while the list is empty (an
  // empty list has no order to keep, so whatever arrives next shows).
  if (ready && (!current.painted || current.adopt || (!live && !current.shown?.length))) {
    const shown = feed.stories.map((s) => s.key)
    if (!current.painted || current.adopt || !sameKeys(shown, current.shown)) current = { ...current, painted: true, shown, adopt: false }
  }
  if (current !== hold) setHold(current)

  // Waiting on slower sources: look again when the moment's up.
  const [, tick] = useState(0)
  useEffect(() => {
    if (ready || firstAt === undefined) return
    const t = window.setTimeout(() => tick((n) => n + 1), Math.max(0, firstAt + HOLD_MS - performance.now()) + 20)
    return () => clearTimeout(t)
  }, [ready, firstAt])

  const { list, added } = !ready ? { list: [] as T[], added: 0 } : live ? { list: feed.stories, added: 0 } : holdOrder(current.shown, feed.stories)
  return {
    stories: list,
    added,
    loading: !ready,
    showNew: () => setHold((h) => ({ ...h, adopt: true })),
    refresh: () => feed.refetch().then((r) => (setHold((h) => ({ ...h, adopt: true })), r)),
  }
}

const sameKeys = (a: readonly string[], b?: readonly string[]) => !!b && a.length === b.length && a.every((k, i) => k === b[i])
