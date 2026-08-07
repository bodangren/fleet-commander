import { QualityProfileSection } from './QualityProfileSection'

/**
 * Settings sub-page for quality workflow profile selection.
 * Defaults to the demo project slug used by Playwright seeds; production
 * can later pass an active project from fleet context.
 */
export function QualitySettingsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Quality</h2>
        <p className="text-sm text-muted-foreground">
          Choose the quality-workflow profile for project work and inspect ordered stages.
        </p>
      </div>
      <QualityProfileSection projectSlug="demo-project" />
    </div>
  )
}
