package orchestrator

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/conductor/fleet-commander/internal/logs"
	"github.com/conductor/fleet-commander/internal/models"
	"github.com/conductor/fleet-commander/internal/review"
)

// mockReviewRunner implements ReviewRunner for testing.
type mockReviewRunner struct {
	results []review.CheckResult
	err     error
	called  bool
}

func (m *mockReviewRunner) Run(ctx context.Context, projectRoot string) ([]review.CheckResult, error) {
	m.called = true
	return m.results, m.err
}

// mockLogSink captures log entries for testing.
type mockLogSink struct {
	entries []*logs.LogEntry
}

func (m *mockLogSink) Write(entry *logs.LogEntry) error {
	m.entries = append(m.entries, entry)
	return nil
}

func TestOrchestrator_ReviewRunner_PassingReview(t *testing.T) {
	runner := &mockReviewRunner{
		results: []review.CheckResult{
			{Category: "linter", Status: review.StatusPassed},
			{Category: "typecheck", Status: review.StatusPassed},
			{Category: "test", Status: review.StatusPassed},
		},
	}
	logSink := &mockLogSink{}
	store := &mockIssueStore{}

	o := &Orchestrator{
		reviewRunner: runner,
		logger:       logSink,
		issueStore:   store,
	}

	task := &models.Task{
		ID:          "task-1",
		Description: "Test task",
		Status:      models.StatusTodo,
	}

	o.handleReviewResults("test-project", task, runner.results)

	// Task should remain done (not blocked)
	if task.Status == models.StatusBlocked {
		t.Error("task should not be blocked when review passes")
	}

	// No blocker issues should be created
	store.mu.Lock()
	issueCount := len(store.saved)
	store.mu.Unlock()
	if issueCount > 0 {
		t.Errorf("expected no issues, got %d", issueCount)
	}

	// Should have logged review results
	found := false
	for _, entry := range logSink.entries {
		if entry.Type == logs.TypeCompletion {
			found = true
			break
		}
	}
	if !found {
		t.Error("expected completion log entry for review results")
	}
}

func TestOrchestrator_ReviewRunner_FailingReview(t *testing.T) {
	runner := &mockReviewRunner{
		results: []review.CheckResult{
			{Category: "linter", Status: review.StatusPassed},
			{Category: "typecheck", Status: review.StatusFailed, Errors: []string{"undefined variable x"}},
			{Category: "test", Status: review.StatusPassed},
		},
	}
	logSink := &mockLogSink{}
	store := &mockIssueStore{}

	o := &Orchestrator{
		reviewRunner: runner,
		logger:       logSink,
		issueStore:   store,
	}

	task := &models.Task{
		ID:          "task-2",
		Description: "Test task with review failure",
		Status:      models.StatusTodo,
	}

	o.handleReviewResults("test-project", task, runner.results)

	// Task should be blocked
	if task.Status != models.StatusBlocked {
		t.Errorf("expected task to be blocked, got %s", task.Status)
	}

	// Should have created a blocker issue
	store.mu.Lock()
	issueCount := len(store.saved)
	store.mu.Unlock()
	if issueCount != 1 {
		t.Fatalf("expected 1 blocker issue, got %d", issueCount)
	}

	store.mu.Lock()
	issue := store.saved[0]
	store.mu.Unlock()
	if issue.Type != "blocker" {
		t.Errorf("expected blocker issue, got %s", issue.Type)
	}
	if issue.RelatedTask != "task-2" {
		t.Errorf("expected issue related to task-2, got %s", issue.RelatedTask)
	}
}

func TestOrchestrator_ReviewRunner_NoIssueStore(t *testing.T) {
	runner := &mockReviewRunner{
		results: []review.CheckResult{
			{Category: "linter", Status: review.StatusFailed, Errors: []string{"lint error"}},
		},
	}

	o := &Orchestrator{
		reviewRunner: runner,
		// No issue store configured
	}

	task := &models.Task{
		ID:          "task-3",
		Description: "Test task without issue store",
		Status:      models.StatusTodo,
	}

	// Should not panic even without issue store
	o.handleReviewResults("test-project", task, runner.results)

	// Task should still be blocked
	if task.Status != models.StatusBlocked {
		t.Errorf("expected task to be blocked, got %s", task.Status)
	}
}

func TestOrchestrator_ReviewRunner_TimeoutReview(t *testing.T) {
	runner := &mockReviewRunner{
		results: []review.CheckResult{
			{Category: "linter", Status: review.StatusTimeout, Errors: []string{"command timed out after 120s"}},
		},
	}
	store := &mockIssueStore{}

	o := &Orchestrator{
		reviewRunner: runner,
		issueStore:   store,
	}

	task := &models.Task{
		ID:          "task-4",
		Description: "Test task with timeout",
		Status:      models.StatusTodo,
	}

	o.handleReviewResults("test-project", task, runner.results)

	// Timeout should be treated as failure
	if task.Status != models.StatusBlocked {
		t.Errorf("expected task to be blocked on timeout, got %s", task.Status)
	}

	store.mu.Lock()
	issueCount := len(store.saved)
	store.mu.Unlock()
	if issueCount != 1 {
		t.Errorf("expected 1 blocker issue for timeout, got %d", issueCount)
	}
}

func TestReviewRunnerImpl_Integration(t *testing.T) {
	// Create a temporary project with review.yml
	dir := t.TempDir()
	conductorDir := filepath.Join(dir, "conductor")
	os.MkdirAll(conductorDir, 0755)

	reviewYML := `
linter:
  command: "echo lint-ok"
  enabled: true
typecheck:
  command: "echo type-ok"
  enabled: true
test:
  command: "echo test-ok"
  enabled: true
timeout: 30
`
	os.WriteFile(filepath.Join(conductorDir, "review.yml"), []byte(reviewYML), 0644)

	runner := &ReviewRunnerImpl{}
	results, err := runner.Run(context.Background(), dir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(results) != 3 {
		t.Fatalf("expected 3 results, got %d", len(results))
	}

	for _, r := range results {
		if r.Status != review.StatusPassed {
			t.Errorf("expected %s passed, got %s", r.Category, r.Status)
		}
	}
}

func TestReviewRunnerImpl_NoConfig(t *testing.T) {
	dir := t.TempDir()

	runner := &ReviewRunnerImpl{}
	results, err := runner.Run(context.Background(), dir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if results != nil {
		t.Error("expected nil results when no config exists")
	}
}
