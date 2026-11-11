import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { useActivity, usePrefs } from '../lib/store'
import { NOW, ranked, story } from '../test/fixtures'
import { RowSkeleton, StoryRow } from './StoryRow'

const meta = {
  title: 'Feed/StoryRow',
  component: StoryRow,
  args: { story: ranked(), selected: false, read: false, now: NOW, onOpen: fn() },
  decorators: [(Story) => <div style={{ maxWidth: 640 }}>{Story()}</div>],
} satisfies Meta<typeof StoryRow>
export default meta
type Story = StoryObj<typeof meta>

/** Its title is a level-2 heading, under the page's title. */
export const HackerNews: Story = {
  play: async ({ canvas, args }) => {
    await expect(canvas.getByRole('heading', { level: 2, name: args.story.title })).toBeVisible()
  },
}

/** Inside a section with its own heading (Today's), the title steps down a level. */
export const InASection: Story = {
  args: { level: 3 },
  play: async ({ canvas, args }) => {
    await expect(canvas.getByRole('heading', { level: 3, name: args.story.title })).toBeVisible()
  },
}

export const CrossPosted: Story = {
  args: {
    story: ranked({
      title: 'Bluesky passes 40 million users',
      alsoOn: [story({ source: 'lemmy', sourceLabel: 'c/technology', key: 'lm-9' }), story({ source: 'mastodon', sourceLabel: 'Mastodon', key: 'md-9' })],
      topics: ['social', 'web'],
    }),
  },
}

export const BlogWithExcerpt: Story = {
  args: {
    story: ranked({
      source: 'rss',
      sourceLabel: 'Quanta',
      site: 'quantamagazine.org',
      title: 'A New Proof Smooths Out the Math of Melting',
      discussionUrl: null,
      hasThread: false,
      score: undefined,
      comments: undefined,
      text: '<p>Mathematicians have long struggled to describe what happens at the boundary between ice and water.</p>',
      topics: ['science'],
    }),
  },
  // No score from an RSS article: the vote arrows stand alone, with no word between them.
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'More like this' })).toBeVisible()
    await expect(canvas.queryByText('Vote')).toBeNull()
    await expect(canvas.getByText('Science')).toBeVisible()
  },
}

/** In the Science topic itself, every row would be tagged Science: none is. */
export const InItsOwnTopic: Story = {
  args: { ...BlogWithExcerpt.args, hideTopic: 'science' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'A New Proof Smooths Out the Math of Melting' })).toBeVisible()
    await expect(canvas.queryByText('Science')).toBeNull()
  },
}

export const SharedWithANote: Story = {
  args: { story: ranked({ sharedBy: ['paperwing.io'], shareNote: 'Still the clearest case for why feeds, links and blogrolls mattered.' }) },
}

export const BehindAWarning: Story = {
  args: { story: ranked({ warning: 'Graphic media', media: [{ kind: 'image', thumb: '/icon-512.png' }] }) },
  parameters: { app: { prefs: { warnings: 'blur' } } },
}

export const Selected: Story = { args: { selected: true } }
/** A hot discussion on the selected row: its red count sits on grey, and the accessibility check holds it to 4.5:1. */
export const SelectedAndHot: Story = { args: { selected: true, story: ranked({ comments: 219, heat: 0.9 }) } }
export const Read: Story = { args: { read: true } }

export const OpensOnTap: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('link', { name: args.story.title }))
    await expect(args.onOpen).toHaveBeenCalledWith(args.story.key, 'article')
  },
}

export const UpvoteTeachesTheRanking: Story = {
  play: async ({ canvas }) => {
    const up = canvas.getByRole('button', { name: 'More like this' })
    await userEvent.click(up)
    await expect(up).toHaveAttribute('aria-pressed', 'true')
  },
}

/** While a feed loads. */
export const Skeleton: Story = { render: () => <RowSkeleton /> }

const BOARD = 'at://did:plc:uuuuuuuuuuuuuuuuuuuuuuuu/io.paperwing.board/3kitchenboard'
const NEWS = 'at://did:plc:eprq6bm2okrgk6zsoka2wpux/io.paperwing.board/3announcement'

/** A board's listing on the front page says which board it's from, with a way there. */
export const FromABoard: Story = {
  args: { story: ranked({ source: 'bluesky', sourceLabel: 'PaperWing', author: 'cook.example', board: { uri: BOARD, name: 'Home Cooking', official: false } }) },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'in Home Cooking' })).toHaveAttribute('href', '/c/did:plc:uuuuuuuuuuuuuuuuuuuuuuuu/3kitchenboard')
    await expect(canvas.queryByLabelText('Official PaperWing board')).toBeNull()
  },
}

/** PaperWing's own announcement: marked official, and pinned to the top of the front page. */
export const OfficialAnnouncement: Story = {
  args: {
    story: ranked({
      source: 'bluesky',
      sourceLabel: 'PaperWing',
      author: 'paperwing.io',
      board: { uri: NEWS, name: 'Announcements', official: true },
      pinned: true,
      title: 'Boards are here: find yours in Explore',
    }),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Official PaperWing board')).toBeVisible()
    await expect(canvas.getByText('Pinned')).toBeVisible()
  },
}

const kitchen = ranked({ source: 'bluesky', sourceLabel: 'PaperWing', author: 'cook.example', title: 'Sourdough starters compared', board: { uri: BOARD, name: 'Home Cooking', official: false } })

/** A post from a board you haven't joined: Join is one tap, and the row stays where it is. */
export const JoinFromTheFeed: Story = {
  args: { story: kitchen },
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Join Home Cooking' }))
    await expect(usePrefs.getState().boards).toEqual([{ uri: BOARD, name: 'Home Cooking' }])
    await expect(canvas.queryByRole('button', { name: 'Join Home Cooking' })).toBeNull()
    await expect(args.onOpen).not.toHaveBeenCalled()
  },
}

/** Already joined: no button, just where it's from. */
export const FromABoardYouJoined: Story = {
  args: { story: kitchen },
  parameters: { app: { prefs: { boards: [{ uri: BOARD, name: 'Home Cooking' }] } } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'in Home Cooking' })).toBeVisible()
    await expect(canvas.queryByRole('button', { name: /Join/ })).toBeNull()
  },
}

/** A suggestion from a board you haven't joined says so. */
export const Suggested: Story = {
  args: { story: { ...kitchen, recommended: true } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Suggested')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Join Home Cooking' })).toBeVisible()
  },
}

/** An announcement can be dismissed: it's hidden on this device, and your taste learns nothing from it. */
export const DismissAnnouncement: Story = {
  args: {
    story: ranked({
      key: 'bs-welcome',
      source: 'bluesky',
      sourceLabel: 'PaperWing',
      author: 'paperwing.io',
      board: { uri: NEWS, name: 'Announcements', official: true },
      pinned: true,
      title: 'Welcome to PaperWing',
    }),
  },
  play: async ({ canvas, args }) => {
    const before = usePrefs.getState().affinity
    await userEvent.click(canvas.getByRole('button', { name: 'Dismiss this announcement' }))
    await expect(useActivity.getState().hidden['bs-welcome']).toBeGreaterThan(0)
    await expect(usePrefs.getState().affinity).toEqual(before)
    await expect(args.onOpen).not.toHaveBeenCalled()
    // Official boards have no Join button: you can't leave PaperWing's own.
    await expect(canvas.queryByRole('button', { name: /Join/ })).toBeNull()
  },
}

/** Back near the top because its discussion grew a lot since you last saw it. */
export const NewCommentsSinceYouLooked: Story = {
  args: { story: ranked({ seenBefore: true, sinceSeen: { comments: 64 } }), why: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('64 new comments since you looked')).toBeVisible()
  },
}

/** A pick from outside your usual in For you: it says so, so what you make of it teaches the ranking. */
export const OutsideYourUsual: Story = {
  args: { story: ranked({ explore: true }), why: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/Outside your usual/)).toBeVisible()
  },
}

/** A WARN filing has no link and no thread: its headline opens it on its own details. */
export const WarnNotice: Story = {
  args: {
    story: ranked({
      key: 'wn-wa-1grz4f9',
      source: 'warn',
      sourceLabel: 'Washington WARN notices',
      site: 'esd.wa.gov',
      title: 'Microsoft gives notice of 277 layoffs in Redmond, Washington',
      url: null,
      discussionUrl: 'https://esd.wa.gov/about-employees/WARN',
      hasThread: false,
      score: undefined,
      comments: undefined,
      author: undefined,
      topics: ['layoffs'],
    }),
  },
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('link', { name: /Microsoft gives notice/ }))
    await expect(args.onOpen).toHaveBeenCalledWith('wn-wa-1grz4f9', 'article')
  },
}

const joke = ranked({
  key: 'bs-joke',
  source: 'bluesky',
  sourceLabel: 'Bluesky',
  title: 'I finally fixed the bug…',
  url: null,
  discussionUrl: 'https://bsky.app/profile/paperwing.io',
  text: '<p>I finally fixed the bug after three hours of carefully reading the documentation.</p><p>It was in the other terminal.</p>',
  topics: ['humour'],
})

export const FullJoke: Story = {
  args: { story: joke },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: /It was in the other terminal/ })).toBeVisible()
    await expect(canvas.queryByText('I finally fixed the bug…', { exact: true })).toBeNull()
  },
}

export const JokeWithATitle: Story = {
  args: { story: { ...joke, source: 'lemmy', sourceLabel: 'c/programmer_humor', title: 'Why debugging takes three hours', text: '<p>It was in the other terminal.</p>' } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'Why debugging takes three hours' })).toBeVisible()
    await expect(canvas.getByText('It was in the other terminal.', { exact: true })).toBeVisible()
  },
}

const meme =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750"><rect width="600" height="750" fill="#e8e8e8"/><text x="40" y="90" font-family="sans-serif" font-size="32" fill="#222">The tests passed locally.</text><rect x="40" y="140" width="520" height="430" rx="16" fill="#bed5c8"/><text x="40" y="680" font-family="sans-serif" font-size="30" fill="#222">The server was not running.</text></svg>',
  )

export const Meme: Story = {
  args: {
    story: {
      ...joke,
      source: 'lemmy',
      sourceLabel: 'c/memes',
      title: 'A perfectly normal deployment',
      text: undefined,
      media: [{ kind: 'image', thumb: meme, full: `${meme}#original`, aspect: 0.8, alt: 'The tests passed locally. The server was not running.' }],
    },
  },
  play: async ({ canvas, args }) => {
    const image = canvas.getByRole('img', { name: /The tests passed locally/ })
    await expect(image).toBeVisible()
    await expect(image).toHaveAttribute('src', meme)
    await expect(getComputedStyle(image).objectFit).toBe('contain')
    await waitFor(() => expect(image.getBoundingClientRect().width).toBeGreaterThan(200))
    await userEvent.click(canvas.getByRole('link', { name: /Open image/ }))
    await expect(args.onOpen).not.toHaveBeenCalled()
    await userEvent.keyboard('{Escape}')
  },
}

export const JokeWithQuote: Story = {
  args: {
    story: {
      ...joke,
      quote: {
        author: 'paperwing.io',
        html: '<p>We have replaced every meeting with a meeting to discuss which meetings to replace. Attendance is mandatory, including for the meeting about optional meetings.</p>',
        media: [{ kind: 'image', thumb: meme, alt: 'The meeting agenda' }],
      },
    },
  },
  play: async ({ canvas }) => {
    const quote = canvas.getByText(/Attendance is mandatory/)
    await expect(quote).toBeVisible()
    await expect(getComputedStyle(quote).webkitLineClamp).toBe('none')
    await expect(canvas.getByRole('img', { name: 'The meeting agenda' })).toBeVisible()
  },
}

export const HumourWithoutPictures: Story = {
  args: Meme.args,
  parameters: { app: { prefs: { thumbnails: false } } },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('img', { name: /The tests passed locally/ })).toBeNull()
  },
}

export const TwoMemes: Story = {
  args: { story: { ...joke, text: undefined, media: [...Meme.args!.story!.media!, { kind: 'image', thumb: meme, alt: 'The punchline', aspect: 0.8 }] } },
  play: async ({ canvas }) => {
    for (const image of canvas.getAllByRole('img')) await expect(getComputedStyle(image).objectFit).toBe('contain')
    await expect(canvas.getByRole('img', { name: 'The punchline' })).toBeVisible()
  },
}

export const HumourBehindAWarning: Story = {
  args: { story: { ...joke, warning: 'Sensitive content', quote: JokeWithQuote.args!.story!.quote, media: Meme.args!.story!.media } },
  parameters: { app: { prefs: { warnings: 'blur' } } },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(/Attendance is mandatory/)).toBeNull()
    await expect(canvas.queryByRole('img', { name: /The tests passed locally|The meeting agenda/ })).toBeNull()
    await expect(canvas.queryByRole('heading', { name: /It was in the other terminal/ })).toBeNull()
  },
}
