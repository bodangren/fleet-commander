import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { EmployeesPage } from '@/pages/EmployeesPage'
import type { Employee } from '@/lib/employees'

function createMockEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    _id: `emp-${Math.random().toString(36).slice(2, 5)}`,
    name: 'Demo Employee',
    role: 'Developer',
    skills: ['typescript'],
    model: 'gpt-4',
    status: 'active',
    createdAt: Date.now(),
    ...overrides,
  }
}

describe('EmployeesPage', () => {
  it('renders page title', () => {
    render(<EmployeesPage employees={[]} />)

    expect(screen.getByText('Employee Roster')).toBeInTheDocument()
  })

  it('renders employee cards for each employee', () => {
    const employees = [
      createMockEmployee({ _id: 'emp-1', name: 'Alice' }),
      createMockEmployee({ _id: 'emp-2', name: 'Bob' }),
    ]
    render(<EmployeesPage employees={employees} />)

    expect(screen.getAllByTestId('employee-card')).toHaveLength(2)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('renders empty state when no employees', () => {
    render(<EmployeesPage employees={[]} />)

    expect(screen.getByText(/no employees/i)).toBeInTheDocument()
  })

  it('displays total employee count', () => {
    const employees = [
      createMockEmployee({ _id: 'emp-1' }),
      createMockEmployee({ _id: 'emp-2' }),
      createMockEmployee({ _id: 'emp-3' }),
    ]
    render(<EmployeesPage employees={employees} />)

    expect(screen.getByTestId('employee-count')).toHaveTextContent('3')
  })

  it('filters by skill when skill tag is clicked', () => {
    const employees = [
      createMockEmployee({ _id: 'emp-1', skills: ['typescript', 'react'] }),
      createMockEmployee({ _id: 'emp-2', skills: ['python'] }),
    ]
    const onFilterBySkill = vi.fn()
    render(<EmployeesPage employees={employees} onFilterBySkill={onFilterBySkill} />)

    const skillButton = screen.getByRole('button', { name: 'typescript' })
    fireEvent.click(skillButton)

    expect(onFilterBySkill).toHaveBeenCalledWith('typescript')
  })

  it('shows skill filter buttons for unique skills across all employees', () => {
    const employees = [
      createMockEmployee({ _id: 'emp-1', skills: ['typescript', 'react'] }),
      createMockEmployee({ _id: 'emp-2', skills: ['react', 'node.js'] }),
    ]
    render(<EmployeesPage employees={employees} />)

    expect(screen.getByRole('button', { name: 'typescript' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'react' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'node.js' })).toBeInTheDocument()
  })

  it('renders workload indicator next to each employee card', () => {
    const employees = [createMockEmployee({ _id: 'emp-1' })]
    render(<EmployeesPage employees={employees} />)

    expect(screen.getByTestId('workload-indicator')).toBeInTheDocument()
  })
})
