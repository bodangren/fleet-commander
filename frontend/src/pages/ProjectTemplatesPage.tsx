import { useState } from 'react'

import { useConvexQuery } from '@/lib/useConvexData'
import { TemplateCard, type ProjectTemplateSummary } from '@/components/TemplateCard'
import { TemplateDetailModal, type ProjectTemplateDetail } from '@/components/TemplateDetailModal'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'

const CATEGORIES = ['Web App', 'API Service', 'CLI', 'Documentation'] as const

/**
 * Gallery page displaying project templates with search, category filtering, and detail modal
 */
export function ProjectTemplatesPage() {
  const templates = useConvexQuery<ProjectTemplateDetail[]>('listProjectTemplatesHandler', {}, true)

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplateDetail | null>(null)

  const isLoading = templates === undefined
  const isEmpty = !isLoading && templates.length === 0

  const filtered = (templates ?? []).filter(t => {
    const matchesCategory = category === null || t.category === category
    const matchesSearch = search === '' || t.name.toLowerCase().includes(search.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Project Templates</h2>
          {!isLoading && (
            <p className="text-sm text-muted-foreground">
              {templates.length} template{templates.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Button variant="outline">Seed Defaults</Button>
      </div>

      {!isLoading && !isEmpty && (
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            aria-label="Search"
            placeholder="Search templates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-64 rounded-md border border-border/60 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          />
          <div role="group" aria-label="Category filters" className="flex flex-wrap gap-1">
            <Button
              variant={category === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategory(null)}
            >
              All
            </Button>
            {CATEGORIES.map(cat => (
              <Button
                key={cat}
                variant={category === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Loading project templates...</p>}

      {isEmpty && <EmptyState text="No project templates yet." />}

      {!isLoading && !isEmpty && filtered.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(t => {
            const summary: ProjectTemplateSummary = {
              _id: t._id,
              name: t.name,
              description: t.description,
              category: t.category,
              taskCount: t.tasks.length,
              estimatedBudget: t.estimatedBudget,
            }
            return (
              <TemplateCard
                key={t._id}
                template={summary}
                onSelect={() => setSelectedTemplate(t)}
              />
            )
          })}
        </div>
      )}

      {!isLoading && !isEmpty && filtered.length === 0 && (
        <EmptyState text="No templates match your search." />
      )}

      <TemplateDetailModal
        template={selectedTemplate}
        onClose={() => setSelectedTemplate(null)}
        onCreate={() => {}}
        creating={false}
      />
    </div>
  )
}
