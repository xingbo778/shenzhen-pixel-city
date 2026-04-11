import { expect, test } from 'playwright/test'

const STORAGE_MODE_KEY = 'szpc.dataSourceMode'
const STORAGE_ENGINE_KEY = 'szpc.engineUrl'

async function bootMockMode(page: import('playwright/test').Page) {
  await page.addInitScript(
    ([modeKey, engineKey]) => {
      window.localStorage.setItem(modeKey, 'mock')
      window.localStorage.setItem(engineKey, 'http://127.0.0.1:8000')
    },
    [STORAGE_MODE_KEY, STORAGE_ENGINE_KEY],
  )
}

async function openNanshanScene(page: import('playwright/test').Page) {
  await page.getByTestId('overview-hotspot-nanshan_tech_park').click()
  await expect(page.getByTestId('back-to-overview')).toBeVisible({ timeout: 15000 })
  await expect(page.getByTestId('scene-map-container')).toBeVisible({ timeout: 30000 })
}

test.beforeEach(async ({ page }) => {
  await bootMockMode(page)
  await page.goto('/')
  await expect(page.getByText('MOCK MODE · 使用内置演示数据')).toBeVisible()
})

test('loads the home page in mock mode with overview map and bot grid', async ({ page }) => {
  await expect(page.getByTestId('overview-map-canvas')).toBeVisible()
  await expect(page.getByTestId('right-panel')).toBeVisible()
  await expect(page.locator('[data-testid^="bot-card-"]').first()).toBeVisible()
  await expect(page.getByText('PIXEL MAP · SHENZHEN')).toBeVisible()
})

test('opens bot detail from the bot grid', async ({ page }) => {
  await page.getByTestId('bot-card-bot_1').click()
  await expect(page.getByTestId('bot-detail-panel')).toBeVisible()
  await expect(page.getByTestId('bot-detail-content')).toContainText('陈志远')
})

test('navigates from overview to scene and toggles between 3d and plan view', async ({ page }) => {
  await openNanshanScene(page)

  await expect(page.getByTestId('scene-3d-canvas')).toBeVisible()
  await page.getByTestId('scene-view-plan').click()
  await expect(page.getByTestId('scene-plan-canvas')).toBeVisible()
  await page.getByTestId('scene-view-3d').click()
  await expect(page.getByTestId('scene-3d-canvas')).toBeVisible()

  await page.getByTestId('back-to-overview').click()
  await expect(page.getByTestId('overview-map-canvas')).toBeVisible()
})

test('shows location details for the selected scene in the right panel', async ({ page }) => {
  await openNanshanScene(page)
  await page.getByTestId('tab-location').click()
  await expect(page.getByTestId('right-panel')).toContainText('南山科技园')
})

test('switches right-panel tabs in the browser without crashing', async ({ page }) => {
  await page.getByTestId('tab-moments').click()
  await expect(page.getByTestId('right-panel')).toContainText('陈志远')

  await page.getByTestId('tab-events').click()
  await expect(page.getByTestId('right-panel')).toContainText('世界事件')
})
