package watcher

import (
	"fmt"
	"log"
	"path/filepath"
	"strings"
	"time"

	"github.com/measure/fleet-commander/internal/models"
	"github.com/measure/fleet-commander/internal/parser"
	"github.com/measure/fleet-commander/internal/registry"
	"github.com/fsnotify/fsnotify"
)

type WatcherService struct {
	projectManager *registry.ProjectManager
	watcher        *fsnotify.Watcher
}

func NewWatcherService(pm *registry.ProjectManager) (*WatcherService, error) {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, err
	}

	return &WatcherService{
		projectManager: pm,
		watcher:        watcher,
	}, nil
}

func (ws *WatcherService) WatchProject(projectID string) error {
	project, exists := ws.projectManager.GetProject(projectID)
	if !exists {
		return fmt.Errorf("project not found: %s", projectID)
	}

	measureDir := filepath.Join(project.Path, "measure")
	err := ws.watcher.Add(measureDir)
	if err != nil {
		return fmt.Errorf("failed to watch measure directory: %w", err)
	}

	log.Printf("Watching measure directory for project %s: %s", projectID, measureDir)
	return nil
}

func (ws *WatcherService) Start() {
	go func() {
		for {
			select {
			case event, ok := <-ws.watcher.Events:
				if !ok {
					return
				}
				ws.handleEvent(event)
			case err, ok := <-ws.watcher.Errors:
				if !ok {
					return
				}
				log.Printf("Watcher error: %v", err)
			}
		}
	}()
}

func (ws *WatcherService) handleEvent(event fsnotify.Event) {
	if event.Op&(fsnotify.Write|fsnotify.Create) == 0 {
		return
	}

	filename := filepath.Base(event.Name)

	if filename == "tracks.md" || filename == "plan.md" {
		project := ws.findProjectByPath(event.Name)
		if project != nil {
			log.Printf("File changed: %s in project %s", filename, project.ID)
			ws.updateProjectState(project)
		}
	}
}

func (ws *WatcherService) findProjectByPath(filePath string) *models.Project {
	projects := ws.projectManager.GetAllProjects()

	for _, project := range projects {
		if strings.HasPrefix(filePath, project.Path) {
			return project
		}
	}
	return nil
}

func (ws *WatcherService) updateProjectState(project *models.Project) {
	tracksPath := filepath.Join(project.Path, "measure", "tracks.md")

	tracks, err := parser.ParseTracksRegistry(tracksPath)
	if err != nil {
		log.Printf("Failed to parse tracks.md: %v", err)
		return
	}

	for _, track := range tracks {
		planPath := resolvePlanPath(project.Path, track.PlanPath)
		phases, err := parser.ParsePlan(planPath)
		if err != nil {
			log.Printf("Failed to parse plan.md for track %s: %v", track.ID, err)
			continue
		}
		track.Phases = phases
	}

	project.Tracks = tracks
	project.LastUpdated = time.Now().Unix()
	ws.projectManager.UpdateProject(project)

	log.Printf("Updated project state for %s with %d tracks", project.ID, len(tracks))
}

func resolvePlanPath(projectPath, planPath string) string {
	p := planPath
	if len(p) > 0 && p[len(p)-1] == '/' {
		p = p[:len(p)-1]
	}
	if len(p) < 3 || p[len(p)-3:] != ".md" {
		p = p + "/plan.md"
	}
	if len(p) > 0 && p[0] != '/' {
		p = projectPath + "/measure/" + p
	}
	return p
}

func (ws *WatcherService) Close() error {
	return ws.watcher.Close()
}
