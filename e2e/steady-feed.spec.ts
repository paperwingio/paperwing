import type { Page } from '@playwright/test'
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

const isLate = (url: URL) => url.pathname === '/api/feed' && url.searchParams.get('label') === 'France 24'
/** Holds France 24's answer until `release` is called. */
async function holdLate(page: Page) {
  let release = () => {}
  const released = new Promise<void>((r) => (release = r))
  let held = true
  await page.route(isLate, async (route) => {
    if (held) await released
    await route.fallback()
  })
  return () => {
    held = false
    release()
  }
}
/** How far the feed is scrolled: the page on a phone, the list beside the reading pane on a desktop. */
const scrolled = (page: Page) => page.evaluate(() => Math.max(window.scrollY, document.getElementById('list-scroll')?.scrollTop ?? 0))

test('refreshing brings the new order in, from the top', async ({ page }) => {
  const release = await holdLate(page)
  await gotoFeed(page, 'world-news')
  release()
  await expect(page.getByRole('button', { name: '1 new story' })).toBeVisible()
  await page.evaluate(() => {
    window.scrollTo(0, 800)
    const list = document.getElementById('list-scroll')
    if (list) list.scrollTop = 800
  })
  await page.getByRole('button', { name: /^Refresh/ }).click()
  await expect(row(page, late.title)).toBeVisible()
  await expect(page.getByRole('button', { name: /new stor/ })).toHaveCount(0)
  await expect.poll(() => scrolled(page)).toBe(0)
})

test('with a filter on, only stories the filter shows count as new', async ({ page }) => {
  const release = await holdLate(page)
  await page.goto('/t/world-news?src=lemmy')
  await expect(feed(page).getByRole('article').first()).toBeVisible()
  const answered = page.waitForResponse((r) => isLate(new URL(r.url())))
  release()
  await answered
  // France 24's story is RSS, which a Lemmy-only view doesn't show: nothing to offer.
  await expect(page.getByRole('button', { name: /new stor/ })).toHaveCount(0)
})
