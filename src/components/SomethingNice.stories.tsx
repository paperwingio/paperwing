import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { story } from '../test/fixtures'
import { NicePicture, SomethingNice } from './SomethingNice'

const meta = {
  title: 'Feed/SomethingNice',
  component: SomethingNice,
  decorators: [(Story) => <div style={{ maxWidth: 520, padding: 16 }}>{Story()}</div>],
} satisfies Meta<typeof SomethingNice>
export default meta
type Story = StoryObj<typeof meta>

/** Closed: nothing is fetched until it's asked for. */
export const Offer: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Something nice' })).toBeVisible()
  },
}

const cat = story({
  key: 'lm-77@lemmy.world',
  source: 'lemmy',
  sourceLabel: 'c/aww',
  title: 'He has decided the laundry basket is his now',
  author: 'kit@lemmy.world',
  url: null,
  discussionUrl: 'https://lemmy.world/post/77',
  media: [{ kind: 'image', thumb: '/icon-512.png', full: '/icon-512.png', alt: 'A grey cat curled up in a laundry basket', aspect: 1 }],
})

const kittens = story({ ...cat, key: 'lm-78@lemmy.world', title: 'Foster kittens, day three', media: [{ ...cat.media![0], alt: 'Three kittens asleep' }] })

/** Asked for: one picture from Eye bleach, and Another goes round them all and back to the first. */
export const FromEyeBleach: Story = {
  parameters: { app: { feeds: { 'Lemmy c/aww': [cat, kittens] } } },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Something nice' }))
    const first = await canvas.findByRole('button', { name: 'Another' })
    const title = () => canvas.getByText(/laundry basket|Foster kittens/).textContent
    const start = title()
    await userEvent.click(first)
    await expect(title()).not.toBe(start)
    await userEvent.click(canvas.getByRole('button', { name: 'Another' }))
    await expect(title()).toBe(start)
  },
}

/** Asked for when Eye bleach has nothing to show: says so and points at the topic. */
export const NothingToHand: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Something nice' }))
    await expect(await canvas.findByText(/Nothing to hand just now/)).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Try Eye bleach' })).toHaveAttribute('href', '/t/eye-bleach')
  },
}

/** The picture, who posted it and where, with another on a tap. */
export const Picture: StoryObj<typeof NicePicture> = {
  render: (args) => <NicePicture {...args} />,
  args: { story: cat, onAnother: fn() },
  play: async ({ args, canvas }) => {
    await expect(canvas.getByText('He has decided the laundry basket is his now')).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'More in Eye bleach' })).toHaveAttribute('href', '/t/eye-bleach')
    await userEvent.click(canvas.getByRole('button', { name: 'Another' }))
    await expect(args.onAnother).toHaveBeenCalled()
  },
}
