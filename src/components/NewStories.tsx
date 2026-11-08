import { ArrowUp } from 'lucide-react'

/**
 * Stories that arrived after the list painted, waiting instead of reshuffling the rows you're
 * reading. Floats over the top of the list (it takes no room, so showing it moves nothing); a tap
 * brings them in and goes to the top.
 */
export function NewStories({ count, onShow }: { count: number; onShow: () => void }) {
  return (
    <div className="new-stories" role="status">
      {count > 0 && (
        <button type="button" className="new-stories-btn" onClick={onShow}>
          <ArrowUp size={15} strokeWidth={2.5} aria-hidden />
          <span>
            <span className="num">{count}</span> new {count === 1 ? 'story' : 'stories'}
          </span>
        </button>
      )}
    </div>
  )
}
