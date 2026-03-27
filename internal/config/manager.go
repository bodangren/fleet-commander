package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// ProjectEntry represents a persisted project record.
type ProjectEntry struct {
	ID   string `json:"id"`
	Path string `json:"path"`
}

// ConfigManager handles reading/writing the global conductor configuration.
type ConfigManager struct {
	configDir  string
	configFile string
}

// NewConfigManager creates a ConfigManager using ~/.conductor as the config dir.
func NewConfigManager() (*ConfigManager, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil, fmt.Errorf("failed to get home directory: %w", err)
	}
	configDir := filepath.Join(homeDir, ".conductor")
	return &ConfigManager{
		configDir:  configDir,
		configFile: filepath.Join(configDir, "projects.json"),
	}, nil
}

// NewConfigManagerWithDir creates a ConfigManager with a custom config directory (for testing).
func NewConfigManagerWithDir(configDir string) *ConfigManager {
	return &ConfigManager{
		configDir:  configDir,
		configFile: filepath.Join(configDir, "projects.json"),
	}
}

// Load reads the projects.json file and returns the list of project entries.
// Returns an empty list if the file doesn't exist.
func (cm *ConfigManager) Load() ([]ProjectEntry, error) {
	if err := os.MkdirAll(cm.configDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create config dir: %w", err)
	}

	data, err := os.ReadFile(cm.configFile)
	if os.IsNotExist(err) {
		return []ProjectEntry{}, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to read projects.json: %w", err)
	}

	var entries []ProjectEntry
	if err := json.Unmarshal(data, &entries); err != nil {
		return nil, fmt.Errorf("failed to parse projects.json: %w", err)
	}
	return entries, nil
}

// Save writes the list of project entries to projects.json atomically.
func (cm *ConfigManager) Save(entries []ProjectEntry) error {
	if err := os.MkdirAll(cm.configDir, 0755); err != nil {
		return fmt.Errorf("failed to create config dir: %w", err)
	}

	data, err := json.MarshalIndent(entries, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal projects: %w", err)
	}

	// Atomic write: write to temp file, then rename.
	tmpFile := cm.configFile + ".tmp"
	if err := os.WriteFile(tmpFile, data, 0644); err != nil {
		return fmt.Errorf("failed to write temp file: %w", err)
	}
	if err := os.Rename(tmpFile, cm.configFile); err != nil {
		os.Remove(tmpFile)
		return fmt.Errorf("failed to rename temp file: %w", err)
	}
	return nil
}

// AddProject adds a project entry if it doesn't already exist, then saves.
func (cm *ConfigManager) AddProject(entry ProjectEntry) error {
	entries, err := cm.Load()
	if err != nil {
		return err
	}
	for _, e := range entries {
		if e.ID == entry.ID || e.Path == entry.Path {
			return nil // already exists
		}
	}
	entries = append(entries, entry)
	return cm.Save(entries)
}

// AddProjects adds multiple project entries and saves once.
func (cm *ConfigManager) AddProjects(newEntries []ProjectEntry) error {
	entries, err := cm.Load()
	if err != nil {
		return err
	}
	existing := make(map[string]bool)
	for _, e := range entries {
		existing[e.Path] = true
	}
	for _, ne := range newEntries {
		if !existing[ne.Path] {
			entries = append(entries, ne)
			existing[ne.Path] = true
		}
	}
	return cm.Save(entries)
}
