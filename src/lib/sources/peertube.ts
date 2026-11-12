import { postHtml } from '../bskyPost'
import { parseStoryKey, storyKey } from '../storyKey'
import { peertubeLabel, type FeedRef } from '../topics'
import type { Comment, Story, Thread } from '../types'
import { webUrl } from '../webUrl'
import { getJson } from './http'
import { readable } from './mastodon'

// PeerTube, the fediverse's video hosting. Every server's API is public and CORS-open, and so is
// Sepia Search (Framasoft's index of the servers that opt in), so all of it is fetched from the
// browser. Videos play inline from their own server's file (videoEmbed.ts), never in its player.

const SEPIA = 'https://sepiasearch.org'
/** A bare server name: what a feed ref or a story key may point the browser at. */
const HOST = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/
/** How far back Sepia's trending looks: PeerTube is small, so a fortnight of one category is a page. */
const DAYS = 30

interface Video {
  name: string
  url: string
  shortUUID: string
  thumbnailUrl?: string
  thumbnailPath?: string
  likes: number
  comments?: number
  nsfw: boolean
  publishedAt: string
  language?: { id: string | null }
  account: { name: string; host: string }
  truncatedDescription?: string | null
  description?: string | null
}
interface VideoComment {
  id: number
  text: string
  createdAt: string
  totalReplies?: number
  isDeleted?: boolean
  account?: { name: string; host: string }
}

const server = (host: string) => {
  if (!HOST.test(host)) throw new Error(`${host} isn’t a PeerTube server name`)
  return `https://${host}`
}

/** Wordless videos (zxx) and unmarked ones are for everyone; otherwise the reader's languages. */
const understood = (v: Video) => v.language?.id === 'zxx' || readable(v.language?.id)

function videoStory(v: Video, label: string, base: string): Story | undefined {
  const url = webUrl(v.url)
  if (!url || !HOST.test(v.account.host)) return undefined
  const words = v.truncatedDescription ?? v.description
  return {
    key: storyKey({ kind: 'pt', instance: v.account.host, id: v.shortUUID }),
    source: 'peertube',
    sourceLabel: label,
    title: v.name.trim(),
    url,
    discussionUrl: url,
    author: `${v.account.name}@${v.account.host}`,
    score: v.likes,
    comments: v.comments,
    createdAt: Date.parse(v.publishedAt),
    text: words?.trim() ? postHtml(words) : undefined,
    thumbnail: webUrl(v.thumbnailUrl) ?? (v.thumbnailPath?.startsWith('/') ? `${base}${v.thumbnailPath}` : undefined),
    hasThread: true,
  }
}

export async function peertubeFeed(ref: Extract<FeedRef, { kind: 'peertube' }>, sort: '-trending' | '-publishedAt' = '-trending'): Promise<Story[]> {
  const qs = new URLSearchParams({ count: '40', sort, nsfw: 'false' })
  if (ref.category) qs.set('categoryOneOf', String(ref.category))
  let url: string
  if (ref.host) url = `${server(ref.host)}/api/v1/videos?${qs}`
  else {
    qs.set('startDate', new Date(Date.now() - DAYS * 86_400_000).toISOString())
    url = `${SEPIA}/api/v1/search/videos?${qs}`
  }
  const { data } = await getJson<{ data: Video[] }>(url)
  const base = ref.host ? server(ref.host) : ''
  return data.filter((v) => !v.nsfw && understood(v)).flatMap((v) => videoStory(v, peertubeLabel(ref), base || `https://${v.account.host}`) ?? [])
}

export async function peertubeThread(key: string): Promise<Thread> {
  const p = parseStoryKey(key)
  if (p?.kind !== 'pt') throw new Error(`${key} isn’t a PeerTube video`)
  const api = `${server(p.instance)}/api/v1/videos/${encodeURIComponent(p.id)}`
  const [v, { data }] = await Promise.all([getJson<Video>(api), getJson<{ data: VideoComment[] }>(`${api}/comment-threads?count=50&sort=-likes`)])
  const story = videoStory(v, 'PeerTube', server(p.instance))
  if (!story) throw new Error('This video can’t be shown here')
  // Feeds leave sensitive videos out; one opened from a link goes behind a warning instead.
  if (v.nsfw) story.warning = 'Sensitive'
  // ponytail: top-level comments only, with their reply counts; fetch /comment-threads/<id> per thread if readers want the replies inline.
  const comments: Comment[] = data
    .filter((c) => !c.isDeleted && c.text?.trim())
    .map((c) => ({
      id: String(c.id),
      author: c.account ? `${c.account.name}@${c.account.host}` : 'someone',
      html: postHtml(c.text),
      createdAt: Date.parse(c.createdAt),
      children: [],
      ...(c.totalReplies ? { more: c.totalReplies } : {}),
    }))
  return { story, comments }
}
