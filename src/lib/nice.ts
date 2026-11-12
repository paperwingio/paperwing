import type { Story } from './types'

// Something nice: one picture from Eye bleach after the news, not another feed to scroll.

/** Where Something nice comes from. */
export const NICE_TOPIC = 'eye-bleach'

const HEAVY = new Set(['world-news', 'politics-us', 'politics-uk', 'politics-au'])
/** Whether a story's topics are the kind of news that earns a break afterwards. */
export const heavyNews = (topics: readonly string[]) => topics.some((t) => HEAVY.has(t))

/** Pictures only. Anything behind a warning is out, covered or not: this is meant to be the safe thing to look at. */
export const nicePictures = (stories: Story[]) => stories.filter((s) => !s.warning && s.media?.some((m) => m.kind === 'image'))

/** The picture to show first. */
export const pickNice = (stories: Story[]): Story | undefined => nicePictures(stories)[0]

/** The picture after `current` on Another, round again from the top after the last. */
export function nextNice(stories: Story[], current: string): Story | undefined {
  const list = nicePictures(stories)
  return list[(list.findIndex((s) => s.key === current) + 1) % list.length]
}
