package review

import (
	"context"
	"encoding/json"
	"fmt"
	"time"
)

// ReviewRecord stores a single review result for a task.
type ReviewRecord struct {
	ID         string          `json:"id"`
	TaskID     string          `json:"taskId"`
	Status     string          `json:"status"`
	Comments   []ReviewComment `json:"comments"`
	Depth      string          `json:"depth"`
	ReviewedAt int64           `json:"reviewedAt"`
}

// Store persists review results.
type Store struct {
	records map[string][]ReviewRecord
}

// NewStore creates a new in-memory review store.
func NewStore() *Store {
	return &Store{
		records: make(map[string][]ReviewRecord),
	}
}

// Save stores a review result for a task.
func (s *Store) Save(ctx context.Context, taskID string, result *ReviewResult, depth ReviewDepth) error {
	record := ReviewRecord{
		ID:         fmt.Sprintf("review-%s-%d", taskID, time.Now().UnixMilli()),
		TaskID:     taskID,
		Status:     result.Status,
		Comments:   result.Comments,
		Depth:      depth.String(),
		ReviewedAt: time.Now().Unix(),
	}

	s.records[taskID] = append(s.records[taskID], record)
	return nil
}

// GetHistory returns all review records for a task.
func (s *Store) GetHistory(ctx context.Context, taskID string) ([]ReviewRecord, error) {
	records, ok := s.records[taskID]
	if !ok {
		return []ReviewRecord{}, nil
	}
	return records, nil
}

// CreateSubTasks generates sub-task descriptions from review comments.
func CreateSubTasks(taskID string, comments []ReviewComment) []SubTask {
	subTasks := make([]SubTask, 0, len(comments))
	for i, c := range comments {
		subTasks = append(subTasks, SubTask{
			ID:           fmt.Sprintf("%s-review-%d", taskID, i+1),
			ParentTaskID: taskID,
			Description:  fmt.Sprintf("[%s] %s in %s:%d", c.Severity, c.Message, c.File, c.Line),
			Severity:     c.Severity,
		})
	}
	return subTasks
}

// SubTask represents a task created from a review comment.
type SubTask struct {
	ID           string `json:"id"`
	ParentTaskID string `json:"parentTaskId"`
	Description  string `json:"description"`
	Severity     string `json:"severity"`
}

// ApplyReviewResult processes a review result: creates sub-tasks if needed
// and returns whether the parent task should be blocked.
func ApplyReviewResult(taskID string, result *ReviewResult, depth ReviewDepth, store *Store) ([]SubTask, bool, error) {
	if store == nil {
		return nil, false, fmt.Errorf("review store is nil")
	}

	if err := store.Save(context.Background(), taskID, result, depth); err != nil {
		return nil, false, fmt.Errorf("save review result: %w", err)
	}

	if result.Status == "needs-changes" && len(result.Comments) > 0 {
		subTasks := CreateSubTasks(taskID, result.Comments)
		return subTasks, true, nil
	}

	return nil, false, nil
}

// MarshalJSON for ReviewRecord ensures comments are properly serialized.
func (r ReviewRecord) MarshalJSON() ([]byte, error) {
	type Alias ReviewRecord
	return json.Marshal((*Alias)(&r))
}
