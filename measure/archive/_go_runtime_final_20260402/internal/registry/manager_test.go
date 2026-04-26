package registry

import (
	"testing"

	"github.com/measure/fleet-commander/internal/models"
)

func TestProjectManager(t *testing.T) {
	pm := NewProjectManager()

	project, err := pm.RegisterProject("/test/project")
	if err != nil {
		t.Fatalf("RegisterProject failed: %v", err)
	}

	if project.ID != "project" {
		t.Errorf("Expected project ID 'project', got '%s'", project.ID)
	}

	retrieved, projectExists := pm.GetProject("project")
	if !projectExists {
		t.Error("Project not found after registration")
	}

	if retrieved.ID != project.ID {
		t.Errorf("Retrieved project ID mismatch")
	}

	allProjects := pm.GetAllProjects()
	if len(allProjects) != 1 {
		t.Errorf("Expected 1 project, got %d", len(allProjects))
	}

	updatedProject := &models.Project{
		ID:          "project",
		Name:        "Updated Project",
		Path:        "/test/project",
		Tracks:      []*models.Track{},
		LastUpdated: 1234567890,
	}

	pm.UpdateProject(updatedProject)

	retrieved, _ = pm.GetProject("project")
	if retrieved.Name != "Updated Project" {
		t.Errorf("Project not updated correctly")
	}
}