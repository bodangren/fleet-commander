package runner

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestCommandRunnerUsesWorkingDirectory(t *testing.T) {
	workdir := t.TempDir()
	marker := filepath.Join(workdir, "marker.txt")
	if err := os.WriteFile(marker, []byte("ok"), 0644); err != nil {
		t.Fatalf("failed to write marker file: %v", err)
	}

	runner := NewCommandRunner("project-1", "task-1")
	runner.SetWorkingDirectory(workdir)

	if err := runner.Run("sh", []string{"-c", "pwd"}); err != nil {
		t.Fatalf("Run returned error: %v", err)
	}

	select {
	case line, ok := <-runner.OutputChannel():
		if !ok {
			t.Fatal("output channel closed before emitting working directory")
		}
		if line.Content != workdir {
			t.Fatalf("expected working directory %q, got %q", workdir, line.Content)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for command output")
	}
}
