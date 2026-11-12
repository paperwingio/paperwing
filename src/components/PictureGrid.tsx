import type { Ranked } from '../lib/rank'
import { usePrefs } from '../lib/store'
import { openingTab } from './StoryRow'

/**
 * An image-board grid for picture-led channels: one tile per story, its first picture and its title.
 * Same order and keys as the list, so j/k and the reading pane work the same.
 */
export function PictureGrid({
  stories,
  selected,
  read,
  onOpen,
}: {
  stories: Ranked[]
  selected?: string
  read: Record<string, unknown>
  onOpen: (key: string, tab?: 'discussion' | 'article' | 'related') => void
}) {
  const warnMode = usePrefs((p) => p.warnings)
  return (
    <ul className="grid grid-cols-2 gap-3 px-3 py-3 sm:grid-cols-3 md:px-4" aria-label="Pictures">
      {stories.map((s) => {
        const image = s.media?.find((m) => m.kind === 'image')
        const src = image?.thumb ?? s.thumbnail
        const covered = !!s.warning && warnMode === 'blur'
        const isRead = !!read[s.key] && s.key !== selected
        return (
          // The row- id is what j/k scrolls to, as it is for rows.
          <li key={s.key} id={`row-${s.key}`}>
            <a
              href={s.discussionUrl ?? s.url ?? '#'}
              aria-current={s.key === selected ? 'true' : undefined}
              className={`block rounded-[14px] p-1 ${s.key === selected ? 'bg-panel' : ''}`}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return
                e.preventDefault()
                onOpen(s.key, openingTab(s))
              }}
            >
              {src ? (
                <img
                  src={src}
                  alt={covered ? '' : (image?.alt ?? '')}
                  loading="lazy"
                  decoding="async"
                  className={`aspect-square w-full rounded-[10px] bg-panel object-cover ${covered ? 'blur-xl' : ''}`}
                />
              ) : (
                <span className="grid aspect-square w-full place-items-center overflow-hidden rounded-[10px] bg-panel p-3 text-left text-[0.875rem] leading-snug text-ink-2">
                  <span className="line-clamp-6">{s.title}</span>
                </span>
              )}
              <span className={`mt-1.5 line-clamp-2 px-1 text-[0.8125rem] leading-snug ${isRead ? 'text-ink-3' : 'font-semibold text-ink'}`}>
                {covered && <span className="text-ink-3">{s.warning}: </span>}
                {s.title}
              </span>
            </a>
          </li>
        )
      })}
    </ul>
  )
}
