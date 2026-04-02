package models

import (
	"fmt"
	"time"
)

type SprintStatus string

const (
	SprintPlanning  SprintStatus = "planning"
	SprintActive    SprintStatus = "active"
	SprintCompleted SprintStatus = "completed"
)

type Sprint struct {
	ID        string       `json:"id"`
	Name      string       `json:"name"`
	Goal      string       `json:"goal"`
	StartDate string       `json:"startDate"` // YYYY-MM-DD
	EndDate   string       `json:"endDate"`   // YYYY-MM-DD
	Status    SprintStatus `json:"status"`
	TaskIDs   []string     `json:"taskIds"`
	CreatedAt int64        `json:"createdAt"`
	UpdatedAt int64        `json:"updatedAt"`
}

func (s *Sprint) Validate() error {
	if s.Name == "" {
		return fmt.Errorf("sprint name is required")
	}
	if s.StartDate == "" || s.EndDate == "" {
		return fmt.Errorf("start and end dates are required")
	}

	start, err := time.Parse("2006-01-02", s.StartDate)
	if err != nil {
		return fmt.Errorf("invalid start date: %w", err)
	}
	end, err := time.Parse("2006-01-02", s.EndDate)
	if err != nil {
		return fmt.Errorf("invalid end date: %w", err)
	}
	if !end.After(start) {
		return fmt.Errorf("end date must be after start date")
	}
	return nil
}

func (s *Sprint) HasTask(taskID string) bool {
	for _, id := range s.TaskIDs {
		if id == taskID {
			return true
		}
	}
	return false
}

func (s *Sprint) AssignTask(taskID string) {
	if !s.HasTask(taskID) {
		s.TaskIDs = append(s.TaskIDs, taskID)
		s.UpdatedAt = time.Now().Unix()
	}
}

func (s *Sprint) UnassignTask(taskID string) {
	filtered := make([]string, 0, len(s.TaskIDs))
	for _, id := range s.TaskIDs {
		if id != taskID {
			filtered = append(filtered, id)
		}
	}
	s.TaskIDs = filtered
	s.UpdatedAt = time.Now().Unix()
}
