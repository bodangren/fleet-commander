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

// GeneralConfig holds general application settings.
type GeneralConfig struct {
	DefaultAgent         string `json:"defaultAgent"`
	OrchestratorInterval int    `json:"orchestratorInterval"` // seconds
	LogRetentionDays     int    `json:"logRetentionDays"`
}

// HarnessConfig holds harness-related settings.
type HarnessConfig struct {
	CacheTTL       int    `json:"cacheTTL"` // seconds
	DefaultHarness string `json:"defaultHarness"`
}

// WebSocketConfig holds WebSocket connection settings.
type WebSocketConfig struct {
	ReconnectInterval int `json:"reconnectInterval"` // milliseconds
}

// AppConfig is the top-level application configuration.
type AppConfig struct {
	General   GeneralConfig   `json:"general"`
	Harness   HarnessConfig   `json:"harness"`
	WebSocket WebSocketConfig `json:"websocket"`
}

// DefaultAppConfig returns the default configuration.
func DefaultAppConfig() *AppConfig {
	return &AppConfig{
		General: GeneralConfig{
			DefaultAgent:         "",
			OrchestratorInterval: 30,
			LogRetentionDays:     30,
		},
		Harness: HarnessConfig{
			CacheTTL:       300,
			DefaultHarness: "",
		},
		WebSocket: WebSocketConfig{
			ReconnectInterval: 5000,
		},
	}
}

// Validate checks the config for invalid values and returns an error if any.
func (c *AppConfig) Validate() error {
	if c.General.OrchestratorInterval < 0 {
		return fmt.Errorf("orchestrator interval must be non-negative")
	}
	if c.General.LogRetentionDays < 0 {
		return fmt.Errorf("log retention days must be non-negative")
	}
	if c.Harness.CacheTTL < 0 {
		return fmt.Errorf("cache TTL must be non-negative")
	}
	if c.WebSocket.ReconnectInterval < 0 {
		return fmt.Errorf("reconnect interval must be non-negative")
	}
	return nil
}

// Merge applies partial updates from other, preserving unspecified fields.
func (c *AppConfig) Merge(other *AppConfig) {
	if other.General.DefaultAgent != "" {
		c.General.DefaultAgent = other.General.DefaultAgent
	}
	if other.General.OrchestratorInterval != 0 {
		c.General.OrchestratorInterval = other.General.OrchestratorInterval
	}
	if other.General.LogRetentionDays != 0 {
		c.General.LogRetentionDays = other.General.LogRetentionDays
	}
	if other.Harness.CacheTTL != 0 {
		c.Harness.CacheTTL = other.Harness.CacheTTL
	}
	if other.Harness.DefaultHarness != "" {
		c.Harness.DefaultHarness = other.Harness.DefaultHarness
	}
	if other.WebSocket.ReconnectInterval != 0 {
		c.WebSocket.ReconnectInterval = other.WebSocket.ReconnectInterval
	}
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

// LoadAppConfig reads the config.json file. Returns defaults if file doesn't exist.
func (cm *ConfigManager) LoadAppConfig() (*AppConfig, error) {
	if err := os.MkdirAll(cm.configDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create config dir: %w", err)
	}

	configPath := filepath.Join(cm.configDir, "config.json")
	data, err := os.ReadFile(configPath)
	if os.IsNotExist(err) {
		return DefaultAppConfig(), nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to read config.json: %w", err)
	}

	var cfg AppConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("failed to parse config.json: %w", err)
	}
	return &cfg, nil
}

// SaveAppConfig writes the config to config.json atomically.
func (cm *ConfigManager) SaveAppConfig(cfg *AppConfig) error {
	if err := cfg.Validate(); err != nil {
		return fmt.Errorf("invalid config: %w", err)
	}

	if err := os.MkdirAll(cm.configDir, 0755); err != nil {
		return fmt.Errorf("failed to create config dir: %w", err)
	}

	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	configPath := filepath.Join(cm.configDir, "config.json")
	tmpPath := configPath + ".tmp"
	if err := os.WriteFile(tmpPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write temp config: %w", err)
	}
	if err := os.Rename(tmpPath, configPath); err != nil {
		os.Remove(tmpPath)
		return fmt.Errorf("failed to rename temp config: %w", err)
	}
	return nil
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
