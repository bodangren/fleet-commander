import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Error card component for displaying load failure messages
 * @param message - Error message to display
 */
export function LoadErrorCard({ message }: { message: string }) {
  return (
    <Card className="border-destructive/60 bg-destructive/10">
      <CardHeader>
        <CardTitle>Load error</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
    </Card>
  )
}
