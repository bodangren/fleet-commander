import type { Employee } from '@/lib/employees'

export type EmployeesPageProps = {
  employees: Employee[]
  onFilterBySkill?: (skill: string) => void
}

export function EmployeesPage({ employees, onFilterBySkill }: EmployeesPageProps) {
  return (
    <div data-testid="employees-page">
      <h1>Employees</h1>
    </div>
  )
}
