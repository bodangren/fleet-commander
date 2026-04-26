package review

import (
	"context"
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

func TestLoadConfig_NotExists(t *testing.T) {
	cfg, err := LoadConfig("/nonexistent/path")
	if err != nil {
		t.Fatalf("expected nil error for missing file, got %v", err)
	}
	if cfg != nil {
		t.Fatal("expected nil config for missing file")
	}
}

func TestLoadConfig_Valid(t *testing.T) {
	dir := t.TempDir()
	measureDir := filepath.Join(dir, "measure")
	os.MkdirAll(measureDir, 0755)

	yaml := `
linter:
  command: "golangci-lint run"
  enabled: true
typecheck:
  command: "go vet ./..."
  enabled: true
test:
  command: "go test ./..."
  enabled: true
timeout: 60
`
	os.WriteFile(filepath.Join(measureDir, "review.yml"), []byte(yaml), 0644)

	cfg, err := LoadConfig(dir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg == nil {
		t.Fatal("expected config, got nil")
	}
	if cfg.Linter.Command != "golangci-lint run" {
		t.Errorf("expected 'golangci-lint run', got %q", cfg.Linter.Command)
	}
	if cfg.Timeout != 60 {
		t.Errorf("expected timeout 60, got %d", cfg.Timeout)
	}
}

func TestLoadConfig_DefaultTimeout(t *testing.T) {
	dir := t.TempDir()
	measureDir := filepath.Join(dir, "measure")
	os.MkdirAll(measureDir, 0755)

	yaml := `
linter:
  command: "echo ok"
  enabled: true
`
	os.WriteFile(filepath.Join(measureDir, "review.yml"), []byte(yaml), 0644)

	cfg, err := LoadConfig(dir)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.Timeout != 120 {
		t.Errorf("expected default timeout 120, got %d", cfg.Timeout)
	}
}

func TestPipeline_PassingCommand(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("skipping on windows")
	}

	cfg := &ReviewConfig{
		Linter:    CommandConfig{Command: "echo linter-ok", Enabled: true},
		TypeCheck: CommandConfig{Enabled: false},
		Test:      CommandConfig{Enabled: false},
		Timeout:   10,
	}

	p := NewPipeline(cfg, t.TempDir())
	results := p.Run(context.Background())

	if len(results) != 3 {
		t.Fatalf("expected 3 results, got %d", len(results))
	}

	if results[0].Category != "linter" || results[0].Status != StatusPassed {
		t.Errorf("expected linter passed, got %s %s", results[0].Category, results[0].Status)
	}
	if results[1].Status != StatusSkipped {
		t.Errorf("expected typecheck skipped, got %s", results[1].Status)
	}
	if results[2].Status != StatusSkipped {
		t.Errorf("expected test skipped, got %s", results[2].Status)
	}
}

func TestPipeline_FailingCommand(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("skipping on windows")
	}

	cfg := &ReviewConfig{
		Linter:    CommandConfig{Command: "false", Enabled: true},
		TypeCheck: CommandConfig{Enabled: false},
		Test:      CommandConfig{Enabled: false},
		Timeout:   10,
	}

	p := NewPipeline(cfg, t.TempDir())
	results := p.Run(context.Background())

	if results[0].Status != StatusFailed {
		t.Errorf("expected linter failed, got %s", results[0].Status)
	}
}

func TestPipeline_TimeoutCommand(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("skipping on windows")
	}

	cfg := &ReviewConfig{
		Linter:    CommandConfig{Command: "sleep 30", Enabled: true},
		TypeCheck: CommandConfig{Enabled: false},
		Test:      CommandConfig{Enabled: false},
		Timeout:   1, // 1 second timeout
	}

	p := NewPipeline(cfg, t.TempDir())
	results := p.Run(context.Background())

	if results[0].Status != StatusTimeout {
		t.Errorf("expected timeout, got %s", results[0].Status)
	}
}

func TestPipeline_AllEnabled(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("skipping on windows")
	}

	cfg := &ReviewConfig{
		Linter:    CommandConfig{Command: "echo lint-ok", Enabled: true},
		TypeCheck: CommandConfig{Command: "echo type-ok", Enabled: true},
		Test:      CommandConfig{Command: "echo test-ok", Enabled: true},
		Timeout:   10,
	}

	p := NewPipeline(cfg, t.TempDir())
	results := p.Run(context.Background())

	for _, r := range results {
		if r.Status != StatusPassed {
			t.Errorf("expected %s passed, got %s", r.Category, r.Status)
		}
	}
}

func TestGetTimeout(t *testing.T) {
	cfg := &ReviewConfig{Timeout: 30}
	if got := cfg.GetTimeout().Seconds(); got != 30 {
		t.Errorf("expected 30s, got %v", got)
	}

	cfg2 := &ReviewConfig{Timeout: 0}
	if got := cfg2.GetTimeout().Seconds(); got != 120 {
		t.Errorf("expected 120s default, got %v", got)
	}
}
