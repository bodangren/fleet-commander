import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { EmployeeCard } from '@/components/EmployeeCard'
import type { Employee } from '@/lib/employees'

function createMockEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    _id: 'emp-1',
    name: 'Alice Chen',
    role: 'Senior Developer',
    skills: ['typescript', 'react', 'node.js'],
    model: 'gpt-4',
    status: 'active',
    createdAt: Date.now(),
    ...overrides,
  }
}

describe('EmployeeCard', () => {
  it('renders employee name', () => {
    const employee = createMockEmployee()
    render(<EmployeeCard employee={employee} />)

    expect(screen.getByTestId('employee-name')).toHaveTextContent('Alice Chen')
  })

  it('renders employee role', () => {
    const employee = createMockEmployee()
    render(<EmployeeCard employee={employee} />)

    expect(screen.getByText('Senior Developer')).toBeInTheDocument()
  })

  it('renders model name', () => {
    const employee = createMockEmployee()
    render(<EmployeeCard employee={employee} />)

    expect(screen.getByText('gpt-4')).toBeInTheDocument()
  })

  it('renders skill tags', () => {
    const employee = createMockEmployee()
    render(<EmployeeCard employee={employee} />)

    for (const skill of employee.skills) {
      expect(screen.getByText(skill)).toBeInTheDocument()
    }
  })

  it('renders active status badge', () => {
    const employee = createMockEmployee({ status: 'active' })
    render(<EmployeeCard employee={employee} />)

    expect(screen.getByText('active')).toBeInTheDocument()
  })

  it('renders away status badge', () => {
    const employee = createMockEmployee({ status: 'away' })
    render(<EmployeeCard employee={employee} />)

    expect(screen.getByText('away')).toBeInTheDocument()
  })

  it('renders workload bar when workload is provided', () => {
    const employee = createMockEmployee()
    render(<EmployeeCard employee={employee} workload={3} />)

    expect(screen.getByTestId('workload-bar')).toBeInTheDocument()
    expect(screen.getByTestId('workload-count')).toHaveTextContent('3')
  })

  it('does not render workload bar when workload is undefined', () => {
    const employee = createMockEmployee()
    render(<EmployeeCard employee={employee} />)

    expect(screen.queryByTestId('workload-bar')).not.toBeInTheDocument()
  })

  it('calls onStatusToggle with employee id when status button is clicked', () => {
    const employee = createMockEmployee()
    const onStatusToggle = vi.fn()
    render(<EmployeeCard employee={employee} onStatusToggle={onStatusToggle} />)

    const toggleButton = screen.getByRole('button', { name: /toggle status/i })
    fireEvent.click(toggleButton)

    expect(onStatusToggle).toHaveBeenCalledTimes(1)
    expect(onStatusToggle).toHaveBeenCalledWith('emp-1')
  })

  it('displays zero workload count correctly', () => {
    const employee = createMockEmployee()
    render(<EmployeeCard employee={employee} workload={0} />)

    expect(screen.getByTestId('workload-count')).toHaveTextContent('0')
  })
})
