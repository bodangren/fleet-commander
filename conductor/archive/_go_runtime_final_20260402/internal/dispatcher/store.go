package dispatcher

type CandidateStore interface {
	FetchPendingTasks(projectID string) ([]Candidate, error)
	FetchOpenIssues(projectID string) ([]Candidate, error)
}

type TaskAggregator struct {
	store CandidateStore
}

func NewTaskAggregator(store CandidateStore) *TaskAggregator {
	return &TaskAggregator{store: store}
}

func (a *TaskAggregator) GetCandidates(projectID string) ([]Candidate, error) {
	tasks, err := a.store.FetchPendingTasks(projectID)
	if err != nil {
		return nil, err
	}

	issues, err := a.store.FetchOpenIssues(projectID)
	if err != nil {
		return nil, err
	}

	candidates := make([]Candidate, 0, len(tasks)+len(issues))
	candidates = append(candidates, tasks...)
	candidates = append(candidates, issues...)

	return candidates, nil
}
