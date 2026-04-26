package dispatcher

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/measure/fleet-commander/internal/models"
	"github.com/measure/fleet-commander/internal/parser"
)

type Dispatcher struct {
	aggregator *TaskAggregator
	scorer     Scorer
}

func NewDispatcher(agg *TaskAggregator, scorer Scorer) *Dispatcher {
	return &Dispatcher{
		aggregator: agg,
		scorer:     scorer,
	}
}

func (d *Dispatcher) GetNext(projectID string) (*ScoredCandidate, error) {
	candidates, err := d.aggregator.GetCandidates(projectID)
	if err != nil {
		return nil, err
	}

	if len(candidates) == 0 {
		return nil, nil
	}

	scored, err := d.scorer.Score(candidates)
	if err != nil {
		return nil, err
	}

	ranked := Rank(scored)
	if len(ranked) == 0 {
		return nil, nil
	}

	return &ranked[0], nil
}

func (d *Dispatcher) GetCandidates(projectID string) ([]ScoredCandidate, error) {
	candidates, err := d.aggregator.GetCandidates(projectID)
	if err != nil {
		return nil, err
	}

	scored, err := d.scorer.Score(candidates)
	if err != nil {
		return nil, err
	}

	return Rank(scored), nil
}

type DispatcherHandler func(http.ResponseWriter, *http.Request)

func HandleGetNextTask(d *Dispatcher) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		projectID := r.URL.Query().Get("projectId")
		if projectID == "" {
			http.Error(w, "projectId required", http.StatusBadRequest)
			return
		}

		next, err := d.GetNext(projectID)
		if err != nil {
			log.Printf("dispatcher: GetNext error: %v", err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		if next == nil {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(next)
	}
}

func HandleGetCandidates(d *Dispatcher) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		projectID := r.URL.Query().Get("projectId")
		if projectID == "" {
			http.Error(w, "projectId required", http.StatusBadRequest)
			return
		}

		candidates, err := d.GetCandidates(projectID)
		if err != nil {
			log.Printf("dispatcher: GetCandidates error: %v", err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"candidates": candidates,
		})
	}
}

type ProjectExtractor struct {
	projectManager interface {
		GetProject(id string) (*models.Project, bool)
	}
}

func NewProjectExtractor(pm interface {
	GetProject(id string) (*models.Project, bool)
}) *ProjectExtractor {
	return &ProjectExtractor{projectManager: pm}
}

func (pe *ProjectExtractor) FetchPendingTasks(projectID string) ([]Candidate, error) {
	project, _ := pe.projectManager.GetProject(projectID)
	if project == nil {
		return []Candidate{}, nil
	}

	var tasks []Candidate
	for _, track := range project.Tracks {
		if track.Status == "done" {
			continue
		}
		for _, phase := range track.Phases {
			for _, task := range phase.Tasks {
				if task.Status != models.StatusTodo {
					continue
				}
				planPath := parser.ResolvePlanPath(project.Path, track.PlanPath)
				tasks = append(tasks, Candidate{
					ID:        task.ID,
					Title:     task.Description,
					Type:      TypeTask,
					Priority:  scoreFromDescription(task.Description),
					CreatedAt: time.Now(),
					ProjectID: projectID,
					PlanPath:  planPath,
					AgentTag:  task.AgentTag,
				})
			}
		}
	}
	return tasks, nil
}

func (pe *ProjectExtractor) FetchOpenIssues(projectID string) ([]Candidate, error) {
	return []Candidate{}, nil
}

func scoreFromDescription(desc string) int {
	desc = strings.ToLower(desc)
	if strings.Contains(desc, "priority:high") || strings.Contains(desc, "high priority") {
		return 2
	}
	if strings.Contains(desc, "priority:low") {
		return 0
	}
	return 1
}
