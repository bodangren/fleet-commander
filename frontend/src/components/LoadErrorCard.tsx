import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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
