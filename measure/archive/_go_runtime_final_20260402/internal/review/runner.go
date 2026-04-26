package review

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
)

// Runner executes the review pipeline for a project.
type Runner struct {
	configLoader func(projectRoot string) (*ReviewConfig, error)
}

// NewRunner creates a review pipeline runner.
func NewRunner() *Runner {
	return &Runner{
		configLoader: LoadConfig,
	}
}

// Run loads the review config and executes all enabled checks.
// Returns nil results if no config exists (graceful skip).
func (r *Runner) Run(ctx context.Context, projectRoot string) ([]CheckResult, error) {
	cfg, err := r.configLoader(projectRoot)
	if err != nil {
		return nil, fmt.Errorf("load review config: %w", err)
	}

	if cfg == nil {
		// No review.yml — skip gracefully
		return nil, nil
	}

	pipeline := NewPipeline(cfg, projectRoot)
	results := pipeline.Run(ctx)
	return results, nil
}

// WithConfigLoader overrides the config loader (for testing).
func (r *Runner) WithConfigLoader(loader func(projectRoot string) (*ReviewConfig, error)) *Runner {
	r.configLoader = loader
	return r
}

// HasReviewConfig checks if a project has a review.yml file.
func HasReviewConfig(projectRoot string) bool {
	path := filepath.Join(projectRoot, "measure", "review.yml")
	_, err := os.Stat(path)
	return err == nil
}
