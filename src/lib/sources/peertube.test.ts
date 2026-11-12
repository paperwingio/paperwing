import { afterEach, describe, expect, it, vi } from 'vitest'
import { peertubeFeed, peertubeThread } from './peertube'

// PeerTube through its public, CORS-open APIs: Sepia Search across servers, or one server's own list.

const video = (o: Record<string, unknown> = {}) => ({
  name: 'Ginger, Rogue, and a fidget spinner',
  url: 'https://spectra.video/videos/watch/5d1c6f6a-3c51-4b7a-9a0e-2f1f0b0c2d11',
  shortUUID: 'kDDq4SvZbZqsTkWkm7iNhA',
  thumbnailPath: '/lazy-static/thumbnails/a.jpg',
  likes: 6,
  comments: 3,
  views: 34,
  nsfw: false,
  publishedAt: '2026-11-05T10:00:00.000Z',
  language: { id: 'en' },
  account: { name: 'kit', displayName: 'Kit', host: 'spectra.video' },
  truncatedDescription: 'Two cats & <one> spinner',
  ...o,
})

const answer = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } })

function stubFetch(byUrl: (url: URL) => unknown) {
  const asked: URL[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL) => {
      const url = new URL(String(input))
      asked.push(url)
      return answer(byUrl(url))
    }),
  )
  return asked
}

afterEach(() => vi.unstubAllGlobals())

describe('peertube feeds', () => {
  it('asks Sepia Search for a category’s trending, safe-for-work videos and makes stories of them', async () => {
    const asked = stubFetch(() => ({ total: 1, data: [video()] }))
    const [s] = await peertubeFeed({ kind: 'peertube', category: 16 })
    expect(asked[0].origin).toBe('https://sepiasearch.org')
    expect(asked[0].searchParams.get('categoryOneOf')).toBe('16')
    expect(asked[0].searchParams.get('nsfw')).toBe('false')
    expect(asked[0].searchParams.get('sort')).toBe('-trending')
    expect(s).toMatchObject({
      key: 'pt-spectra.video-kDDq4SvZbZqsTkWkm7iNhA',
      source: 'peertube',
      sourceLabel: 'PeerTube Animals',
      title: 'Ginger, Rogue, and a fidget spinner',
      url: 'https://spectra.video/videos/watch/5d1c6f6a-3c51-4b7a-9a0e-2f1f0b0c2d11',
      author: 'kit@spectra.video',
      score: 6,
      comments: 3,
      thumbnail: 'https://spectra.video/lazy-static/thumbnails/a.jpg',
      hasThread: true,
    })
    expect(s.text).toBe('<p>Two cats &amp; &lt;one&gt; spinner</p>')
  })

  it('leaves out videos marked sensitive and ones in languages the reader doesn’t read, but keeps wordless ones', async () => {
    stubFetch(() => ({
      data: [
        video({ shortUUID: 'a', nsfw: true }),
        video({ shortUUID: 'b', language: { id: 'xx' } }),
        video({ shortUUID: 'c', language: { id: 'zxx' } }),
        video({ shortUUID: 'd', language: { id: null } }),
      ],
    }))
    const keys = (await peertubeFeed({ kind: 'peertube', category: 16 })).map((s) => s.key)
    expect(keys).toEqual(['pt-spectra.video-c', 'pt-spectra.video-d'])
  })

  it('reads one server’s own trending list when the feed names it', async () => {
    const asked = stubFetch(() => ({ data: [video()] }))
    await peertubeFeed({ kind: 'peertube', host: 'tilvids.com' })
    expect(asked[0].origin).toBe('https://tilvids.com')
    expect(asked[0].pathname).toBe('/api/v1/videos')
    expect(asked[0].searchParams.get('sort')).toBe('-trending')
  })

  it('never fetches from a server name that isn’t one', async () => {
    const asked = stubFetch(() => ({ data: [] }))
    await expect(peertubeFeed({ kind: 'peertube', host: 'evil.example/@x' })).rejects.toThrow()
    expect(asked).toEqual([])
  })

  it('drops a video whose server name or link a search result made up', async () => {
    stubFetch(() => ({ data: [video({ account: { name: 'x', host: 'evil.example/@x' } }), video({ url: 'javascript:alert(1)' })] }))
    expect(await peertubeFeed({ kind: 'peertube', category: 16 })).toEqual([])
  })
})

describe('peertube threads', () => {
  it('opens a video with its comments, from the video’s own server', async () => {
    const asked = stubFetch((url) =>
      url.pathname.endsWith('/comment-threads')
        ? { data: [{ id: 9, text: 'So <good>', createdAt: '2026-11-06T00:00:00.000Z', totalReplies: 2, account: { name: 'ann', host: 'tube.example' }, isDeleted: false }] }
        : video(),
    )
    const thread = await peertubeThread('pt-spectra.video-kDDq4SvZbZqsTkWkm7iNhA')
    expect(asked.map((u) => u.href)).toEqual([
      'https://spectra.video/api/v1/videos/kDDq4SvZbZqsTkWkm7iNhA',
      'https://spectra.video/api/v1/videos/kDDq4SvZbZqsTkWkm7iNhA/comment-threads?count=50&sort=-likes',
    ])
    expect(thread.story.key).toBe('pt-spectra.video-kDDq4SvZbZqsTkWkm7iNhA')
    expect(thread.comments).toEqual([expect.objectContaining({ id: '9', author: 'ann@tube.example', html: '<p>So &lt;good&gt;</p>', more: 2, children: [] })])
    expect(thread.story.warning).toBeUndefined()
  })

  it('puts a video marked sensitive behind a warning when a link opens it', async () => {
    stubFetch((url) => (url.pathname.endsWith('/comment-threads') ? { data: [] } : video({ nsfw: true })))
    expect((await peertubeThread('pt-spectra.video-kDDq4SvZbZqsTkWkm7iNhA')).story.warning).toBe('Sensitive')
  })
})
