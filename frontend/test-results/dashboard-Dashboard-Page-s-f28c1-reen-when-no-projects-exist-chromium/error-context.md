# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard.spec.ts >> Dashboard Page >> shows welcome screen when no projects exist
- Location: e2e/dashboard.spec.ts:16:3

# Error details

```
TypeError: page.getByLabelText is not a function
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
  3  | test.describe('Dashboard Page', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('/')
  6  |   })
  7  | 
  8  |   test('shows project listing when projects exist', async ({ page }) => {
  9  |     const projectsHeader = page.locator('text=Projects')
  10 |     if (await projectsHeader.isVisible({ timeout: 3000 })) {
  11 |       await expect(page.getByText('Projects')).toBeVisible()
  12 |       await expect(page.getByText('total')).toBeVisible()
  13 |     }
  14 |   })
  15 | 
  16 |   test('shows welcome screen when no projects exist', async ({ page }) => {
  17 |     const welcomeText = page.locator('text=Bring a workspace into Fleet Commander')
  18 |     if (await welcomeText.isVisible({ timeout: 3000 })) {
> 19 |       await expect(page.getByLabelText('Workspace Root')).toBeVisible()
     |                         ^ TypeError: page.getByLabelText is not a function
  20 |     }
  21 |   })
  22 | 
  23 |   test('shows overview stats section', async ({ page }) => {
  24 |     await page.waitForSelector('text=Tracks', { timeout: 5000 }).catch(() => {})
  25 |     const statsSection = page.locator('text=Tracks').first()
  26 |     if (await statsSection.isVisible({ timeout: 3000 })) {
  27 |       await expect(page.locator('text=Tasks')).toBeVisible()
  28 |       await expect(page.locator('text=Active')).toBeVisible()
  29 |     }
  30 |   })
  31 | 
  32 |   test('shows live output panel', async ({ page }) => {
  33 |     await page.waitForSelector('text=Live Output', { timeout: 5000 }).catch(() => {})
  34 |     const liveOutput = page.locator('text=Live Output').first()
  35 |     if (await liveOutput.isVisible({ timeout: 3000 })) {
  36 |       await expect(liveOutput).toBeVisible()
  37 |     }
  38 |   })
  39 | 
  40 |   test('navigation to agents page works', async ({ page }) => {
  41 |     const agentsLink = page.locator('a[href="/agents"]').first()
  42 |     if (await agentsLink.isVisible({ timeout: 3000 })) {
  43 |       await agentsLink.click()
  44 |       await expect(page).toHaveURL(/\/agents/)
  45 |     }
  46 |   })
  47 | 
  48 |   test('project cards are clickable when projects exist', async ({ page }) => {
  49 |     await page.waitForSelector('[class*="ProjectCard"]', { timeout: 5000 }).catch(() => {})
  50 |     const projectCards = page.locator('[class*="rounded-2xl"]').filter({ hasText: 'conductor' })
  51 |     const count = await projectCards.count()
  52 |     if (count > 0) {
  53 |       await projectCards.first().click()
  54 |     }
  55 |   })
  56 | })
```