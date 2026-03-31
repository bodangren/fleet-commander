package dependency

import (
	"fmt"

	"github.com/conductor/fleet-commander/internal/models"
)

// Node represents a task in the dependency graph.
type Node struct {
	TaskID      string `json:"taskId"`
	Description string `json:"description"`
	Status      string `json:"status"`
	Phase       string `json:"phase"`
}

// Edge represents a dependency relationship.
type Edge struct {
	From string `json:"from"`
	To   string `json:"to"`
}

// Graph is a directed acyclic graph of task dependencies.
type Graph struct {
	Nodes    []Node            `json:"nodes"`
	Edges    []Edge            `json:"edges"`
	adj      map[string][]string
	tasks    map[string]*models.Task
	indegree map[string]int
}

// BuildGraph constructs a dependency graph from a list of tasks.
func BuildGraph(tasks []*models.Task) *Graph {
	g := &Graph{
		adj:      make(map[string][]string),
		tasks:    make(map[string]*models.Task),
		indegree: make(map[string]int),
	}

	for _, task := range tasks {
		g.tasks[task.ID] = task
		g.Nodes = append(g.Nodes, Node{
			TaskID:      task.ID,
			Description: task.Description,
			Status:      string(task.Status),
			Phase:       task.Phase,
		})
		if _, ok := g.indegree[task.ID]; !ok {
			g.indegree[task.ID] = 0
		}
	}

	for _, task := range tasks {
		for _, dep := range task.Dependencies {
			if _, exists := g.tasks[dep]; exists {
				g.adj[dep] = append(g.adj[dep], task.ID)
				g.indegree[task.ID]++
				g.Edges = append(g.Edges, Edge{From: dep, To: task.ID})
			}
		}
	}

	return g
}

// HasCycle returns true if the graph contains a cycle.
func (g *Graph) HasCycle() bool {
	visited := make(map[string]int) // 0=unvisited, 1=in-stack, 2=done
	for id := range g.tasks {
		visited[id] = 0
	}

	var dfs func(id string) bool
	dfs = func(id string) bool {
		visited[id] = 1
		for _, next := range g.adj[id] {
			if visited[next] == 1 {
				return true
			}
			if visited[next] == 0 && dfs(next) {
				return true
			}
		}
		visited[id] = 2
		return false
	}

	for id := range g.tasks {
		if visited[id] == 0 && dfs(id) {
			return true
		}
	}
	return false
}

// TopologicalSort returns tasks in dependency order.
func (g *Graph) TopologicalSort() []string {
	indegree := make(map[string]int)
	for k, v := range g.indegree {
		indegree[k] = v
	}

	var queue []string
	for id, deg := range indegree {
		if deg == 0 {
			queue = append(queue, id)
		}
	}

	var result []string
	for len(queue) > 0 {
		node := queue[0]
		queue = queue[1:]
		result = append(result, node)

		for _, next := range g.adj[node] {
			indegree[next]--
			if indegree[next] == 0 {
				queue = append(queue, next)
			}
		}
	}

	return result
}

// CriticalPath returns the longest chain of dependencies.
func (g *Graph) CriticalPath() []string {
	order := g.TopologicalSort()
	dist := make(map[string]int)
	prev := make(map[string]string)

	for _, id := range order {
		dist[id] = 0
	}

	for _, id := range order {
		for _, next := range g.adj[id] {
			if dist[id]+1 > dist[next] {
				dist[next] = dist[id] + 1
				prev[next] = id
			}
		}
	}

	// Find the node with the longest distance
	var maxNode string
	maxDist := -1
	for id, d := range dist {
		if d > maxDist {
			maxDist = d
			maxNode = id
		}
	}

	if maxDist <= 0 {
		return nil
	}

	// Trace back the path
	var path []string
	for node := maxNode; node != ""; node = prev[node] {
		path = append([]string{node}, path...)
	}

	return path
}

// ValidateNewDependency checks if adding a dependency would create a cycle.
func (g *Graph) ValidateNewDependency(from, to string) error {
	if _, ok := g.tasks[from]; !ok {
		return fmt.Errorf("task %q not found", from)
	}
	if _, ok := g.tasks[to]; !ok {
		return fmt.Errorf("task %q not found", to)
	}

	// Temporarily add edge and check for cycle
	g.adj[from] = append(g.adj[from], to)
	hasCycle := g.HasCycle()
	// Remove the temporary edge
	edges := g.adj[from]
	g.adj[from] = edges[:len(edges)-1]

	if hasCycle {
		return fmt.Errorf("cycle detected: adding dependency %s -> %s would create a cycle", from, to)
	}
	return nil
}

// GetBlockedTasks returns task IDs that have incomplete dependencies.
func (g *Graph) GetBlockedTasks() []string {
	var blocked []string
	for _, task := range g.tasks {
		if len(task.Dependencies) == 0 {
			continue
		}
		for _, dep := range task.Dependencies {
			depTask, ok := g.tasks[dep]
			if !ok || depTask.Status != models.StatusDone {
				blocked = append(blocked, task.ID)
				break
			}
		}
	}
	return blocked
}
