import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { NewStories } from './NewStories'

const meta = {
  title: 'Feed/NewStories',
  component: NewStories,
  args: { count: 12, onShow: fn() },
  decorators: [(Story) => <div style={{ maxWidth: 640, height: 160, paddingTop: 8 }}>{Story()}</div>],
} satisfies Meta<typeof NewStories>
export default meta
type Story = StoryObj<typeof meta>

/** Later sources' stories, waiting: a tap brings them in. */
export const Waiting: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: '12 new stories' }))
    await expect(args.onShow).toHaveBeenCalledOnce()
  },
}

export const One: Story = {
  args: { count: 1 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: '1 new story' })).toBeVisible()
  },
}

/** Nothing waiting: nothing shows, and the status region stays for announcing the next arrivals. */
export const NoneWaiting: Story = {
  args: { count: 0 },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button')).toBeNull()
    await expect(canvas.getByRole('status')).toBeInTheDocument()
  },
}
