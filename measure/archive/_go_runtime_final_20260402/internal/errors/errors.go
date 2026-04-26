package errors

import "fmt"

// ParseError represents an error that occurred while parsing a measure file.
type ParseError struct {
	Project string
	File    string
	Cause   error
}

func (e *ParseError) Error() string {
	return fmt.Sprintf("parse error in project %q file %q: %v", e.Project, e.File, e.Cause)
}

func (e *ParseError) Unwrap() error {
	return e.Cause
}

// ExecutionError represents an error that occurred during task execution.
type ExecutionError struct {
	Project string
	TaskID  string
	Type    string // "timeout", "binary_missing", "crash"
	Cause   error
}

func (e *ExecutionError) Error() string {
	return fmt.Sprintf("execution error [%s] in project %q task %q: %v", e.Type, e.Project, e.TaskID, e.Cause)
}

func (e *ExecutionError) Unwrap() error {
	return e.Cause
}

// IsRecoverable returns true if the error is transient and the operation can be retried.
// Parse errors from file-lock or temporary I/O issues are recoverable.
// Execution timeouts and crashes are recoverable; missing binaries are not.
func IsRecoverable(err error) bool {
	if err == nil {
		return false
	}

	switch e := err.(type) {
	case *ParseError:
		// Parse errors from I/O are generally recoverable (file locks, etc.)
		return true
	case *ExecutionError:
		switch e.Type {
		case "timeout", "crash":
			return true
		case "binary_missing":
			return false
		default:
			return false
		}
	default:
		return false
	}
}
