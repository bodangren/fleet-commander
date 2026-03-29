package dispatcher

import (
	"errors"
	"testing"
	"time"
)

func TestLLMScorerScore(t *testing.T) {
	candidates := []Candidate{
		{ID: "task-1", Title: "Implement user model", Type: TypeTask, AgentTag: "senior-backend"},
		{ID: "task-2", Title: "Fix bug in login", Type: TypeTask, AgentTag: "mid-dev"},
		{ID: "issue-1", Title: "Need clarification", Type: TypeIssue},
	}

	llm := &mockLLMScorer{
		response: "task-1: 9 - Complex backend work\ntask-2: 7 - Moderate priority\nissue-3: 5 - Needs discussion",
	}

	scorer := NewLLMScorer(llm)
	scored, err := scorer.Score(candidates)
	if err != nil {
		t.Errorf("Score error = %v", err)
	}
	if len(scored) != 3 {
		t.Errorf("len(scored) = %d, want 3", len(scored))
	}
}

func TestLLMScorerFallback(t *testing.T) {
	candidates := []Candidate{
		{ID: "task-1", Title: "High priority task", Type: TypeTask},
		{ID: "task-2", Title: "Regular task", Type: TypeTask},
	}

	llm := &mockLLMScorer{
		err: errors.New("LLM unavailable"),
	}

	scorer := NewLLMScorer(llm)
	scored, err := scorer.Score(candidates)
	if err != nil {
		t.Errorf("Score error = %v", err)
	}

	// Fallback should still produce scores
	if len(scored) != 2 {
		t.Errorf("len(scored) = %d, want 2", len(scored))
	}
}

func TestPriorityScorer(t *testing.T) {
	candidates := []Candidate{
		{ID: "task-1", Title: "Implement user model", Type: TypeTask, Priority: 2},
		{ID: "task-2", Title: "Fix bug", Type: TypeTask, Priority: 1},
		{ID: "issue-1", Title: "Blocked", Type: TypeIssue, Priority: 3},
	}

	scorer := &PriorityScorer{}
	scored, err := scorer.Score(candidates)
	if err != nil {
		t.Errorf("Score error = %v", err)
	}

	// Priority scorer should give higher scores to higher priority
	if scored[0].Score < scored[1].Score {
		t.Errorf("Expected higher score for priority 2, got %f vs %f", scored[0].Score, scored[1].Score)
	}
}

func TestScorerCache(t *testing.T) {
	candidates := []Candidate{
		{ID: "task-1", Title: "Task 1", Type: TypeTask},
	}

	llm := &mockLLMScorer{response: "task-1: 8 - Test"}
	scorer := NewLLMScorerWithCache(llm, 50*time.Millisecond)

	// First score
	scored1, err := scorer.Score(candidates)
	if err != nil {
		t.Errorf("first Score error = %v", err)
	}

	// Second score should use cache
	scored2, err := scorer.Score(candidates)
	if err != nil {
		t.Errorf("second Score error = %v", err)
	}

	// Scores should be same
	if scored1[0].Score != scored2[0].Score {
		t.Errorf("cached score = %f, want %f", scored2[0].Score, scored1[0].Score)
	}

	// Wait for cache TTL
	time.Sleep(60 * time.Millisecond)

	// Third score should be fresh (cache expired)
	scored3, err := scorer.Score(candidates)
	if err != nil {
		t.Errorf("third Score error = %v", err)
	}

	// The score should still be there
	if scored3[0].Score != scored1[0].Score {
		t.Errorf("score after cache expiry = %f, want %f", scored3[0].Score, scored1[0].Score)
	}
}

type mockLLMScorer struct {
	response string
	err      error
	called   int
}

func (m *mockLLMScorer) ScoreWithLLM(prompt string) (string, error) {
	m.called++
	if m.err != nil {
		return "", m.err
	}
	return m.response, nil
}
