export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-background/30 p-6 text-sm text-muted-foreground">
      {text}
    </div>
  )
}
