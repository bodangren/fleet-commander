package logs

import (
	"encoding/json"
	"time"
)

type LogType string

const (
	TypeDispatch   LogType = "dispatch"
	TypeScoring    LogType = "scoring"
	TypeExecution  LogType = "execution"
	TypeCompletion LogType = "completion"
	TypeError      LogType = "error"
)

type LogEntry struct {
	Type      LogType     `json:"type"`
	ProjectID string      `json:"projectId"`
	Timestamp time.Time   `json:"timestamp"`
	Data      interface{} `json:"data,omitempty"`
}

type DispatchData struct {
	TaskID    string  `json:"taskId"`
	TaskTitle string  `json:"taskTitle"`
	AgentTag  string  `json:"agentTag"`
	Score     float64 `json:"score"`
	Rationale string  `json:"rationale,omitempty"`
	TaskCount int     `json:"taskCount"`
}

type ScoringData struct {
	Prompt      string `json:"prompt,omitempty"`
	Response    string `json:"response,omitempty"`
	Candidates  int    `json:"candidates"`
	LLMResponse string `json:"llmResponse,omitempty"`
	Fallback    bool   `json:"fallback"`
}

type ExecutionData struct {
	TaskID     string   `json:"taskId"`
	AgentName  string   `json:"agentName"`
	Harness    string   `json:"harness"`
	Command    string   `json:"command"`
	Args       []string `json:"args,omitempty"`
	Output     string   `json:"output,omitempty"`
	Status     string   `json:"status"`
	DurationMs int64    `json:"durationMs"`
}

type CompletionData struct {
	TaskID       string `json:"taskId"`
	Status       string `json:"status"`
	DurationMs   int64  `json:"durationMs"`
	ErrorMessage string `json:"errorMessage,omitempty"`
}

func NewLogEntry(logType LogType, projectID string) *LogEntry {
	return &LogEntry{
		Type:      logType,
		ProjectID: projectID,
		Timestamp: time.Now(),
	}
}

func (e *LogEntry) SetData(data interface{}) {
	e.Data = data
}

func (e *LogEntry) ToJSON() ([]byte, error) {
	return json.Marshal(e)
}

func LogEntryFromJSON(data []byte) (*LogEntry, error) {
	var entry LogEntry
	err := json.Unmarshal(data, &entry)
	return &entry, err
}
