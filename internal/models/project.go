package models

type Status string

const (
	StatusTodo    Status = "todo"
	StatusDone    Status = "done"
	StatusBlocked Status = "blocked"
	StatusActive  Status = "active"
)

type Task struct {
	ID          string `json:"id"`
	Description string `json:"description"`
	Status      Status `json:"status"`
	AgentTag    string `json:"agentTag,omitempty"`
	Phase       string `json:"phase"`
}

type Phase struct {
	Name  string  `json:"name"`
	Tasks []*Task `json:"tasks"`
}

type Track struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Type        string   `json:"type"`
	Description string   `json:"description"`
	Status      string   `json:"status"`
	PlanPath    string   `json:"planPath"`
	Phases      []*Phase `json:"phases"`
}

type Project struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Path        string   `json:"path"`
	Tracks      []*Track `json:"tracks"`
	LastUpdated int64    `json:"lastUpdated"`
}

// FailureType classifies execution failures for retry decisions.
type FailureType string

const (
	FailureNone     FailureType = ""
	FailureExitCode FailureType = "exit_code"
	FailureTimeout  FailureType = "timeout"
	FailureHarness  FailureType = "harness"
	FailureUnknown  FailureType = "unknown"
)

// ExecutionResult reports the outcome of a dispatched task.
type ExecutionResult struct {
	TaskID      string      `json:"taskId"`
	Status      string      `json:"status"` // "succeeded" or "failed"
	Error       string      `json:"error,omitempty"`
	Duration    int64       `json:"durationMs,omitempty"`
	FailureType FailureType `json:"failureType,omitempty"`
	ExitCode    int         `json:"exitCode,omitempty"`
}
