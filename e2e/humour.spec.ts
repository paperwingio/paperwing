import { expect, test } from './support/test'
import { SELF_POST_THREAD } from './fixtures/upstream'

const feed = 'at://did:plc:h34txfcpwsnswikajv7tos6w/app.bsky.feed.generator/aaachysnvmkze'
const post = {
  ...SELF_POST_THREAD.thread.post,
  embed: undefined,
  record: { ...SELF_POST_THREAD.thread.post.record, text: 'I finally fixed the bug.\n\nIt was in the other terminal.' },
}

test.use({ prefs: { followed: ['science'] }, stubs: { bluesky: { [feed]: [{ post }] } } })

test('find humour, follow it into For you and unfollow it', async ({ page }) => {
  await page.goto('/explore/topics')
  await page.getByRole('searchbox', { name: 'Find a topic' }).fill('shitposting')
  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Memes & humour' }) })
  await card.getByRole('button', { name: 'Follow Memes & humour' }).click()
  await card.getByRole('link', { name: 'Memes & humour', exact: true }).click()
  await expect(page).toHaveURL(/\/t\/humour$/)
  await expect(page.getByRole('heading', { name: /It was in the other terminal/ })).toBeVisible()
  await page.goto('/t/for-you')
  await expect(page.getByRole('heading', { name: /It was in the other terminal/ })).toBeVisible()
  await page.goto('/explore/topics')
  await page.getByRole('searchbox', { name: 'Find a topic' }).fill('shitposting')
  await card.getByRole('button', { name: 'Following Memes & humour' }).click()
  await page.goto('/t/for-you')
  await expect(page.getByRole('heading', { name: 'For you', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: /It was in the other terminal/ })).toHaveCount(0)
})
