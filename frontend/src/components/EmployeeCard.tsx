import type { Employee } from '@/lib/employees'
import { cn } from '@/lib/utils'

export type EmployeeCardProps = {
  employee: Employee
  workload?: number
  onStatusToggle?: (id: string) => void
}

/**
 * Renders a card container for displaying employee information and status
 * @param employee - Employee data to display
 * @param workload - Optional workload value (0-100)
 * @param onStatusToggle - Optional callback when status toggle is clicked
 */
export function EmployeeCard({ employee, workload, onStatusToggle }: EmployeeCardProps) {
  return (
    <div
      data-testid="employee-card"
      data-employee-id={employee._id}
      className="border-2 border-border bg-card p-4"
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <span data-testid="employee-name" className="font-bold text-lg">
              {employee.name}
            </span>
            <p className="text-sm text-muted-foreground">{employee.role}</p>
          </div>
          <span
            className={cn(
              'text-xs font-bold uppercase px-2 py-1',
              employee.status === 'active'
                ? 'bg-green-500/20 text-green-700'
                : 'bg-yellow-500/20 text-yellow-700',
            )}
          >
            {employee.status}
          </span>
        </div>

        <div className="text-xs text-muted-foreground">
          Model: <span className="font-mono">gpt-4</span>
        </div>

        <div className="flex flex-wrap gap-1">
          {employee.skills.map(skill => (
            <span
              key={skill}
              className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5"
            >
              {skill}
            </span>
          ))}
        </div>

        {workload !== undefined && (
          <div data-testid="workload-bar" className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Workload:</span>
            <span data-testid="workload-count" className="text-xs font-bold">
              {workload}
            </span>
          </div>
        )}

        {onStatusToggle && (
          <button
            type="button"
            onClick={() => onStatusToggle(employee._id)}
            className="text-xs bg-primary text-primary-foreground px-3 py-1"
          >
            Toggle Status
          </button>
        )}
      </div>
    </div>
  )
}
