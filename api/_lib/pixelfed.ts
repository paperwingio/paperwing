import type { Media, Story } from '../../src/lib/types.js'
import { fetchJson, linkKey } from './http.js'

// Pixelfed, the fediverse's photo sharing, read from pixelfed.social. Its Mastodon-style API needs a
// sign-in, so this reads the anonymous endpoints its own web app uses for Discover. They are
// undocumented and send no CORS header, which is why they're fetched here: if Pixelfed changes them,
// this source goes quiet and nothing else breaks. Comments need a sign-in too, so a post links out.

const HOST = 'pixelfed.social'

interface Status {
  url: string
  created_at: string
  content?: string
  content_text?: string
  favourites_count?: number
  reply_count?: number
  sensitive?: boolean
  spoiler_text?: string
  visibility?: string
  reblog?: unknown
  account: { acct: string }
  media_attachments?: { type: string; url: string; preview_url?: string; description?: string | null; meta?: { original?: { aspect?: number } } }[]
}

/** The first line that says something, not just its hashtags. */
function titleOf(s: Status, author: string): string {
  const line = (s.content_text ?? '')
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l && !/^(#\S+\s*)+$/.test(l))
  if (!line) return `A photo by @${author}`
  return line.length > 140 ? `${line.slice(0, 140).replace(/\s+\S*$/, '')}…` : line
}

function story(s: Status, label: string): Story | undefined {
  if (s.reblog || s.visibility !== 'public' || s.sensitive || s.spoiler_text?.trim() || !/^https:\/\//.test(s.url)) return undefined
  const media: Media[] = (s.media_attachments ?? [])
    .filter((m) => m.type === 'image' && /^https:\/\//.test(m.url))
    .map((m) => ({
      kind: 'image',
      thumb: m.preview_url && /^https:\/\//.test(m.preview_url) ? m.preview_url : m.url,
      full: m.url,
      ...(m.description ? { alt: m.description } : {}),
      ...(m.meta?.original?.aspect ? { aspect: m.meta.original.aspect } : {}),
    }))
  if (!media.length) return undefined
  const author = s.account.acct.includes('@') ? s.account.acct : `${s.account.acct}@${HOST}`
  return {
    key: linkKey(s.url),
    source: 'pixelfed',
    sourceLabel: label,
    title: titleOf(s, author),
    url: s.url,
    discussionUrl: s.url,
    author,
    score: s.favourites_count,
    comments: s.reply_count,
    createdAt: Date.parse(s.created_at),
    text: s.content || undefined,
    media,
    hasThread: false,
  }
}

/** Today's trending posts, or recent posts with a hashtag (already checked to be a plain word). */
export async function pixelfed(tag?: string): Promise<Story[]> {
  const posts = tag
    ? (await fetchJson<{ tags?: { status: Status }[] }>(`https://${HOST}/api/v2/discover/tag?hashtag=${encodeURIComponent(tag)}`)).tags?.map((t) => t.status)
    : await fetchJson<Status[]>(`https://${HOST}/api/pixelfed/v2/discover/posts/trending?range=daily`)
  const label = tag ? `Pixelfed #${tag}` : 'Pixelfed'
  return (posts ?? []).flatMap((s) => story(s, label) ?? [])
}
