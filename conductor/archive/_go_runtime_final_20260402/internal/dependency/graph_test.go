package dependency

import (
	"testing"

	"github.com/conductor/fleet-commander/internal/models"
)

func makeTasks(specs ...struct {
	id   string
	deps []string
	status models.Status
}) []*models.Task {
	tasks := make([]*models.Task, len(specs))
	for i, s := range specs {
		tasks[i] = &models.Task{
			ID:           s.id,
			Description:  "Task " + s.id,
			Status:       s.status,
			Phase:        "phase-1",
			Dependencies: s.deps,
		}
	}
	return tasks
}

func TestBuildGraph_BasicChain(t *testing.T) {
	tasks := makeTasks(
		struct{ id string; deps []string; status models.Status }{"A", nil, models.StatusTodo},
		struct{ id string; deps []string; status models.Status }{"B", []string{"A"}, models.StatusTodo},
		struct{ id string; deps []string; status models.Status }{"C", []string{"B"}, models.StatusTodo},
	)

	g := BuildGraph(tasks)

	if len(g.Nodes) != 3 {
		t.Fatalf("expected 3 nodes, got %d", len(g.Nodes))
	}
	if len(g.Edges) != 2 {
		t.Fatalf("expected 2 edges, got %d", len(g.Edges))
	}
}

func TestBuildGraph_IgnoresMissingDeps(t *testing.T) {
	tasks := makeTasks(
		struct{ id string; deps []string; status models.Status }{"A", []string{"nonexistent"}, models.StatusTodo},
	)

	g := BuildGraph(tasks)
	if len(g.Edges) != 0 {
		t.Fatalf("expected 0 edges for missing dep, got %d", len(g.Edges))
	}
}

func TestHasCycle_NoCycle(t *testing.T) {
	tasks := makeTasks(
		struct{ id string; deps []string; status models.Status }{"A", nil, models.StatusTodo},
		struct{ id string; deps []string; status models.Status }{"B", []string{"A"}, models.StatusTodo},
		struct{ id string; deps []string; status models.Status }{"C", []string{"B"}, models.StatusTodo},
	)

	g := BuildGraph(tasks)
	if g.HasCycle() {
		t.Fatal("expected no cycle")
	}
}

func TestHasCycle_WithCycle(t *testing.T) {
	// Manually build a cycle: A->B->C->A
	tasks := []*models.Task{
		{ID: "A", Description: "A", Status: models.StatusTodo, Phase: "p1", Dependencies: []string{"C"}},
		{ID: "B", Description: "B", Status: models.StatusTodo, Phase: "p1", Dependencies: []string{"A"}},
		{ID: "C", Description: "C", Status: models.StatusTodo, Phase: "p1", Dependencies: []string{"B"}},
	}

	g := BuildGraph(tasks)
	if !g.HasCycle() {
		t.Fatal("expected cycle to be detected")
	}
}

func TestTopologicalSort(t *testing.T) {
	tasks := makeTasks(
		struct{ id string; deps []string; status models.Status }{"A", nil, models.StatusTodo},
		struct{ id string; deps []string; status models.Status }{"B", []string{"A"}, models.StatusTodo},
		struct{ id string; deps []string; status models.Status }{"C", []string{"A"}, models.StatusTodo},
		struct{ id string; deps []string; status models.Status }{"D", []string{"B", "C"}, models.StatusTodo},
	)

	g := BuildGraph(tasks)
	order := g.TopologicalSort()

	if len(order) != 4 {
		t.Fatalf("expected 4 tasks in order, got %d", len(order))
	}

	// A must come before B, C, and D
	pos := make(map[string]int)
	for i, id := range order {
		pos[id] = i
	}

	if pos["A"] >= pos["B"] {
		t.Error("A must come before B")
	}
	if pos["A"] >= pos["C"] {
		t.Error("A must come before C")
	}
	if pos["B"] >= pos["D"] {
		t.Error("B must come before D")
	}
	if pos["C"] >= pos["D"] {
		t.Error("C must come before D")
	}
}

func TestCriticalPath(t *testing.T) {
	// A -> B -> D (length 2)
	// A -> C (length 1)
	tasks := makeTasks(
		struct{ id string; deps []string; status models.Status }{"A", nil, models.StatusTodo},
		struct{ id string; deps []string; status models.Status }{"B", []string{"A"}, models.StatusTodo},
		struct{ id string; deps []string; status models.Status }{"C", []string{"A"}, models.StatusTodo},
		struct{ id string; deps []string; status models.Status }{"D", []string{"B"}, models.StatusTodo},
	)

	g := BuildGraph(tasks)
	cp := g.CriticalPath()

	if len(cp) != 3 {
		t.Fatalf("expected critical path of length 3, got %d: %v", len(cp), cp)
	}
	if cp[0] != "A" || cp[1] != "B" || cp[2] != "D" {
		t.Fatalf("expected [A B D], got %v", cp)
	}
}

func TestCriticalPath_NoDeps(t *testing.T) {
	tasks := makeTasks(
		struct{ id string; deps []string; status models.Status }{"A", nil, models.StatusTodo},
		struct{ id string; deps []string; status models.Status }{"B", nil, models.StatusTodo},
	)

	g := BuildGraph(tasks)
	cp := g.CriticalPath()

	if cp != nil {
		t.Fatalf("expected nil critical path for independent tasks, got %v", cp)
	}
}

func TestValidateNewDependency_OK(t *testing.T) {
	tasks := makeTasks(
		struct{ id string; deps []string; status models.Status }{"A", nil, models.StatusTodo},
		struct{ id string; deps []string; status models.Status }{"B", nil, models.StatusTodo},
	)

	g := BuildGraph(tasks)
	if err := g.ValidateNewDependency("A", "B"); err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

func TestValidateNewDependency_CreatesCycle(t *testing.T) {
	tasks := makeTasks(
		struct{ id string; deps []string; status models.Status }{"A", nil, models.StatusTodo},
		struct{ id string; deps []string; status models.Status }{"B", []string{"A"}, models.StatusTodo},
	)

	g := BuildGraph(tasks)
	err := g.ValidateNewDependency("B", "A")
	if err == nil {
		t.Fatal("expected cycle error")
	}
}

func TestValidateNewDependency_NotFound(t *testing.T) {
	tasks := makeTasks(
		struct{ id string; deps []string; status models.Status }{"A", nil, models.StatusTodo},
	)

	g := BuildGraph(tasks)
	if err := g.ValidateNewDependency("A", "Z"); err == nil {
		t.Fatal("expected error for missing task")
	}
}

func TestGetBlockedTasks(t *testing.T) {
	tasks := makeTasks(
		struct{ id string; deps []string; status models.Status }{"A", nil, models.StatusDone},
		struct{ id string; deps []string; status models.Status }{"B", []string{"A"}, models.StatusTodo},
		struct{ id string; deps []string; status models.Status }{"C", []string{"A", "B"}, models.StatusTodo},
	)

	g := BuildGraph(tasks)
	blocked := g.GetBlockedTasks()

	// B depends on A (done) -> not blocked
	// C depends on A (done) and B (todo) -> blocked
	if len(blocked) != 1 {
		t.Fatalf("expected 1 blocked task, got %d: %v", len(blocked), blocked)
	}
	if blocked[0] != "C" {
		t.Fatalf("expected C to be blocked, got %s", blocked[0])
	}
}

func TestGetBlockedTasks_AllDone(t *testing.T) {
	tasks := makeTasks(
		struct{ id string; deps []string; status models.Status }{"A", nil, models.StatusDone},
		struct{ id string; deps []string; status models.Status }{"B", []string{"A"}, models.StatusDone},
	)

	g := BuildGraph(tasks)
	blocked := g.GetBlockedTasks()

	if len(blocked) != 0 {
		t.Fatalf("expected 0 blocked tasks, got %d", len(blocked))
	}
}
