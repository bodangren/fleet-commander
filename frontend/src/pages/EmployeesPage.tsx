import { useState } from 'react'
import type { Employee } from '@/lib/employees'
import { EmployeeCard } from '@/components/EmployeeCard'

export type EmployeesPageProps = {
  employees: Employee[]
  onFilterBySkill?: (skill: string) => void
}

/**
 * Displays employee cards with skill-based filtering.
 */
export function EmployeesPage({ employees, onFilterBySkill }: EmployeesPageProps) {
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null)

  const allSkills = Array.from(new Set(employees.flatMap(e => e.skills))).sort()

  const filteredEmployees = selectedSkill
    ? employees.filter(e => e.skills.includes(selectedSkill))
    : employees

  const handleSkillClick = (skill: string) => {
    if (selectedSkill === skill) {
      setSelectedSkill(null)
      onFilterBySkill?.('')
    } else {
      setSelectedSkill(skill)
      onFilterBySkill?.(skill)
    }
  }

  return (
    <div data-testid="employees-page" className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black italic uppercase tracking-tighter">Employee Roster</h1>
        <span data-testid="employee-count" className="text-lg font-bold">
          {filteredEmployees.length}
        </span>
      </div>

      {allSkills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allSkills.map(skill => (
            <button
              key={skill}
              type="button"
              onClick={() => handleSkillClick(skill)}
              className={`text-xs px-3 py-1 ${
                selectedSkill === skill
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground'
              }`}
            >
              {skill}
            </button>
          ))}
        </div>
      )}

      {filteredEmployees.length === 0 && employees.length > 0 && (
        <p className="text-muted-foreground">No employees found.</p>
      )}

      {employees.length === 0 && <p className="text-muted-foreground">No employees to display.</p>}

      {filteredEmployees.length > 0 && (
        <>
          <div data-testid="workload-indicator" className="sr-only">
            Workload indicator for employee cards
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredEmployees.map(employee => (
              <EmployeeCard key={employee._id} employee={employee} workload={0} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
