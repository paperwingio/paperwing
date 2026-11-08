import { useEffect, useState } from 'react'

// A feed that holds still. A channel's sources answer one by one, and each answer re-ranks the
// whole list; shown as they land, the rows reshuffle under your thumb. So the first paint waits for
// every source, or a moment past the first one's answer (sources fetch side by side, so the rest
// are usually close behind), and after that the order on screen stays put: stories that arrive
// later wait behind a "new stories" button instead of pushing in (FeedPage).

/** How long the first paint waits on the other sources once the first has stories. */
export const HOLD_MS = 1200

/**
 * Whether a channel's list can paint: every source has answered (a cached answer counts), or there
 * are stories and the moment since they came (`waitedMs`) is up.
 */
export function firstPaintReady(p: { total: number; answered: number; withStories: number; waitedMs: number }): boolean {
  if (p.answered >= p.total) return true
  return p.withStories > 0 && p.waitedMs >= HOLD_MS
}

/**
 * The list as it stands on screen (`shown`, keys in order) brought up to date with the freshly
 * ranked one: each story takes its fresh copy, stories that are gone drop out, and the order stays.
 * `added` counts the fresh stories not on screen yet. With nothing shown yet, the fresh list is it.
 */
export function holdOrder<T extends { key: string }>(shown: readonly string[] | undefined, fresh: readonly T[]): { list: T[]; added: number } {
  if (!shown) return { list: [...fresh], added: 0 }
  const byKey = new Map(fresh.map((s) => [s.key, s]))
  const list = shown.flatMap((k) => {
    const s = byKey.get(k)
    return s ? [s] : []
  })
  const onScreen = new Set(shown)
  return { list, added: fresh.reduce((n, s) => n + (onScreen.has(s.key) ? 0 : 1), 0) }
}

/**
 * A channel's list as it should show: held back (`loading`) until it can paint, then in a steady
 * order, with `added` stories waiting. `showNew` brings them in; `refresh` refetches and, since the
 * reader asked for it, brings the new order in when it lands. `live` (Spicy, whose order is its
 * point) passes the list straight through once it can paint.
 */
export function useSteadyList<T extends { key: string }>(feed: { stories: T[]; statuses: { status: string }[]; refetch: () => Promise<unknown> }, listKey: string, live = false) {
  // `firstAt`: when this list first had stories, which starts the wait for the rest. A wait, so
  // performance.now(): it only goes forward, whatever the wall clock does.
  const [hold, setHold] = useState<{ key: string; firstAt?: number; shown?: string[]; adopt?: boolean }>(() => ({ key: listKey }))
  // A new list (channel, sort, filter) starts over: render-time, so no frame shows the old order.
  if (hold.key !== listKey) setHold({ key: listKey })
  const current = hold.key === listKey ? hold : { key: listKey }
  if (feed.stories.length > 0 && current.firstAt === undefined) setHold({ ...current, firstAt: performance.now() })

  const answered = feed.statuses.filter((s) => s.status !== 'pending').length
  const [, tick] = useState(0)
  const firstAt = current.firstAt
  const ready = !!current.shown || firstPaintReady({ total: feed.statuses.length, answered, withStories: feed.stories.length, waitedMs: firstAt === undefined ? 0 : performance.now() - firstAt })
  // Waiting on slower sources: look again when the moment's up.
  useEffect(() => {
    if (ready || firstAt === undefined) return
    const t = window.setTimeout(() => tick((n) => n + 1), Math.max(0, firstAt + HOLD_MS - performance.now()) + 20)
    return () => clearTimeout(t)
  }, [ready, firstAt])

  const keysOf = (list: T[]) => list.map((s) => s.key)
  // An empty list has no order to keep: whatever arrives next shows.
  if (ready && !live && (!current.shown?.length || current.adopt)) {
    const shown = keysOf(feed.stories)
    if (!sameKeys(shown, current.shown)) setHold({ ...current, shown, adopt: false })
    else if (current.adopt) setHold({ ...current, adopt: false })
  }

  const { list, added } = !ready ? { list: [] as T[], added: 0 } : live ? { list: feed.stories, added: 0 } : holdOrder(current.shown ?? keysOf(feed.stories), feed.stories)
  return {
    stories: list,
    added,
    loading: !ready,
    showNew: () => setHold((h) => ({ ...h, adopt: true })),
    refresh: () => feed.refetch().then((r) => (setHold((h) => ({ ...h, adopt: true })), r)),
  }
}

const sameKeys = (a: readonly string[], b?: readonly string[]) => !!b && a.length === b.length && a.every((k, i) => k === b[i])
