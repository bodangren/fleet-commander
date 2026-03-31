package analysis

import (
	"errors"
	"io/fs"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

// ToolConfig describes a single static-analysis tool that the runner can invoke.
type ToolConfig struct {
	Name         string            `yaml:"name"`
	Command      string            `yaml:"command"`
	OutputFormat string            `yaml:"output_format"` // "json" or "text"
	Enabled      bool              `yaml:"enabled"`
	SeverityMap  map[string]string `yaml:"severity_map"` // tool severity -> canonical (error/warning/info)
}

// AnalysisConfig is the top-level configuration loaded from conductor/analysis.yml.
type AnalysisConfig struct {
	Tools []ToolConfig `yaml:"tools"`
}

// LoadConfig reads conductor/analysis.yml relative to projectRoot.
// Returns (nil, nil) when the file does not exist.
func LoadConfig(projectRoot string) (*AnalysisConfig, error) {
	path := filepath.Join(projectRoot, "conductor", "analysis.yml")

	data, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return nil, nil
		}
		return nil, err
	}

	var cfg AnalysisConfig
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}
