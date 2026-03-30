package executor

import (
	"fmt"
	"log"
	"net/http"
	"os/exec"
	"sync"
	"time"

	"github.com/conductor/fleet-commander/internal/agents"
	"github.com/conductor/fleet-commander/internal/harness"
	"github.com/conductor/fleet-commander/internal/models"
	"github.com/conductor/fleet-commander/internal/runner"
	"github.com/gorilla/websocket"
)

type OutputBroadcaster interface {
	Broadcast(projectID string, message any)
}

type outputSubscriber interface {
	Subscribe(projectID string) (<-chan any, func())
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type ExecutionService struct {
	activeRunners map[string]*runner.CommandRunner
	runnersByTask map[string]*runner.CommandRunner
	broadcaster   OutputBroadcaster
	resolver      *AgentHarnessResolver
	mu            sync.RWMutex
}

func NewExecutionService(broadcaster OutputBroadcaster, agentStore *agents.Store, harnessStore *harness.Store) *ExecutionService {
	return &ExecutionService{
		activeRunners: make(map[string]*runner.CommandRunner),
		runnersByTask: make(map[string]*runner.CommandRunner),
		broadcaster:   broadcaster,
		resolver:      NewAgentHarnessResolver(agentStore, harnessStore),
	}
}

func (es *ExecutionService) ExecuteTask(projectID, taskID, taskDescription, descriptionPrompt, specContent string, agentTag string) (<-chan *models.ExecutionResult, error) {
	return es.ExecuteTaskWithTimeout(projectID, taskID, taskDescription, descriptionPrompt, specContent, agentTag, 0)
}

func (es *ExecutionService) ExecuteTaskWithTimeout(projectID, taskID, taskDescription, descriptionPrompt, specContent string, agentTag string, timeout time.Duration) (<-chan *models.ExecutionResult, error) {
	es.mu.Lock()
	if activeRunner, exists := es.activeRunners[projectID]; exists {
		if activeRunner.GetStatus() == runner.StatusRunning {
			es.mu.Unlock()
			return nil, fmt.Errorf("an agent is already running for project %s", projectID)
		}
		delete(es.activeRunners, projectID)
	}
	es.mu.Unlock()

	command, args, err := es.resolveCommand(agentTag, taskDescription)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve agent command: %w", err)
	}

	cmdRunner := runner.NewCommandRunner(projectID, taskID)

	if err := cmdRunner.Run(command, args); err != nil {
		return nil, fmt.Errorf("failed to run command: %w", err)
	}

	es.mu.Lock()
	es.activeRunners[projectID] = cmdRunner
	es.runnersByTask[fmt.Sprintf("%s:%s", projectID, taskID)] = cmdRunner
	es.mu.Unlock()

	log.Printf("Started agent execution for task %s in project %s", taskID, projectID)

	// Single goroutine reads output channel: accumulates lines and broadcasts
	var outputLines []string
	outputDone := make(chan struct{})
	go func() {
		for line := range cmdRunner.OutputChannel() {
			outputLines = append(outputLines, line.Content)
			if es.broadcaster != nil {
				es.broadcaster.Broadcast(projectID, line)
			}
		}
		close(outputDone)
	}()

	resultCh := make(chan *models.ExecutionResult, 1)
	go func() {
		defer close(resultCh)
		execStart := time.Now()
		var timedOut bool

		// Set up timeout if configured
		var timer *time.Timer
		var timerCh <-chan time.Time
		if timeout > 0 {
			timer = time.NewTimer(timeout)
			timerCh = timer.C
			defer timer.Stop()
		}

		// Wait for either completion or timeout
		select {
		case <-outputDone:
			// Process completed normally
		case <-timerCh:
			// Timeout exceeded
			timedOut = true
			cmdRunner.Stop()
			<-outputDone // wait for output channel to close after stop
		}

		duration := time.Since(execStart).Milliseconds()
		result := &models.ExecutionResult{
			TaskID:   taskID,
			Status:   "succeeded",
			Duration: duration,
		}

		if timedOut {
			result.Status = "failed"
			result.FailureType = models.FailureTimeout
			result.Error = fmt.Sprintf("execution timed out after %dms", timeout.Milliseconds())
		} else if status := cmdRunner.GetStatus(); status == runner.StatusError {
			result.Status = "failed"
			exitCode := cmdRunner.GetExitCode()
			result.ExitCode = exitCode
			if exitCode != 0 {
				result.FailureType = models.FailureExitCode
				result.Error = fmt.Sprintf("process exited with code %d", exitCode)
			} else {
				result.FailureType = models.FailureUnknown
				result.Error = "process exited with error"
			}
		}
		_ = outputLines // reserved for Phase 3 issue parsing
		resultCh <- result
	}()

	return resultCh, nil
}

func (es *ExecutionService) resolveCommand(agentTag, taskDescription string) (string, []string, error) {
	if agentTag == "" {
		return "", nil, fmt.Errorf("no agent tag specified for task")
	}

	cmd, args, err := es.resolver.Resolve(agentTag, taskDescription)
	if err != nil {
		return "", nil, fmt.Errorf("failed to resolve agent %q: %w", agentTag, err)
	}

	if cmd == "echo" {
		return "", nil, fmt.Errorf("agent %q could not be resolved to a valid harness", agentTag)
	}

	if _, lookErr := exec.LookPath(cmd); lookErr != nil {
		return "", nil, fmt.Errorf("harness binary %q not found on PATH", cmd)
	}

	return cmd, args, nil
}

func (es *ExecutionService) StopExecution(projectID string) error {
	es.mu.Lock()
	defer es.mu.Unlock()

	if cmdRunner, exists := es.activeRunners[projectID]; exists {
		cmdRunner.Stop()
		taskKey := fmt.Sprintf("%s:%s", projectID, cmdRunner.GetTaskID())
		delete(es.runnersByTask, taskKey)
		delete(es.activeRunners, projectID)
		log.Printf("Stopped agent execution for project %s", projectID)
		return nil
	}

	return fmt.Errorf("no active execution for project %s", projectID)
}

func (es *ExecutionService) GetActiveRunner(projectID string) (*runner.CommandRunner, bool) {
	es.mu.RLock()
	defer es.mu.RUnlock()
	runner, exists := es.activeRunners[projectID]
	return runner, exists
}

func (es *ExecutionService) BroadcastOutput(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}
	defer conn.Close()

	projectID := r.URL.Query().Get("project_id")
	if projectID == "" {
		log.Printf("No project_id in WebSocket request")
		return
	}

	cmdRunner, exists := es.GetActiveRunner(projectID)
	if !exists {
		conn.WriteJSON(map[string]string{"error": "No active execution for project"})
		return
	}

	subscriber, ok := es.broadcaster.(outputSubscriber)
	if !ok {
		conn.WriteJSON(map[string]string{"error": "streaming transport is unavailable"})
		return
	}

	outputCh, unsubscribe := subscriber.Subscribe(projectID)
	defer unsubscribe()

	for {
		select {
		case line, ok := <-outputCh:
			if !ok {
				return
			}

			if err := conn.WriteJSON(line); err != nil {
				log.Printf("WebSocket write error: %v", err)
				return
			}
		case <-time.After(5 * time.Second):
			if cmdRunner.GetStatus() != runner.StatusRunning {
				conn.WriteJSON(map[string]string{"status": "stopped"})
				return
			}
		}
	}
}
