package dispatcher

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHandleGetNextTask(t *testing.T) {
	store := &mockCandidateStore{
		tasks: []Candidate{
			{ID: "task-1", Title: "Implement user model", Type: TypeTask, Priority: 1},
		},
	}
	agg := NewTaskAggregator(store)
	scorer := &PriorityScorer{}
	dispatcher := NewDispatcher(agg, scorer)

	handler := HandleGetNextTask(dispatcher)

	req := httptest.NewRequest(http.MethodGet, "/api/dispatcher/next?projectId=proj-1", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", rr.Code, http.StatusOK)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(rr.Body.Bytes(), &response); err != nil {
		t.Errorf("unmarshal error = %v", err)
	}

	if _, ok := response["id"]; !ok {
		t.Errorf("response missing id field")
	}
}

func TestHandleGetCandidates(t *testing.T) {
	store := &mockCandidateStore{
		tasks: []Candidate{
			{ID: "task-1", Title: "Task 1", Type: TypeTask},
			{ID: "task-2", Title: "Task 2", Type: TypeTask},
		},
	}
	agg := NewTaskAggregator(store)
	scorer := &PriorityScorer{}
	dispatcher := NewDispatcher(agg, scorer)

	handler := HandleGetCandidates(dispatcher)

	req := httptest.NewRequest(http.MethodGet, "/api/dispatcher/candidates?projectId=proj-1", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", rr.Code, http.StatusOK)
	}

	var response struct {
		Candidates []ScoredCandidate `json:"candidates"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &response); err != nil {
		t.Errorf("unmarshal error = %v", err)
	}

	if len(response.Candidates) != 2 {
		t.Errorf("len(candidates) = %d, want 2", len(response.Candidates))
	}
}

func TestHandleGetNextTaskEmpty(t *testing.T) {
	store := &mockCandidateStore{
		tasks:  []Candidate{},
		issues: []Candidate{},
	}
	agg := NewTaskAggregator(store)
	scorer := &PriorityScorer{}
	dispatcher := NewDispatcher(agg, scorer)

	handler := HandleGetNextTask(dispatcher)

	req := httptest.NewRequest(http.MethodGet, "/api/dispatcher/next?projectId=proj-1", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusNoContent {
		t.Errorf("status = %d, want %d", rr.Code, http.StatusNoContent)
	}
}
