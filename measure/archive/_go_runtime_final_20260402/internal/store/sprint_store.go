package store

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/measure/fleet-commander/internal/models"
)

// SprintStore manages sprint persistence in a JSON file.
type SprintStore struct {
	mu       sync.RWMutex
	filePath string
	sprints  map[string]*models.Sprint
}

// NewSprintStore creates a SprintStore backed by a JSON file.
func NewSprintStore(projectPath string) *SprintStore {
	filePath := filepath.Join(projectPath, "measure", "sprints.json")
	s := &SprintStore{
		filePath: filePath,
		sprints:  make(map[string]*models.Sprint),
	}
	s.load()
	return s
}

func (s *SprintStore) load() {
	data, err := os.ReadFile(s.filePath)
	if err != nil {
		return
	}

	var sprints []*models.Sprint
	if err := json.Unmarshal(data, &sprints); err != nil {
		return
	}

	for _, sp := range sprints {
		s.sprints[sp.ID] = sp
	}
}

func (s *SprintStore) save() error {
	sprints := make([]*models.Sprint, 0, len(s.sprints))
	for _, sp := range s.sprints {
		sprints = append(sprints, sp)
	}

	data, err := json.MarshalIndent(sprints, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal sprints: %w", err)
	}

	dir := filepath.Dir(s.filePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	return os.WriteFile(s.filePath, data, 0644)
}

func (s *SprintStore) List() []*models.Sprint {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]*models.Sprint, 0, len(s.sprints))
	for _, sp := range s.sprints {
		result = append(result, sp)
	}
	return result
}

func (s *SprintStore) Get(id string) (*models.Sprint, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	sp, ok := s.sprints[id]
	return sp, ok
}

func (s *SprintStore) Create(sprint *models.Sprint) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if sprint.ID == "" {
		sprint.ID = fmt.Sprintf("sprint-%d", time.Now().UnixMilli())
	}
	if sprint.Status == "" {
		sprint.Status = models.SprintPlanning
	}
	if sprint.TaskIDs == nil {
		sprint.TaskIDs = []string{}
	}
	sprint.CreatedAt = time.Now().Unix()
	sprint.UpdatedAt = sprint.CreatedAt

	if err := sprint.Validate(); err != nil {
		return err
	}

	s.sprints[sprint.ID] = sprint
	return s.save()
}

func (s *SprintStore) Update(sprint *models.Sprint) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.sprints[sprint.ID]; !ok {
		return fmt.Errorf("sprint %s not found", sprint.ID)
	}

	sprint.UpdatedAt = time.Now().Unix()
	s.sprints[sprint.ID] = sprint
	return s.save()
}

func (s *SprintStore) Delete(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	sp, ok := s.sprints[id]
	if !ok {
		return fmt.Errorf("sprint %s not found", id)
	}
	if sp.Status != models.SprintPlanning {
		return fmt.Errorf("can only delete sprints in planning status")
	}

	delete(s.sprints, id)
	return s.save()
}
