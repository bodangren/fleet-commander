import React from 'react'

interface Props {
  fallback: React.ReactNode
  children: React.ReactNode
}

interface State {
  hasError: boolean
}

export class InsightsErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  override render() {
    if (this.state.hasError) {
      return <div>{this.props.fallback}</div>
    }
    return this.props.children
  }
}
