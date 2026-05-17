import { Link } from 'react-router-dom'

export interface TaskTimelineLinkProps {
  taskId: string
}

export function TaskTimelineLink({ taskId }: TaskTimelineLinkProps) {
  return (
    <Link to={`/tasks/${taskId}/timeline`} className="text-primary hover:underline">
      timeline
    </Link>
  )
}
