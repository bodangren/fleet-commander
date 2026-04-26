package scanner

import (
	"os"
	"path/filepath"
	"sort"
	"testing"
)

func TestFindConductorProjects(t *testing.T) {
	// Set up a temp directory structure:
	// root/
	//   project-a/measure/
	//   project-b/measure/
	//   project-c/           (no measure)
	//   nested/project-d/measure/
	//   .hidden/measure/   (should be skipped)
	tmpDir := t.TempDir()

	dirs := []string{
		filepath.Join(tmpDir, "project-a", "measure"),
		filepath.Join(tmpDir, "project-b", "measure"),
		filepath.Join(tmpDir, "project-c"),
		filepath.Join(tmpDir, "nested", "project-d", "measure"),
		filepath.Join(tmpDir, ".hidden", "measure"),
	}
	for _, d := range dirs {
		if err := os.MkdirAll(d, 0755); err != nil {
			t.Fatalf("MkdirAll failed: %v", err)
		}
	}

	results := FindConductorProjects(tmpDir)
	sort.Strings(results)

	expected := []string{
		filepath.Join(tmpDir, "nested", "project-d"),
		filepath.Join(tmpDir, "project-a"),
		filepath.Join(tmpDir, "project-b"),
	}

	if len(results) != len(expected) {
		t.Errorf("Expected %d projects, got %d: %v", len(expected), len(results), results)
		return
	}

	for i, r := range results {
		if r != expected[i] {
			t.Errorf("Expected %s, got %s", expected[i], r)
		}
	}
}

func TestFindConductorProjectsEmpty(t *testing.T) {
	tmpDir := t.TempDir()
	results := FindConductorProjects(tmpDir)
	if len(results) != 0 {
		t.Errorf("Expected no projects, got %d", len(results))
	}
}

func TestFindConductorProjectsDepthLimit(t *testing.T) {
	tmpDir := t.TempDir()

	// Create a deep path with 6 levels (beyond limit of 5)
	// root/l1/l2/l3/l4/l5/l6/measure
	deepPath := tmpDir
	for i := 1; i <= 6; i++ {
		deepPath = filepath.Join(deepPath, "l"+string(rune('0'+i)))
	}
	measurePath := filepath.Join(deepPath, "measure")
	if err := os.MkdirAll(measurePath, 0755); err != nil {
		t.Fatalf("MkdirAll failed: %v", err)
	}

	results := FindConductorProjects(tmpDir)
	if len(results) != 0 {
		t.Errorf("Expected no projects (depth limit), got %d: %v", len(results), results)
	}
}

func TestFindConductorProjectsSkipsNodeModules(t *testing.T) {
	tmpDir := t.TempDir()

	// node_modules/some-package/measure should be skipped
	if err := os.MkdirAll(filepath.Join(tmpDir, "node_modules", "pkg", "measure"), 0755); err != nil {
		t.Fatalf("MkdirAll failed: %v", err)
	}
	// real project should be found
	if err := os.MkdirAll(filepath.Join(tmpDir, "my-project", "measure"), 0755); err != nil {
		t.Fatalf("MkdirAll failed: %v", err)
	}

	results := FindConductorProjects(tmpDir)
	if len(results) != 1 || results[0] != filepath.Join(tmpDir, "my-project") {
		t.Errorf("Expected only my-project, got %v", results)
	}
}
