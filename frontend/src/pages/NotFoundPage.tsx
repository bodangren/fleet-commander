import { Link, useLocation } from 'react-router-dom'

/**
 * Renders a recoverable 404 for paths that are outside the application routes.
 * @returns A not-found message preserving the attempted pathname
 */
export function NotFoundPage() {
  const location = useLocation()
  const attemptedPath = `${location.pathname}${location.search}${location.hash}`

  return (
    <main className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-lg space-y-4 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">404</p>
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          No page matches <code className="rounded bg-muted px-1.5 py-0.5">{attemptedPath}</code>.
        </p>
        <Link
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          to="/portfolio"
        >
          Back to Portfolio
        </Link>
      </div>
    </main>
  )
}
