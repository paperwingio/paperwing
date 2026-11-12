import { lemmyPost } from './fixtures/upstream'
import { expect, test } from './support/test'

const basket = lemmyPost(900101, 'He has decided the laundry basket is his now', 'https://lemmy.world/pictrs/image/basket.png', 'aww')

test.use({ stubs: { lemmy: { 'aww@lemmy.world': [basket] } } })

test('see Eye bleach as a grid of pictures, open one, and go back to the list', async ({ page }) => {
  await page.goto('/t/eye-bleach')
  await expect(page.getByRole('heading', { name: 'He has decided the laundry basket is his now' })).toBeVisible()
  await page.getByRole('button', { name: 'Grid' }).click()
  const grid = page.getByRole('list', { name: 'Pictures' })
  await expect(grid).toBeVisible()
  await grid.getByRole('link', { name: /laundry basket/ }).click()
  await expect(page).toHaveURL(/lm-900101/)
  await page.goto('/t/eye-bleach')
  await expect(page.getByRole('list', { name: 'Pictures' })).toBeVisible()
  await page.getByRole('button', { name: 'List' }).click()
  await expect(page.getByRole('heading', { name: 'He has decided the laundry basket is his now' })).toBeVisible()
})
