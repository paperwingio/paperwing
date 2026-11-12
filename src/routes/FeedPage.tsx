import { Fragment, lazy, startTransition, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { channelId as toChannelId } from '../lib/channelId'
import { Link, useParams, useSearchParams } from 'react-router'
import { ChannelBrief } from '../components/ChannelBrief'
import { FeedHeader } from '../components/FeedHeader'
import { FeedEmpty, FeedFailed } from '../components/FeedState'
import { OutageBanner } from '../components/OutageWatch'
import { Split, useListKeys } from '../components/Split'
import { RowSkeleton, StoryRow } from '../components/StoryRow'
import { GridToggle } from '../components/GridToggle'
import { saveData } from '../components/Thumb'
import { TypesetLoader } from '../components/pretext/TypesetLoader'
import { BoardContext, useBoard } from '../lib/boards'
import { PullToRefresh } from '../components/PullToRefresh'
import { useChannelFeed, useNow } from '../lib/hooks'
import { useSteadyList } from '../lib/steadyFeed'
import { NewStories } from '../components/NewStories'
import { usePretext, useTypesetIn } from '../lib/pretext'
import { caughtUpAt, kindOf, type SortMode } from '../lib/rank'
import { CaughtUp } from '../components/CaughtUp'
import { useActivity, usePrefs } from '../lib/store'
import type { SourceKind } from '../lib/types'

const PAGE = 50
// Only for picture-led channels shown as a grid: loads when first asked for.
const PictureGrid = lazy(() => import('../components/PictureGrid').then((m) => ({ default: m.PictureGrid })))
/** Rows rendered straight away when a list changes: a screen and a bit. The rest follow a frame later. */
const FIRST = 10
// Topics where a provider outage is news.
const OUTAGE_CHANNELS = new Set(['sre', 'observability', 'cloud-native', 'for-you'])

export function FeedPage() {
  const { channel: channelParam, actor, did: boardDid, rkey: boardRkey, itemKey } = useParams()
  // A profile (/u/<handle>) is a channel too: what that person lists on PaperWing. So is a community board (/c/<owner>/<id>).
  const channelId = actor ? toChannelId({ kind: 'person', actor }) : boardDid && boardRkey ? toChannelId({ kind: 'board', did: boardDid, rkey: boardRkey }) : (channelParam ?? 'for-you')
  const [params, setParams] = useSearchParams()
  const hideRead = usePrefs((p) => p.hideRead)
  const pictureGrid = usePrefs((p) => p.pictureGrid)
  const thumbnails = usePrefs((p) => p.thumbnails)
  const feedOrder = usePrefs((p) => p.feedOrder)
  const variant = params.get('v') ?? undefined
  // Your default order (Settings, Tuning) unless the address picks one.
  const defaultSort: SortMode = feedOrder === 'latest' ? 'new' : 'hot'
  const sort = (params.get('sort') as SortMode | null) ?? defaultSort
  const sourceFilter = (params.get('src') as SourceKind | null) ?? undefined
  const kindFilter = (['shared', 'discussions'] as const).find((k) => k === params.get('kind'))
  const publisherFormat = params.get('format') === 'standard' ? 'standard' : undefined
  const feed = useChannelFeed(channelId, { variant, sort, publisherFormat })
  const channel = feed.channel
  // Only Hot, in a feed it ranks, is ordered by your taste: there a row can say why it moved.
  const tasteOrders = sort === 'hot' && !channel?.native
  const read = useActivity((s) => s.read)
  const now = useNow()
  const [limit, setLimit] = useState(PAGE)
  const base = actor ? `/u/${actor}` : boardDid && boardRkey ? `/c/${boardDid}/${boardRkey}` : `/t/${/^(feed:|q:)/.test(channelId) ? encodeURIComponent(channelId) : channelId}`
  // On a board, the reading pane offers its moderators their actions.
  const { data: boardView } = useBoard(channel?.board?.did, channel?.board?.rkey)

  const listKey = `${channelId}|${variant}|${sort}|${sourceFilter}|${kindFilter}`
  // What the reader can see: the steady list (below) holds these, so its "new stories" count means it.
  const shownStories = useMemo(
    () => feed.stories.filter((s) => (!sourceFilter || s.source === sourceFilter) && (!kindFilter || kindOf(s) === kindFilter) && (!hideRead || !read[s.key] || s.key === itemKey)),
    // `read` changes on every open; only re-filter for it when hiding read items.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [feed.stories, sourceFilter, kindFilter, hideRead, hideRead ? read : null, itemKey],
  )
  // One paint once the sources are in, then an order that holds while later ones land (steadyFeed.ts).
  // Spicy reorders as grades come in, which is its point.
  const steady = useSteadyList({ ...feed, stories: shownStories }, { paintKey: `${channelId}|${variant}`, listKey }, sort === 'spicy')
  const visible = steady.stories
  const toTop = () => {
    document.getElementById('list-scroll')?.scrollTo({ top: 0 })
    window.scrollTo({ top: 0 })
  }
  // Asking for fresh stories brings the new order in; it starts at the top, so nothing reorders under you mid-list.
  const refresh = () => steady.refresh().then((r) => (toTop(), r))

  // A new list starts at the top. Beside the reading pane the list scrolls itself; on a phone the
  // page does, and the list column never moves. (Back still lands where you were: the browser
  // restores the page after this runs.)
  useEffect(() => {
    setLimit(PAGE)
    toTop()
  }, [channelId, variant, sort, sourceFilter, kindFilter])

  useEffect(() => {
    document.title = channel ? `${channel.label} – PaperWing` : 'PaperWing'
  }, [channel])

  const { cursor, open } = useListKeys(visible, itemKey, base, refresh)
  // In Hot, where the stories turn to ones you saw on earlier visits.
  const caughtUp = tasteOrders ? caughtUpAt(visible) : undefined

  // A new list (another channel, sort or filter) paints its first screen of rows at once and the
  // rest just after, in an interruptible render, so a tap on Hot, Latest or Top answers straight
  // away instead of waiting on fifty rows nobody can see yet.
  const [eager, setEager] = useState({ key: listKey, rows: FIRST })
  if (eager.key !== listKey) setEager({ key: listKey, rows: FIRST })
  const rendered = Math.min(limit, eager.key === listKey ? eager.rows : FIRST)
  useEffect(() => {
    if (eager.rows === Infinity) return
    let timer = 0
    const raf = requestAnimationFrame(() => {
      timer = window.setTimeout(() => startTransition(() => setEager((e) => (e.key === eager.key ? { ...e, rows: Infinity } : e))))
    })
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [eager])
  // Pretext motion: arriving at a feed, or changing its sort or filters, settles its headlines in.
  const pretext = usePretext()
  useTypesetIn(`${channelId}|${variant}|${sort}|${sourceFilter}|${kindFilter}`, pretext && visible.length > 0 && !itemKey)

  // React Router hands a functional update the params of the last render, so two changes before
  // the next render (a source, then a kind, in the filter sheet) would drop the first. Build on
  // whatever is pending instead.
  const pending = useRef<URLSearchParams | null>(null)
  useEffect(() => {
    pending.current = null
  }, [params])
  const setParam = (key: string, value?: string) => {
    const p = new URLSearchParams(pending.current ?? params)
    if (value) p.set(key, value)
    else p.delete(key)
    pending.current = p
    setParams(p, { replace: true })
  }

  if (!channel) {
    return (
      <div className="wide-col grid place-items-center p-10 text-center">
        <div>
          <p className="text-[1.375rem] font-bold">There is no channel called {channelId}</p>
          <Link className="btn mt-4" to="/topics">
            Browse topics
          </Link>
        </div>
      </div>
    )
  }

  const allFailed = feed.statuses.length > 0 && feed.statuses.every((s) => s.status === 'error')

  return (
    <BoardContext.Provider value={channel.board ? boardView : undefined}>
      <Split
        base={base}
        itemKey={itemKey}
        idle={<ChannelBrief channel={channel} stories={feed.stories} statuses={feed.statuses} onOpen={(k) => open(k)} now={now} />}
        list={
          <>
            <FeedHeader
              channel={channel}
              stories={feed.stories}
              statuses={feed.statuses}
              sort={sort}
              onSort={(s) => setParam('sort', s === defaultSort ? undefined : s)}
              variant={channel.variant}
              onVariant={(v) => setParam('v', v)}
              sourceFilter={sourceFilter}
              onSourceFilter={(s) => setParam('src', s)}
              kindFilter={kindFilter}
              onKindFilter={(k) => setParam('kind', k)}
              fetching={feed.fetching}
              onRefresh={refresh}
            />
            <PullToRefresh key={listKey} onRefresh={refresh} enabled={!itemKey} motion={pretext} />
            {OUTAGE_CHANNELS.has(channel.id) && <OutageBanner />}
            <NewStories
              count={steady.added}
              onShow={() => {
                steady.showNew()
                toTop()
              }}
            />
            {/* A picture-led channel can be a grid; never with pictures off or the browser saving data. */}
            {channel.topic?.casual && thumbnails && !saveData && <GridToggle />}
            {channel.topic?.casual && thumbnails && !saveData && pictureGrid && visible.length > 0 ? (
              <Suspense fallback={null}>
                <PictureGrid stories={visible.slice(0, rendered)} selected={itemKey ?? cursor} read={read} onOpen={open} />
              </Suspense>
            ) : (
              <div role={visible.length ? 'feed' : undefined} aria-busy={steady.loading}>
                {steady.loading && !visible.length && pretext && <TypesetLoader label={channel.label} />}
                {steady.loading && !visible.length && Array.from({ length: pretext ? 4 : 8 }, (_, i) => <RowSkeleton key={i} />)}
                {visible.slice(0, rendered).map((s, i) => (
                  <Fragment key={s.key}>
                    {i === caughtUp && <CaughtUp />}
                    <StoryRow story={s} selected={s.key === (itemKey ?? cursor)} read={!!read[s.key] && s.key !== itemKey} onOpen={open} now={now} why={tasteOrders} hideTopic={channel.topic?.id} />
                  </Fragment>
                ))}
              </div>
            )}
            {allFailed && <FeedFailed offline={!navigator.onLine} statuses={feed.statuses} onRetry={() => void refresh()} />}
            {channel.empty && !channel.feeds.length && (
              <div className="px-6 py-16 text-center">
                <p className="text-[1.125rem] font-bold">{channel.empty.title}</p>
                <p className="mx-auto mt-2 max-w-sm text-sm text-ink-3">{channel.empty.body}</p>
                {channel.empty.action && (
                  <Link className="btn mt-5 inline-flex" to={channel.empty.action.to}>
                    {channel.empty.action.label}
                  </Link>
                )}
              </div>
            )}
            {!steady.loading && !allFailed && !channel.empty && !visible.length && (
              <FeedEmpty
                quiet={channel.quiet}
                filtered={!!(sourceFilter || kindFilter)}
                allRead={hideRead && feed.stories.length > 0 && !sourceFilter && !kindFilter}
                related={channel.related}
                onClearFilter={() =>
                  setParams((p) => {
                    p.delete('src')
                    p.delete('kind')
                    return p
                  })
                }
                onRefresh={() => void refresh()}
              />
            )}
            {visible.length > limit && (
              <div className="p-5 text-center">
                <button className="btn" onClick={() => setLimit((l) => l + PAGE)}>
                  Show more ({visible.length - limit} left)
                </button>
              </div>
            )}
            {visible.length > 0 && visible.length <= limit && (
              <p className="py-10 text-center text-[0.875rem] text-ink-3">
                That is all <span className="num">{visible.length}</span> {visible.length === 1 ? 'story' : 'stories'} in this feed.
              </p>
            )}
          </>
        }
      />
    </BoardContext.Provider>
  )
}
