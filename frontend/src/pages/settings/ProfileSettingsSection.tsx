import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'

/**
 * Profile settings section. Phase 3 establishes the boundary contract (title,
 * description, exported function); interior UX will be fleshed out in a
 * follow-up track.
 */
export function ProfileSettingsSection() {
  return (
    <Card className="border-border/60 bg-background/60">
      <CardHeader>
        <h3 className="font-semibold leading-none tracking-tight">Profile</h3>
        <CardDescription>Manage your display name, avatar, and personal details.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Customize your display name, avatar, and other personal details.
        </p>
      </CardContent>
    </Card>
  )
}
