package models

type AgentConfig struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Tag         string   `json:"tag"`
	Command     string   `json:"command"`
	Args        []string `json:"args"`
	DescriptionPrompt string `json:"descriptionPrompt"`  // How to inject task description into command
	SpecPrompt     string   `json:"specPrompt"`         // How to inject spec.md content
}

type AgentExecution struct {
	ProjectID string       `json:"projectId"`
	TaskID    string       `json:"taskId"`
	Agent     AgentConfig  `json:"agent"`
	Status    string       `json:"status"`
	PID       int          `json:"pid,omitempty"`
}