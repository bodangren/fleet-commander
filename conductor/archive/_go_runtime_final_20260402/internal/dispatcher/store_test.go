package dispatcher

import (
	"testing"
)

type mockCandidateStore struct {
	tasks  []Candidate
	issues []Candidate
	err    error
}

func (m *mockCandidateStore) FetchPendingTasks(projectID string) ([]Candidate, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.tasks, nil
}

func (m *mockCandidateStore) FetchOpenIssues(projectID string) ([]Candidate, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.issues, nil
}

func TestCandidateStoreInterface(t *testing.T) {
	store := &mockCandidateStore{
		tasks: []Candidate{
			{ID: "task-1", Title: "Task 1", Type: TypeTask},
			{ID: "task-2", Title: "Task 2", Type: TypeTask},
		},
		issues: []Candidate{
			{ID: "issue-1", Title: "Issue 1", Type: TypeIssue},
		},
	}

	tasks, err := store.FetchPendingTasks("proj-1")
	if err != nil {
		t.Errorf("FetchPendingTasks error = %v", err)
	}
	if len(tasks) != 2 {
		t.Errorf("len(tasks) = %d, want 2", len(tasks))
	}

	issues, err := store.FetchOpenIssues("proj-1")
	if err != nil {
		t.Errorf("FetchOpenIssues error = %v", err)
	}
	if len(issues) != 1 {
		t.Errorf("len(issues) = %d, want 1", len(issues))
	}
}

func TestCandidateStoreError(t *testing.T) {
	testErr := &testError{}
	store := &mockCandidateStore{
		err: testErr,
	}

	var _ CandidateStore = store

	_, err := store.FetchPendingTasks("proj-1")
	if err != testErr {
		t.Errorf("expected error %v, got %v", testErr, err)
	}
}

type testError struct{}

func (e *testError) Error() string {
	return "test error"
}

func TestTaskAggregatorGetCandidates(t *testing.T) {
	store := &mockCandidateStore{
		tasks: []Candidate{
			{ID: "task-1", Title: "Task 1", Type: TypeTask},
		},
		issues: []Candidate{
			{ID: "issue-1", Title: "Issue 1", Type: TypeIssue},
		},
	}

	agg := NewTaskAggregator(store)
	candidates, err := agg.GetCandidates("proj-1")
	if err != nil {
		t.Errorf("GetCandidates error = %v", err)
	}
	if len(candidates) != 2 {
		t.Errorf("len(candidates) = %d, want 2", len(candidates))
	}

	// Verify tasks come first
	if candidates[0].Type != TypeTask {
		t.Errorf("first candidate type = %q, want %q", candidates[0].Type, TypeTask)
	}
	if candidates[1].Type != TypeIssue {
		t.Errorf("second candidate type = %q, want %q", candidates[1].Type, TypeIssue)
	}
}

func TestTaskAggregatorEmpty(t *testing.T) {
	store := &mockCandidateStore{
		tasks:  []Candidate{},
		issues: []Candidate{},
	}

	agg := NewTaskAggregator(store)
	candidates, err := agg.GetCandidates("proj-1")
	if err != nil {
		t.Errorf("GetCandidates error = %v", err)
	}
	if len(candidates) != 0 {
		t.Errorf("len(candidates) = %d, want 0", len(candidates))
	}
}
