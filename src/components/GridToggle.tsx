import { LayoutGrid, List } from 'lucide-react'
import { usePrefs } from '../lib/store'

/** List or grid, for a picture-led channel. The choice holds for every such channel. */
export function GridToggle() {
  const grid = usePrefs((p) => p.pictureGrid)
  const set = usePrefs((p) => p.set)
  return (
    <div className="flex justify-end gap-1 px-3 pt-2 md:px-4" role="group" aria-label="Show as">
      <button className="icon-btn" aria-pressed={!grid} onClick={() => set({ pictureGrid: false })} title="List">
        <List size={16} />
        <span className="sr-only">List</span>
      </button>
      <button className="icon-btn" aria-pressed={grid} onClick={() => set({ pictureGrid: true })} title="Grid">
        <LayoutGrid size={16} />
        <span className="sr-only">Grid</span>
      </button>
    </div>
  )
}
