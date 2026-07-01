import { test, expect } from '@playwright/test'

test.describe('Bracket Chaveamento - Conectores SVG', () => {
  test('conectores renderizam corretamente no desktop', async ({ page }) => {
    await page.goto('/copa')
    await page.getByRole('tab', { name: 'Chaveamento' }).click()
    await page.waitForSelector('svg path')

    const paths = await page.locator('svg path').count()
    expect(paths).toBeGreaterThan(0)

    await expect(page).toHaveScreenshot('bracket-desktop-connectors.png', {
      maxDiffPixelRatio: 0.05,
    })
  })

  test('conectores se ajustam no resize da janela', async ({ page }) => {
    await page.goto('/copa')
    await page.getByRole('tab', { name: 'Chaveamento' }).click()
    await page.waitForSelector('svg path')

    await page.setViewportSize({ width: 1400, height: 900 })
    await page.waitForTimeout(100)
    const screenshot1 = await page.screenshot()

    await page.setViewportSize({ width: 1024, height: 768 })
    await page.waitForTimeout(100)
    const screenshot2 = await page.screenshot()

    expect(Buffer.compare(screenshot1, screenshot2)).not.toBe(0)
  })

  test('SVG overlay está presente e visível', async ({ page }) => {
    await page.goto('/copa')
    await page.getByRole('tab', { name: 'Chaveamento' }).click()

    // Selecionar o SVG do bracket (tem classe absolute inset-0)
    const bracketSvg = page.locator('svg.absolute.inset-0')
    await expect(bracketSvg).toBeVisible()
  })
})
