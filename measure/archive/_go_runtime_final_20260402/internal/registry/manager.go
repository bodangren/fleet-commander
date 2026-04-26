package registry

import (
	"fmt"
	"path/filepath"
	"sync"

	"github.com/measure/fleet-commander/internal/models"
)

type ProjectManager struct {
	mu       sync.RWMutex
	projects map[string]*models.Project
}

func NewProjectManager() *ProjectManager {
	return &ProjectManager{
		projects: make(map[string]*models.Project),
	}
}

func (pm *ProjectManager) RegisterProject(path string) (*models.Project, error) {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	absPath, err := filepath.Abs(path)
	if err != nil {
		return nil, fmt.Errorf("failed to get absolute path: %w", err)
	}

	projectID := filepath.Base(absPath)

	project := &models.Project{
		ID:          projectID,
		Name:        projectID,
		Path:        absPath,
		Tracks:      []*models.Track{},
		LastUpdated: 0,
		Health:      "healthy",
	}

	pm.projects[projectID] = project
	return project, nil
}

func (pm *ProjectManager) GetProject(id string) (*models.Project, bool) {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	project, exists := pm.projects[id]
	return project, exists
}

func (pm *ProjectManager) GetAllProjects() []*models.Project {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	projects := make([]*models.Project, 0, len(pm.projects))
	for _, project := range pm.projects {
		projects = append(projects, project)
	}
	return projects
}

func (pm *ProjectManager) UpdateProject(project *models.Project) {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	pm.projects[project.ID] = project
}