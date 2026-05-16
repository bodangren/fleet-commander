import type { Employee } from '@/lib/employees'

export type EmployeeCardProps = {
  employee: Employee
  workload?: number
  onStatusToggle?: (id: string) => void
}

export function EmployeeCard({ employee, workload, onStatusToggle }: EmployeeCardProps) {
  return (
    <div data-testid="employee-card" data-employee-id={employee._id}>
      <span data-testid="employee-name">{employee.name}</span>
    </div>
  )
}
