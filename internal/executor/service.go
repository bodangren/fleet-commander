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

func (es *ExecutionService) ExecuteTask(projectID, taskID, taskDescription, descriptionPrompt, specContent string, agentTag string) error {
	es.mu.Lock()
	if activeRunner, exists := es.activeRunners[projectID]; exists {
		if activeRunner.GetStatus() == runner.StatusRunning {
			es.mu.Unlock()
			return fmt.Errorf("an agent is already running for project %s", projectID)
		}
		delete(es.activeRunners, projectID)
	}
	es.mu.Unlock()

	command, args, err := es.resolveCommand(agentTag, taskDescription)
	if err != nil {
		return fmt.Errorf("failed to resolve agent command: %w", err)
	}

	cmdRunner := runner.NewCommandRunner(projectID, taskID)

	if err := cmdRunner.Run(command, args); err != nil {
		return fmt.Errorf("failed to run command: %w", err)
	}

	es.mu.Lock()
	es.activeRunners[projectID] = cmdRunner
	es.runnersByTask[fmt.Sprintf("%s:%s", projectID, taskID)] = cmdRunner
	es.mu.Unlock()

	if es.broadcaster != nil {
		go func() {
			for line := range cmdRunner.OutputChannel() {
				es.broadcaster.Broadcast(projectID, line)
			}
		}()
	}

	log.Printf("Started agent execution for task %s in project %s", taskID, projectID)
	return nil
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
