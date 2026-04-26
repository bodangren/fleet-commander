package orchestrator

import (
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/measure/fleet-commander/internal/issues"
	"github.com/measure/fleet-commander/internal/models"
	"github.com/measure/fleet-commander/internal/registry"
)

type mockExecutor struct {
	mu        sync.Mutex
	callCount int
	results   []*models.ExecutionResult // returned in order; last one repeats
	calls     []struct{ taskID, taskDesc, agentTag string }
}

func (m *mockExecutor) ExecuteTask(_, taskID, taskDesc, _, _, agentTag string) (<-chan *models.ExecutionResult, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.callCount++
	m.calls = append(m.calls, struct{ taskID, taskDesc, agentTag string }{taskID, taskDesc, agentTag})

	ch := make(chan *models.ExecutionResult, 1)
	idx := m.callCount - 1
	var result *models.ExecutionResult
	if idx < len(m.results) {
		result = m.results[idx]
	} else if len(m.results) > 0 {
		result = m.results[len(m.results)-1]
	} else {
		result = &models.ExecutionResult{TaskID: taskID, Status: "succeeded"}
	}
	ch <- result
	close(ch)
	return ch, nil
}

func (m *mockExecutor) getCallCount() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.callCount
}

type mockIssueStore struct {
	mu    sync.Mutex
	saved []*issues.Issue
}

func (m *mockIssueStore) Save(issue *issues.Issue) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.saved = append(m.saved, issue)
	return nil
}

type mockBroadcaster struct {
	mu       sync.Mutex
	messages []any
}

func (m *mockBroadcaster) Broadcast(_ string, msg any) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.messages = append(m.messages, msg)
}

type mockSelector struct {
	selectedID string
	score      float64
	rationale  string
}

func (m *mockSelector) SelectTask(_ string, project *models.Project) (*models.Task, float64, string) {
	for _, track := range project.Tracks {
		for _, phase := range track.Phases {
			for _, task := range phase.Tasks {
				if task.ID == m.selectedID && task.Status == models.StatusTodo {
					return task, m.score, m.rationale
				}
			}
		}
	}
	return nil, 0, ""
}

func testProject() *models.Project {
	return &models.Project{
		ID:   "test-project",
		Name: "test",
		Path: "/tmp/test-project",
		Tracks: []*models.Track{
			{
				Status: "active",
				Phases: []*models.Phase{
					{
						Name: "Phase 1",
						Tasks: []*models.Task{
							{ID: "t1", Description: "Build feature", Status: models.StatusTodo, AgentTag: "senior-frontend"},
						},
					},
				},
			},
		},
	}
}

func TestRunDelegatesToExecutor(t *testing.T) {
	pm := registry.NewProjectManager()
	project := testProject()
	pm.UpdateProject(project)

	mock := &mockExecutor{}
	orch := New(pm, WithExecutor(mock))

	err := orch.Run("test-project")
	if err != nil {
		t.Fatalf("Run returned error: %v", err)
	}

	if mock.getCallCount() != 1 {
		t.Fatalf("Expected executor to be called once, got %d", mock.getCallCount())
	}
	if mock.calls[0].taskID != "t1" {
		t.Errorf("Expected taskID 't1', got %q", mock.calls[0].taskID)
	}
	if !strings.Contains(mock.calls[0].taskDesc, "Build feature") {
		t.Errorf("Expected taskDesc to contain 'Build feature', got %q", mock.calls[0].taskDesc)
	}
	if mock.calls[0].agentTag != "senior-frontend" {
		t.Errorf("Expected agentTag 'senior-frontend', got %q", mock.calls[0].agentTag)
	}

	updated, _ := pm.GetProject("test-project")
	task := updated.Tracks[0].Phases[0].Tasks[0]
	if task.Status != models.StatusDone {
		t.Errorf("Expected task status 'done', got %q", task.Status)
	}
}

func TestRunWithoutExecutor(t *testing.T) {
	pm := registry.NewProjectManager()
	project := &models.Project{
		ID:   "test-project",
		Name: "test",
		Path: "/tmp/test-project",
		Tracks: []*models.Track{
			{
				Status: "active",
				Phases: []*models.Phase{
					{
						Tasks: []*models.Task{
							{ID: "t1", Description: "Do thing", Status: models.StatusTodo},
						},
					},
				},
			},
		},
	}
	pm.UpdateProject(project)

	orch := New(pm)

	err := orch.Run("test-project")
	if err != nil {
		t.Fatalf("Run returned error: %v", err)
	}

	updated, _ := pm.GetProject("test-project")
	task := updated.Tracks[0].Phases[0].Tasks[0]
	if task.Status != models.StatusDone {
		t.Errorf("Expected task status 'done' even without executor, got %q", task.Status)
	}
}

func TestRunWithTaskSelector(t *testing.T) {
	pm := registry.NewProjectManager()
	project := &models.Project{
		ID:   "test-project",
		Name: "test",
		Path: "/tmp/test-project",
		Tracks: []*models.Track{
			{
				Status: "active",
				Phases: []*models.Phase{
					{
						Name: "Phase 1",
						Tasks: []*models.Task{
							{ID: "t1", Description: "First task", Status: models.StatusTodo, AgentTag: "mid-dev"},
							{ID: "t2", Description: "Second task", Status: models.StatusTodo, AgentTag: "senior-backend"},
						},
					},
				},
			},
		},
	}
	pm.UpdateProject(project)

	mock := &mockExecutor{}
	sel := &mockSelector{selectedID: "t2", score: 8.5, rationale: "High priority backend work"}
	orch := New(pm, WithExecutor(mock), WithTaskSelector(sel))

	err := orch.Run("test-project")
	if err != nil {
		t.Fatalf("Run returned error: %v", err)
	}

	if mock.getCallCount() != 1 {
		t.Fatalf("Expected executor to be called once, got %d", mock.getCallCount())
	}
	if mock.calls[0].taskID != "t2" {
		t.Errorf("Expected taskID 't2' from selector, got %q", mock.calls[0].taskID)
	}
	if mock.calls[0].agentTag != "senior-backend" {
		t.Errorf("Expected agentTag 'senior-backend', got %q", mock.calls[0].agentTag)
	}
}

func TestRunWithSelectorNoCandidates(t *testing.T) {
	pm := registry.NewProjectManager()
	project := &models.Project{
		ID:   "test-project",
		Name: "test",
		Path: "/tmp/test-project",
		Tracks: []*models.Track{
			{
				Status: "active",
				Phases: []*models.Phase{
					{
						Name:  "Phase 1",
						Tasks: []*models.Task{},
					},
				},
			},
		},
	}
	pm.UpdateProject(project)

	sel := &mockSelector{}
	orch := New(pm, WithTaskSelector(sel))

	err := orch.Run("test-project")
	if err == nil {
		t.Fatal("Expected error when selector returns no candidates")
	}
}

func TestRetryThenSuccess(t *testing.T) {
	pm := registry.NewProjectManager()
	project := testProject()
	pm.UpdateProject(project)

	mock := &mockExecutor{
		results: []*models.ExecutionResult{
			{TaskID: "t1", Status: "failed", Error: "crash 1", FailureType: models.FailureExitCode, ExitCode: 1},
			{TaskID: "t1", Status: "failed", Error: "crash 2", FailureType: models.FailureExitCode, ExitCode: 1},
			{TaskID: "t1", Status: "succeeded"},
		},
	}
	// Use short delays for fast tests
	orch := New(pm, WithExecutor(mock), WithRetryConfig(3, 1*time.Millisecond, 10*time.Millisecond))

	err := orch.Run("test-project")
	if err != nil {
		t.Fatalf("Expected success after retries, got error: %v", err)
	}

	if mock.getCallCount() != 3 {
		t.Errorf("Expected 3 executor calls (2 failures + 1 success), got %d", mock.getCallCount())
	}

	updated, _ := pm.GetProject("test-project")
	task := updated.Tracks[0].Phases[0].Tasks[0]
	if task.Status != models.StatusDone {
		t.Errorf("Expected task status 'done', got %q", task.Status)
	}
}

func TestMaxRetriesExhausted(t *testing.T) {
	pm := registry.NewProjectManager()
	project := testProject()
	pm.UpdateProject(project)

	mock := &mockExecutor{
		results: []*models.ExecutionResult{
			{TaskID: "t1", Status: "failed", Error: "crash", FailureType: models.FailureExitCode, ExitCode: 1},
		},
	}
	orch := New(pm, WithExecutor(mock), WithRetryConfig(2, 1*time.Millisecond, 10*time.Millisecond))

	err := orch.Run("test-project")
	if err == nil {
		t.Fatal("Expected error after max retries exhausted")
	}

	// 1 initial + 2 retries = 3 calls
	if mock.getCallCount() != 3 {
		t.Errorf("Expected 3 executor calls (1 initial + 2 retries), got %d", mock.getCallCount())
	}

	updated, _ := pm.GetProject("test-project")
	task := updated.Tracks[0].Phases[0].Tasks[0]
	if task.Status == models.StatusDone {
		t.Error("Task should not be marked done when retries exhausted")
	}
}

func TestBackoffDelay(t *testing.T) {
	o := &Orchestrator{
		baseDelay: 5 * time.Second,
		maxDelay:  60 * time.Second,
	}

	tests := []struct {
		attempt int
		want    time.Duration
	}{
		{1, 10 * time.Second}, // 5 * 2^1 = 10
		{2, 20 * time.Second}, // 5 * 2^2 = 20
		{3, 40 * time.Second}, // 5 * 2^3 = 40
		{4, 60 * time.Second}, // 5 * 2^4 = 80, capped at 60
		{5, 60 * time.Second}, // 5 * 2^5 = 160, capped at 60
	}

	for _, tt := range tests {
		got := o.backoffDelay(tt.attempt)
		if got != tt.want {
			t.Errorf("backoffDelay(%d) = %v, want %v", tt.attempt, got, tt.want)
		}
	}
}

func TestBlockerIssueCreatedOnPermanentFailure(t *testing.T) {
	pm := registry.NewProjectManager()
	project := testProject()
	pm.UpdateProject(project)

	mock := &mockExecutor{
		results: []*models.ExecutionResult{
			{TaskID: "t1", Status: "failed", Error: "harness crashed", FailureType: models.FailureHarness, ExitCode: 2},
		},
	}
	issueStore := &mockIssueStore{}
	orch := New(pm,
		WithExecutor(mock),
		WithIssueStore(issueStore),
		WithRetryConfig(1, 1*time.Millisecond, 10*time.Millisecond),
	)

	_ = orch.Run("test-project")

	if len(issueStore.saved) != 1 {
		t.Fatalf("Expected 1 blocker issue to be created, got %d", len(issueStore.saved))
	}

	issue := issueStore.saved[0]
	if issue.Type != issues.TypeBlocker {
		t.Errorf("Expected issue type 'blocker', got %q", issue.Type)
	}
	if issue.Status != issues.StatusOpen {
		t.Errorf("Expected issue status 'open', got %q", issue.Status)
	}
	if issue.RelatedTask != "t1" {
		t.Errorf("Expected related task 't1', got %q", issue.RelatedTask)
	}
	if issue.ProjectID != "test-project" {
		t.Errorf("Expected project 'test-project', got %q", issue.ProjectID)
	}

	updated, _ := pm.GetProject("test-project")
	task := updated.Tracks[0].Phases[0].Tasks[0]
	if task.Status != models.StatusBlocked {
		t.Errorf("Expected task status 'blocked', got %q", task.Status)
	}
}

func TestStatusBroadcastOnSuccess(t *testing.T) {
	pm := registry.NewProjectManager()
	project := testProject()
	pm.UpdateProject(project)

	mock := &mockExecutor{}
	bc := &mockBroadcaster{}
	orch := New(pm, WithExecutor(mock), WithStatusBroadcaster(bc))

	err := orch.Run("test-project")
	if err != nil {
		t.Fatalf("Run returned error: %v", err)
	}

	// Should have at least "running" and "succeeded" broadcasts
	if len(bc.messages) < 2 {
		t.Fatalf("Expected at least 2 broadcast messages, got %d", len(bc.messages))
	}

	// Check first message is running
	first := bc.messages[0].(map[string]any)
	if first["status"] != "running" {
		t.Errorf("Expected first broadcast 'running', got %q", first["status"])
	}

	// Check last message is succeeded
	last := bc.messages[len(bc.messages)-1].(map[string]any)
	if last["status"] != "succeeded" {
		t.Errorf("Expected last broadcast 'succeeded', got %q", last["status"])
	}
}

func TestStatusBroadcastOnFailure(t *testing.T) {
	pm := registry.NewProjectManager()
	project := testProject()
	pm.UpdateProject(project)

	mock := &mockExecutor{
		results: []*models.ExecutionResult{
			{TaskID: "t1", Status: "failed", Error: "boom", FailureType: models.FailureExitCode},
		},
	}
	bc := &mockBroadcaster{}
	issueStore := &mockIssueStore{}
	orch := New(pm,
		WithExecutor(mock),
		WithStatusBroadcaster(bc),
		WithIssueStore(issueStore),
		WithRetryConfig(0, 1*time.Millisecond, 10*time.Millisecond),
	)

	_ = orch.Run("test-project")

	// Should have "running" then "failed"
	found := false
	for _, msg := range bc.messages {
		m := msg.(map[string]any)
		if m["status"] == "failed" {
			found = true
			break
		}
	}
	if !found {
		t.Error("Expected 'failed' status broadcast")
	}
}

func TestAutoCreateIssuesFromOutput(t *testing.T) {
	pm := registry.NewProjectManager()
	project := testProject()
	pm.UpdateProject(project)

	output := "Done!\n```issue\n{\"title\":\"Found a bug\",\"description\":\"Something broke\",\"severity\":\"high\"}\n```\n"
	mock := &mockExecutor{
		results: []*models.ExecutionResult{
			{TaskID: "t1", Status: "succeeded", Output: output},
		},
	}
	issueStore := &mockIssueStore{}
	orch := New(pm, WithExecutor(mock), WithIssueStore(issueStore))

	err := orch.Run("test-project")
	if err != nil {
		t.Fatalf("Run returned error: %v", err)
	}

	if len(issueStore.saved) != 1 {
		t.Fatalf("Expected 1 auto-created issue, got %d", len(issueStore.saved))
	}

	issue := issueStore.saved[0]
	if issue.Title != "Found a bug" {
		t.Errorf("Issue title = %q, want %q", issue.Title, "Found a bug")
	}
	if issue.Description != "Something broke" {
		t.Errorf("Issue description = %q, want %q", issue.Description, "Something broke")
	}
	if issue.RelatedTask != "t1" {
		t.Errorf("Issue relatedTask = %q, want %q", issue.RelatedTask, "t1")
	}
	if issue.ProjectID != "test-project" {
		t.Errorf("Issue projectId = %q, want %q", issue.ProjectID, "test-project")
	}
}

func TestAutoCreateIssuesBroadcasts(t *testing.T) {
	pm := registry.NewProjectManager()
	project := testProject()
	pm.UpdateProject(project)

	output := "```issue\n{\"title\":\"Broadcast test\",\"description\":\"Should broadcast\"}\n```\n"
	mock := &mockExecutor{
		results: []*models.ExecutionResult{
			{TaskID: "t1", Status: "succeeded", Output: output},
		},
	}
	issueStore := &mockIssueStore{}
	bc := &mockBroadcaster{}
	orch := New(pm, WithExecutor(mock), WithIssueStore(issueStore), WithStatusBroadcaster(bc))

	err := orch.Run("test-project")
	if err != nil {
		t.Fatalf("Run returned error: %v", err)
	}

	// Find issue_created broadcast
	found := false
	for _, msg := range bc.messages {
		m := msg.(map[string]any)
		if m["type"] == "issue_created" {
			found = true
			break
		}
	}
	if !found {
		t.Error("Expected 'issue_created' WebSocket broadcast")
	}
}

func TestAutoCreateIssuesSkipsMalformed(t *testing.T) {
	pm := registry.NewProjectManager()
	project := testProject()
	pm.UpdateProject(project)

	output := "```issue\n{bad json}\n```\n```issue\n{\"title\":\"Good issue\",\"description\":\"Valid\"}\n```\n"
	mock := &mockExecutor{
		results: []*models.ExecutionResult{
			{TaskID: "t1", Status: "succeeded", Output: output},
		},
	}
	issueStore := &mockIssueStore{}
	orch := New(pm, WithExecutor(mock), WithIssueStore(issueStore))

	err := orch.Run("test-project")
	if err != nil {
		t.Fatalf("Run returned error: %v", err)
	}

	// Only the valid issue should be created
	if len(issueStore.saved) != 1 {
		t.Fatalf("Expected 1 auto-created issue (malformed skipped), got %d", len(issueStore.saved))
	}
	if issueStore.saved[0].Title != "Good issue" {
		t.Errorf("Issue title = %q, want %q", issueStore.saved[0].Title, "Good issue")
	}
}
