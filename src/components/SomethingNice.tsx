import { PawPrint, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useChannelFeed } from '../lib/hooks'
import { NICE_TOPIC, nextNice, nicePictures, pickNice } from '../lib/nice'
import type { Story } from '../lib/types'
import { MediaGallery } from './Media'
import { sourceLabel } from './Source'

/**
 * A break after the news: one picture from Eye bleach, asked for with a tap so nothing is fetched
 * until then. One picture, not a feed; another if you want one.
 */
export function SomethingNice({ className = '' }: { className?: string }) {
  const [asked, setAsked] = useState(false)
  return (
    <div className={className} aria-live="polite">
      {asked ? (
        <FromEyeBleach />
      ) : (
        <button className="btn" onClick={() => setAsked(true)}>
          <PawPrint size={15} /> Something nice
        </button>
      )}
    </div>
  )
}

function FromEyeBleach() {
  const feed = useChannelFeed(NICE_TOPIC, { sort: 'hot' })
  // The picture on show stays put while the rest of Eye bleach's feeds answer and re-rank.
  const [shown, setShown] = useState<string>()
  const story = nicePictures(feed.stories).find((s) => s.key === shown) ?? pickNice(feed.stories)
  useEffect(() => {
    if (story && !shown) setShown(story.key)
  }, [story, shown])
  if (!story) {
    return feed.fetching ? (
      <p className="text-[0.9375rem] text-ink-3">Finding something nice…</p>
    ) : (
      <p className="text-[0.9375rem] text-ink-3">
        Nothing to hand just now. <Link to={`/t/${NICE_TOPIC}`}>Try Eye bleach</Link>
      </p>
    )
  }
  return <NicePicture story={story} onAnother={() => setShown(nextNice(feed.stories, story.key)?.key)} />
}

/** The picture itself, with who posted it and where. */
export function NicePicture({ story, onAnother }: { story: Story; onAnother?: () => void }) {
  const images = (story.media ?? []).filter((m) => m.kind === 'image').slice(0, 1)
  return (
    <figure className="mx-auto max-w-md text-left">
      <MediaGallery media={images} href={story.discussionUrl} compact alts />
      <figcaption className="mt-2 text-[0.875rem] text-ink-2">
        <span className="line-clamp-2 font-semibold">{story.title}</span>
        <span className="text-ink-3">
          {story.author ? `${story.author} on ` : ''}
          {sourceLabel(story)}
        </span>
      </figcaption>
      <div className="mt-3 flex flex-wrap gap-2">
        {onAnother && (
          <button className="btn" onClick={onAnother}>
            <RefreshCw size={15} /> Another
          </button>
        )}
        <Link className="btn" to={`/t/${NICE_TOPIC}`}>
          More in Eye bleach
        </Link>
      </div>
    </figure>
  )
}
