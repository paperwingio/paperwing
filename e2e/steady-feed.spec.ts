import { feed, gotoFeed, row } from './support/app'
import { expect, test } from './support/test'
import { NOW, story } from '../src/test/fixtures'

const now = NOW
const wire = (label: string, n: number) =>
  Array.from({ length: 6 }, (_, i) =>
    story({
      key: `rss-${label}-${i}`,
      source: 'rss',
      sourceLabel: label,
      title: `${label} story ${i + 1}`,
      url: `https://example.com/${encodeURIComponent(label)}/${i}`,
      createdAt: now - (n * 6 + i + 2) * 3_600_000,
      hasThread: false,
    }),
  )
// France 24 answers last, with the newest story of all.
const late = story({ key: 'rss-late', source: 'rss', sourceLabel: 'France 24', title: 'A story that arrives late', url: 'https://example.com/late', createdAt: now - 60_000, hasThread: false })

test.use({
  prefs: { followed: ['world-news'] },
  stubs: {
    feeds: { 'rss:BBC World': wire('BBC World', 0), 'rss:Guardian World': wire('Guardian World', 1), 'rss:Al Jazeera': wire('Al Jazeera', 2), 'rss:DW': wire('DW', 3), 'rss:France 24': [late] },
  },
})

test('a source that answers late waits behind a button instead of reshuffling the feed', async ({ page }) => {
  let release = () => {}
  const released = new Promise<void>((r) => (release = r))
  await page.route(
    (url) => url.pathname === '/api/feed' && url.searchParams.get('label') === 'France 24',
    async (route) => {
      await released
      await route.fallback()
    },
  )

  await gotoFeed(page, 'world-news')
  // The whole list, not just its first screen (the rest of the rows render a frame later).
  await expect(page.getByText(/^That is all \d+ stories in this feed\.$/)).toBeVisible()
  const titles = () => feed(page).getByRole('article').getByRole('heading').allTextContents()
  const first = await titles()
  await expect(row(page, late.title)).toHaveCount(0)

  release()
  const waiting = page.getByRole('button', { name: '1 new story' })
  await expect(waiting).toBeVisible()
  // The rows you were looking at stay where they were.
  expect(await titles()).toEqual(first)

  await waiting.click()
  await expect(row(page, late.title)).toBeVisible()
  await expect(waiting).toBeHidden()
})

test('refreshing brings the new order in without asking', async ({ page }) => {
  let release = () => {}
  const released = new Promise<void>((r) => (release = r))
  let held = true
  await page.route(
    (url) => url.pathname === '/api/feed' && url.searchParams.get('label') === 'France 24',
    async (route) => {
      if (held) await released
      await route.fallback()
    },
  )
  await gotoFeed(page, 'world-news')
  held = false
  release()
  await expect(page.getByRole('button', { name: '1 new story' })).toBeVisible()
  await page.getByRole('button', { name: /^Refresh/ }).click()
  await expect(row(page, late.title)).toBeVisible()
  await expect(page.getByRole('button', { name: /new stor/ })).toHaveCount(0)
})
