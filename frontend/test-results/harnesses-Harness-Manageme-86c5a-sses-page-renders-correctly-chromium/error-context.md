# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: harnesses.spec.ts >> Harness Management >> harnesses page renders correctly
- Location: e2e/harnesses.spec.ts:9:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Harness Registry')
Expected: visible
Error: strict mode violation: locator('text=Harness Registry') resolved to 2 elements:
    1) <h3 class="text-lg font-semibold">Harness Registry</h3> aka getByRole('heading', { name: 'Harness Registry' })
    2) <div class="rounded-2xl border border-dashed border-border/70 bg-background/30 p-6 text-sm text-muted-foreground">The harness registry is empty or failed to load.</div> aka getByText('The harness registry is empty')

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Harness Registry')

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - complementary [ref=e5]:
    - generic [ref=e7]:
      - img [ref=e9]
      - generic [ref=e11]:
        - paragraph [ref=e12]: Conductor
        - heading "Fleet Commander" [level=1] [ref=e13]
    - navigation [ref=e14]:
      - link "Dashboard" [ref=e15] [cursor=pointer]:
        - /url: /
        - img
        - text: Dashboard
      - link "Agents" [ref=e16] [cursor=pointer]:
        - /url: /agents
        - img
        - text: Agents
      - link "Harnesses" [ref=e17] [cursor=pointer]:
        - /url: /harnesses
        - img
        - text: Harnesses
      - link "Settings" [ref=e18] [cursor=pointer]:
        - /url: /settings
        - img
        - text: Settings
      - link "Pipelines" [ref=e19] [cursor=pointer]:
        - /url: /pipelines
        - img
        - text: Pipelines
    - generic [ref=e21]:
      - generic [ref=e22]: Loading workspace data...
      - button "Refresh" [ref=e23] [cursor=pointer]:
        - img
  - main [ref=e24]:
    - generic [ref=e25]:
      - generic [ref=e26]:
        - paragraph [ref=e27]: Operational Console
        - heading "Harnesses" [level=2] [ref=e28]
        - paragraph [ref=e29]: Manage projects, agent personas, and harness definitions from one local control surface.
      - generic [ref=e30]:
        - generic [ref=e31]: Checking...
        - button "Refresh" [ref=e32] [cursor=pointer]
    - generic [ref=e33]:
      - generic [ref=e34]:
        - generic [ref=e35]:
          - heading "Harness Registry" [level=3] [ref=e36]
          - paragraph [ref=e37]: Manage CLI harness definitions and discovery pipelines.
        - link "Add Custom Harness" [ref=e38] [cursor=pointer]:
          - /url: /harnesses/new
      - generic [ref=e40]: The harness registry is empty or failed to load.
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | 
  3  | test.describe('Harness Management', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('/harnesses')
  6  |     await page.waitForTimeout(500)
  7  |   })
  8  | 
  9  |   test('harnesses page renders correctly', async ({ page }) => {
> 10 |     await expect(page.locator('text=Harness Registry')).toBeVisible({ timeout: 5000 })
     |                                                         ^ Error: expect(locator).toBeVisible() failed
  11 |   })
  12 | 
  13 |   test('add harness button is present', async ({ page }) => {
  14 |     const addButton = page.locator('a:has-text("Add Harness")')
  15 |     if (await addButton.isVisible({ timeout: 3000 })) {
  16 |       await expect(addButton).toBeVisible()
  17 |     }
  18 |   })
  19 | 
  20 |   test('navigate to harness editor', async ({ page }) => {
  21 |     const addButton = page.locator('a:has-text("Add Harness")')
  22 |     if (await addButton.isVisible({ timeout: 3000 })) {
  23 |       await addButton.click()
  24 |       await expect(page).toHaveURL(/\/harnesses\/.*/)
  25 |     }
  26 |   })
  27 | 
  28 |   test('harness cards display correctly', async ({ page }) => {
  29 |     await page.waitForTimeout(1000)
  30 |     const harnessSection = page.locator('section.grid')
  31 |     if (await harnessSection.isVisible({ timeout: 3000 })) {
  32 |       await expect(harnessSection).toBeVisible()
  33 |     }
  34 |   })
  35 | })
```