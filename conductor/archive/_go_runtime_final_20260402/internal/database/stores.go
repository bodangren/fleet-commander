package database

// Stores aggregates all database store instances for dependency injection.
type Stores struct {
	Projects      *ProjectStore
	Tasks         *TaskStore
	Issues        *IssueStore
	ExecutionLogs *ExecutionLogStore
	Stats         *StatsStore
	FileSyncer    *FileSyncer
}

// NewStores creates all stores from a database connection.
func NewStores(db *DB) *Stores {
	return &Stores{
		Projects:      NewProjectStore(db),
		Tasks:         NewTaskStore(db),
		Issues:        NewIssueStore(db),
		ExecutionLogs: NewExecutionLogStore(db),
		Stats:         NewStatsStore(db),
		FileSyncer:    NewFileSyncer(db),
	}
}
