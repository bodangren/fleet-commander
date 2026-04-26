package review

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"gopkg.in/yaml.v3"
)

// ReviewConfig defines the code review commands for a project.
type ReviewConfig struct {
	Linter    CommandConfig `yaml:"linter" json:"linter"`
	TypeCheck CommandConfig `yaml:"typecheck" json:"typecheck"`
	Test      CommandConfig `yaml:"test" json:"test"`
	Timeout   int           `yaml:"timeout" json:"timeout"` // seconds, default 120
}

// CommandConfig defines a single review command.
type CommandConfig struct {
	Command string `yaml:"command" json:"command"`
	Enabled bool   `yaml:"enabled" json:"enabled"`
}

// DefaultTimeout is the default review command timeout.
const DefaultTimeout = 120 * time.Second

// LoadConfig reads measure/review.yml from the project root.
// Returns nil, nil if the file does not exist.
func LoadConfig(projectRoot string) (*ReviewConfig, error) {
	path := filepath.Join(projectRoot, "measure", "review.yml")
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}

	var cfg ReviewConfig
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("parse review.yml: %w", err)
	}

	if cfg.Timeout <= 0 {
		cfg.Timeout = int(DefaultTimeout.Seconds())
	}

	return &cfg, nil
}

// GetTimeout returns the configured timeout as a Duration.
func (c *ReviewConfig) GetTimeout() time.Duration {
	if c.Timeout <= 0 {
		return DefaultTimeout
	}
	return time.Duration(c.Timeout) * time.Second
}
