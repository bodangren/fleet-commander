export type EmployeeStatus = 'active' | 'away'

export type Employee = {
  _id: string
  name: string
  role: string
  skills: string[]
  model: string
  status: EmployeeStatus
  createdAt: number
}
