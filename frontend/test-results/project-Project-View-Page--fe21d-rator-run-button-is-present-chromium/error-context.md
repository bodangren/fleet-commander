# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: project.spec.ts >> Project View Page >> trigger orchestrator run button is present
- Location: e2e/project.spec.ts:49:3

# Error details

```
TimeoutError: page.waitForURL: Timeout 5000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
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
        - heading "Dashboard" [level=2] [ref=e28]
        - paragraph [ref=e29]: Manage projects, agent personas, and harness definitions from one local control surface.
      - generic [ref=e30]:
        - generic [ref=e31]: Checking...
        - button "Refresh" [ref=e32] [cursor=pointer]
    - generic [ref=e34]:
      - generic [ref=e35]:
        - generic [ref=e36]:
          - generic [ref=e37]: Workspace onboarding
          - generic [ref=e38]:
            - generic [ref=e39]: Bring a workspace into Fleet Commander.
            - generic [ref=e40]: No registered projects yet. Scan a local root directory, import every Conductor workspace you want to manage, and start routing tasks from one dashboard.
        - generic [ref=e41]:
          - generic [ref=e42]:
            - paragraph [ref=e43]: Registered projects
            - paragraph [ref=e44]: "0"
          - generic [ref=e45]:
            - paragraph [ref=e46]: Next step
            - paragraph [ref=e47]: "Scan a workspace root to discover `conductor/` folders."
          - generic [ref=e48]:
            - paragraph [ref=e49]: Management surface
            - paragraph [ref=e50]: Review projects, agents, and harnesses from one local control plane.
      - generic [ref=e51]:
        - generic [ref=e53]:
          - generic [ref=e54]:
            - generic [ref=e55]: Scan a workspace
            - generic [ref=e56]: Point the daemon at a root directory and import every discovered Conductor project.
          - generic [ref=e57]: Local only
        - generic [ref=e58]:
          - generic [ref=e59]:
            - text: Workspace Root
            - textbox "Workspace Root" [ref=e60]:
              - /placeholder: /home/daniel-bo/Desktop
          - generic [ref=e61]:
            - button "Scan workspace" [ref=e62] [cursor=pointer]
            - button "Import selected (0)" [disabled]
          - generic [ref=e63]: Scan a root directory to reveal registered projects and import them into Fleet Commander.
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | 
  3  | test.describe('Project View Page', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('/')
  6  |     await page.waitForSelector('text=Projects', { timeout: 10000 }).catch(() => {})
  7  |   })
  8  | 
  9  |   test('kanban board renders when project is loaded', async ({ page }) => {
  10 |     const projectCards = page.locator('[class*="rounded-2xl"]').filter({ hasText: 'conductor' })
  11 |     const count = await projectCards.count()
  12 |     if (count > 0) {
  13 |       await projectCards.first().click()
  14 |       await page.waitForURL(/\/project\//, { timeout: 5000 })
  15 |       const boardTab = page.locator('button:has-text("Kanban Board")')
  16 |       if (await boardTab.isVisible({ timeout: 3000 })) {
  17 |         await boardTab.click()
  18 |         await expect(page.locator('text=Board summary')).toBeVisible()
  19 |       }
  20 |     }
  21 |   })
  22 | 
  23 |   test('project detail card shows correct information', async ({ page }) => {
  24 |     const projectCards = page.locator('[class*="rounded-2xl"]').filter({ hasText: 'conductor' })
  25 |     const count = await projectCards.count()
  26 |     if (count > 0) {
  27 |       await projectCards.first().click()
  28 |       await page.waitForURL(/\/project\//, { timeout: 5000 })
  29 |       await expect(page.locator('text=Project detail')).toBeVisible({ timeout: 5000 })
  30 |       await expect(page.locator('text=Tracks')).toBeVisible({ timeout: 5000 })
  31 |       await expect(page.locator('text=Tasks')).toBeVisible({ timeout: 5000 })
  32 |     }
  33 |   })
  34 | 
  35 |   test('back to dashboard navigation works', async ({ page }) => {
  36 |     const projectCards = page.locator('[class*="rounded-2xl"]').filter({ hasText: 'conductor' })
  37 |     const count = await projectCards.count()
  38 |     if (count > 0) {
  39 |       await projectCards.first().click()
  40 |       await page.waitForURL(/\/project\//, { timeout: 5000 })
  41 |       const backButton = page.locator('a:has-text("Back to dashboard")')
  42 |       if (await backButton.isVisible({ timeout: 3000 })) {
  43 |         await backButton.click()
  44 |         await expect(page).toHaveURL('/')
  45 |       }
  46 |     }
  47 |   })
  48 | 
  49 |   test('trigger orchestrator run button is present', async ({ page }) => {
  50 |     const projectCards = page.locator('[class*="rounded-2xl"]').filter({ hasText: 'conductor' })
  51 |     const count = await projectCards.count()
  52 |     if (count > 0) {
  53 |       await projectCards.first().click()
> 54 |       await page.waitForURL(/\/project\//, { timeout: 5000 })
     |                  ^ TimeoutError: page.waitForURL: Timeout 5000ms exceeded.
  55 |       const triggerButton = page.locator('button:has-text("Trigger Orchestrator Run")')
  56 |       if (await triggerButton.isVisible({ timeout: 3000 })) {
  57 |         await expect(triggerButton).toBeVisible()
  58 |       }
  59 |     }
  60 |   })
  61 | 
  62 |   test('tabs navigation works (dependencies, issues, sprint, logs, review)', async ({ page }) => {
  63 |     const projectCards = page.locator('[class*="rounded-2xl"]').filter({ hasText: 'conductor' })
  64 |     const count = await projectCards.count()
  65 |     if (count > 0) {
  66 |       await projectCards.first().click()
  67 |       await page.waitForURL(/\/project\//, { timeout: 5000 })
  68 |       const tabs = ['Dependencies', 'Issues', 'Sprint', 'Logs', 'Review']
  69 |       for (const tab of tabs) {
  70 |         const tabButton = page.locator(`button:has-text("${tab}")`)
  71 |         if (await tabButton.isVisible({ timeout: 3000 })) {
  72 |           await tabButton.click()
  73 |           await page.waitForTimeout(500)
  74 |         }
  75 |       }
  76 |     }
  77 |   })
  78 | 
  79 |   test('next task section is visible', async ({ page }) => {
  80 |     const projectCards = page.locator('[class*="rounded-2xl"]').filter({ hasText: 'conductor' })
  81 |     const count = await projectCards.count()
  82 |     if (count > 0) {
  83 |       await projectCards.first().click()
  84 |       await page.waitForURL(/\/project\//, { timeout: 5000 })
  85 |       const nextTaskSection = page.locator('text=Next task')
  86 |       if (await nextTaskSection.isVisible({ timeout: 5000 })) {
  87 |         await expect(nextTaskSection).toBeVisible()
  88 |       }
  89 |     }
  90 |   })
  91 | })
```