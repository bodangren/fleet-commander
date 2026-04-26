package store

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/measure/fleet-commander/internal/models"
)

func setupTestStore(t *testing.T) *SprintStore {
	t.Helper()
	dir := t.TempDir()
	os.MkdirAll(filepath.Join(dir, "measure"), 0755)
	return NewSprintStore(dir)
}

func TestSprintStoreCRUD(t *testing.T) {
	store := setupTestStore(t)

	sprint := &models.Sprint{
		Name:      "Sprint 1",
		Goal:      "Complete Phase 1",
		StartDate: "2026-04-01",
		EndDate:   "2026-04-14",
	}

	// Create
	if err := store.Create(sprint); err != nil {
		t.Fatalf("Create() error: %v", err)
	}
	if sprint.ID == "" {
		t.Fatal("expected sprint ID to be set")
	}
	if sprint.Status != models.SprintPlanning {
		t.Errorf("expected planning status, got %s", sprint.Status)
	}

	// List
	sprints := store.List()
	if len(sprints) != 1 {
		t.Fatalf("expected 1 sprint, got %d", len(sprints))
	}

	// Get
	got, ok := store.Get(sprint.ID)
	if !ok {
		t.Fatal("expected sprint to be found")
	}
	if got.Name != "Sprint 1" {
		t.Errorf("expected 'Sprint 1', got %q", got.Name)
	}

	// Update
	got.Goal = "Updated goal"
	if err := store.Update(got); err != nil {
		t.Fatalf("Update() error: %v", err)
	}
	updated, _ := store.Get(sprint.ID)
	if updated.Goal != "Updated goal" {
		t.Errorf("expected updated goal")
	}

	// Delete
	if err := store.Delete(sprint.ID); err != nil {
		t.Fatalf("Delete() error: %v", err)
	}
	if sprints := store.List(); len(sprints) != 0 {
		t.Errorf("expected 0 sprints after delete, got %d", len(sprints))
	}
}

func TestSprintStoreValidation(t *testing.T) {
	store := setupTestStore(t)

	// Missing name
	err := store.Create(&models.Sprint{
		StartDate: "2026-04-01",
		EndDate:   "2026-04-14",
	})
	if err == nil {
		t.Fatal("expected error for missing name")
	}

	// End before start
	err = store.Create(&models.Sprint{
		Name:      "Bad Sprint",
		StartDate: "2026-04-14",
		EndDate:   "2026-04-01",
	})
	if err == nil {
		t.Fatal("expected error for end before start")
	}
}

func TestSprintStoreDeleteOnlyPlanning(t *testing.T) {
	store := setupTestStore(t)

	sprint := &models.Sprint{
		Name:      "Active Sprint",
		StartDate: "2026-04-01",
		EndDate:   "2026-04-14",
		Status:    models.SprintActive,
	}
	store.Create(sprint)

	err := store.Delete(sprint.ID)
	if err == nil {
		t.Fatal("expected error when deleting active sprint")
	}
}

func TestSprintStoreTaskAssignment(t *testing.T) {
	sprint := &models.Sprint{
		ID:      "s1",
		Name:    "Test",
		TaskIDs: []string{},
	}

	sprint.AssignTask("task-1")
	if !sprint.HasTask("task-1") {
		t.Fatal("expected task-1 to be assigned")
	}

	sprint.AssignTask("task-1") // duplicate
	if len(sprint.TaskIDs) != 1 {
		t.Fatal("expected no duplicate assignment")
	}

	sprint.UnassignTask("task-1")
	if sprint.HasTask("task-1") {
		t.Fatal("expected task-1 to be unassigned")
	}
}

func TestSprintStorePersistence(t *testing.T) {
	dir := t.TempDir()
	os.MkdirAll(filepath.Join(dir, "measure"), 0755)

	store1 := NewSprintStore(dir)
	store1.Create(&models.Sprint{
		Name:      "Persisted Sprint",
		StartDate: "2026-04-01",
		EndDate:   "2026-04-14",
	})

	// Create new store from same directory — should load persisted data
	store2 := NewSprintStore(dir)
	sprints := store2.List()
	if len(sprints) != 1 {
		t.Fatalf("expected 1 sprint after reload, got %d", len(sprints))
	}
	if sprints[0].Name != "Persisted Sprint" {
		t.Errorf("expected 'Persisted Sprint', got %q", sprints[0].Name)
	}
}
