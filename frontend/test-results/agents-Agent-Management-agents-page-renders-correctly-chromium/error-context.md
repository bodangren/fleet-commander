# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: agents.spec.ts >> Agent Management >> agents page renders correctly
- Location: e2e/agents.spec.ts:9:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Agent Registry')
Expected: visible
Error: strict mode violation: locator('text=Agent Registry') resolved to 2 elements:
    1) <h3 class="text-lg font-semibold">Agent Registry</h3> aka getByRole('heading', { name: 'Agent Registry' })
    2) <div class="rounded-2xl border border-dashed border-border/70 bg-background/30 p-6 text-sm text-muted-foreground">The agent registry is empty or failed to load.</div> aka getByText('The agent registry is empty')

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Agent Registry')

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
        - heading "Agents" [level=2] [ref=e28]
        - paragraph [ref=e29]: Manage projects, agent personas, and harness definitions from one local control surface.
      - generic [ref=e30]:
        - generic [ref=e31]: Checking...
        - button "Refresh" [ref=e32] [cursor=pointer]
    - generic [ref=e33]:
      - generic [ref=e34]:
        - generic [ref=e35]:
          - heading "Agent Registry" [level=3] [ref=e36]
          - paragraph [ref=e37]: Manage persona definitions and model wiring.
        - link "Add Agent" [ref=e38] [cursor=pointer]:
          - /url: /agents/new/edit
      - generic [ref=e40]: The agent registry is empty or failed to load.
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | 
  3  | test.describe('Agent Management', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('/agents')
  6  |     await page.waitForTimeout(500)
  7  |   })
  8  | 
  9  |   test('agents page renders correctly', async ({ page }) => {
> 10 |     await expect(page.locator('text=Agent Registry')).toBeVisible({ timeout: 5000 })
     |                                                       ^ Error: expect(locator).toBeVisible() failed
  11 |   })
  12 | 
  13 |   test('add agent button is present', async ({ page }) => {
  14 |     const addButton = page.locator('a:has-text("Add Agent")')
  15 |     if (await addButton.isVisible({ timeout: 3000 })) {
  16 |       await expect(addButton).toBeVisible()
  17 |     }
  18 |   })
  19 | 
  20 |   test('navigate to agent editor', async ({ page }) => {
  21 |     const addButton = page.locator('a:has-text("Add Agent")')
  22 |     if (await addButton.isVisible({ timeout: 3000 })) {
  23 |       await addButton.click()
  24 |       await expect(page).toHaveURL(/\/agents\/.*\/edit/)
  25 |     }
  26 |   })
  27 | 
  28 |   test('agent cards display correctly', async ({ page }) => {
  29 |     await page.waitForTimeout(1000)
  30 |     const agentSection = page.locator('section.grid')
  31 |     if (await agentSection.isVisible({ timeout: 3000 })) {
  32 |       await expect(agentSection).toBeVisible()
  33 |     }
  34 |   })
  35 | })
```