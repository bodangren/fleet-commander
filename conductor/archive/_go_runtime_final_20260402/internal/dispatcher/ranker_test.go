package dispatcher

import (
	"sort"
	"testing"
	"time"
)

func TestRank(t *testing.T) {
	now := time.Now()
	candidates := []ScoredCandidate{
		{
			Candidate: Candidate{ID: "task-1", Title: "Task 1", AgentTag: "senior-backend"},
			Score:     8.0,
		},
		{
			Candidate: Candidate{ID: "task-2", Title: "Task 2", AgentTag: "junior-dev"},
			Score:     7.0,
		},
		{
			Candidate: Candidate{ID: "task-3", Title: "Task 3", CreatedAt: now.AddDate(0, 0, -3)},
			Score:     6.0,
		},
	}

	ranked := Rank(candidates)

	if ranked[0].Rank != 1 {
		t.Errorf("first rank = %d, want 1", ranked[0].Rank)
	}
	if ranked[1].Rank != 2 {
		t.Errorf("second rank = %d, want 2", ranked[1].Rank)
	}
	if ranked[2].Rank != 3 {
		t.Errorf("third rank = %d, want 3", ranked[2].Rank)
	}

	// Verify descending order by score
	if ranked[0].Score < ranked[1].Score {
		t.Errorf("ranked[0] score %f should be >= ranked[1] score %f", ranked[0].Score, ranked[1].Score)
	}
}

func TestSelectTop(t *testing.T) {
	candidates := []ScoredCandidate{
		{Candidate: Candidate{ID: "task-1"}, Score: 8.0},
		{Candidate: Candidate{ID: "task-2"}, Score: 7.0},
		{Candidate: Candidate{ID: "task-3"}, Score: 6.0},
	}

	top := SelectTop(candidates)

	if top == nil {
		t.Fatal("SelectTop returned nil")
	}
	if top.ID != "task-1" {
		t.Errorf("top.ID = %q, want %q", top.ID, "task-1")
	}
}

func TestSelectTopEmpty(t *testing.T) {
	var candidates []ScoredCandidate

	top := SelectTop(candidates)

	if top != nil {
		t.Errorf("SelectTop with empty slice should return nil, got %v", top)
	}
}

func TestRankWithAgeBoost(t *testing.T) {
	now := time.Now()
	yesterday := now.AddDate(0, 0, -1)
	threeDaysAgo := now.AddDate(0, 0, -3)

	candidates := []ScoredCandidate{
		{Candidate: Candidate{ID: "new", CreatedAt: now}, Score: 5.0},
		{Candidate: Candidate{ID: "old", CreatedAt: threeDaysAgo}, Score: 5.0},
		{Candidate: Candidate{ID: "yesterday", CreatedAt: yesterday}, Score: 5.0},
	}

	ranked := Rank(candidates)

	// The old task (3 days) should rank higher due to age boost
	if ranked[0].ID != "old" {
		t.Errorf("Expected old task to rank highest, got %q", ranked[0].ID)
	}
}

func BenchmarkRank(b *testing.B) {
	candidates := make([]ScoredCandidate, 50)
	for i := range candidates {
		candidates[i] = ScoredCandidate{
			Candidate: Candidate{ID: "task"},
			Score:     float64(i % 10),
		}
	}

	for i := 0; i < b.N; i++ {
		Rank(candidates)
	}
}

func TestRankSort(t *testing.T) {
	candidates := []ScoredCandidate{
		{Candidate: Candidate{ID: "a"}, Score: 5},
		{Candidate: Candidate{ID: "b"}, Score: 3},
		{Candidate: Candidate{ID: "c"}, Score: 8},
		{Candidate: Candidate{ID: "d"}, Score: 1},
	}

	sort.Sort(byScoreDesc(candidates))

	if candidates[0].Score != 8 {
		t.Errorf("Expected highest score first, got %f", candidates[0].Score)
	}
	if candidates[3].Score != 1 {
		t.Errorf("Expected lowest score last, got %f", candidates[3].Score)
	}
}
