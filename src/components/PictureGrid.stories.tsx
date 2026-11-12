import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { usePrefs } from '../lib/store'
import { ranked } from '../test/fixtures'
import { GridToggle } from './GridToggle'
import { PictureGrid } from './PictureGrid'

const picture = (key: string, title: string, extra = {}) =>
  ranked({ key, title, source: 'lemmy', sourceLabel: 'c/aww', url: null, media: [{ kind: 'image', thumb: '/icon-512.png', alt: `${title}, the picture` }], topics: ['eye-bleach'], ...extra })

const stories = [
  picture('lm-1', 'He has decided the laundry basket is his now'),
  picture('lm-2', 'Foster kittens, day three'),
  picture('lm-3', 'Something you might not want to see', { warning: 'Graphic' }),
  ranked({
    key: 'lm-4',
    title: 'Shower thought: dogs think we are bad at fetch because we keep throwing the ball away',
    source: 'lemmy',
    sourceLabel: 'c/showerthoughts',
    url: null,
    topics: ['humour'],
  }),
]

const meta = {
  title: 'Feed/PictureGrid',
  component: PictureGrid,
  args: { stories, selected: 'lm-2', read: { 'lm-1': 1 }, onOpen: fn() },
  decorators: [(Story) => <div style={{ maxWidth: 640 }}>{Story()}</div>],
} satisfies Meta<typeof PictureGrid>
export default meta
type Story = StoryObj<typeof meta>

/** Tiles in the list's order: a picture, its title, a covered one behind its warning, and a joke with no picture. */
export const Tiles: Story = {
  play: async ({ args, canvas, canvasElement }) => {
    await expect(canvas.getAllByRole('listitem')).toHaveLength(4)
    await expect(canvas.getByRole('link', { name: /Foster kittens/ })).toHaveAttribute('aria-current', 'true')
    await expect(canvas.getByText(/Graphic:/)).toBeVisible()
    // j/k finds a tile the way it finds a row.
    await expect(canvasElement.querySelector('#row-lm-2')).not.toBeNull()
    await userEvent.click(canvas.getByRole('link', { name: /laundry basket/ }))
    await expect(args.onOpen).toHaveBeenCalledWith('lm-1', 'discussion')
  },
}

/** The switch between list and grid, remembered for every picture-led channel. */
export const Toggle: StoryObj<typeof GridToggle> = {
  render: () => <GridToggle />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Grid' }))
    await expect(canvas.getByRole('button', { name: 'Grid' })).toHaveAttribute('aria-pressed', 'true')
    await expect(usePrefs.getState().pictureGrid).toBe(true)
  },
}
