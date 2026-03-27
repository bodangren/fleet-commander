package runner

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"os/exec"
	"sync"
)

type ProcessStatus string

const (
	StatusIdle     ProcessStatus = "idle"
	StatusRunning  ProcessStatus = "running"
	StatusStopped  ProcessStatus = "stopped"
	StatusError    ProcessStatus = "error"
)

type OutputLine struct {
	Type    string `json:"type"`  // "stdout" or "stderr"
	Content string `json:"content"`
}

type CommandRunner struct {
	cmd       *exec.Cmd
	ctx       context.Context
	cancel    context.CancelFunc
	status    ProcessStatus
	outputCh  chan OutputLine
	errorCh   chan error
	mu        sync.RWMutex
	projectID string
	taskID    string
}

func NewCommandRunner(projectID, taskID string) *CommandRunner {
	ctx, cancel := context.WithCancel(context.Background())

	return &CommandRunner{
		ctx:       ctx,
		cancel:    cancel,
		status:    StatusIdle,
		outputCh:  make(chan OutputLine, 100),
		errorCh:   make(chan error, 1),
		projectID: projectID,
		taskID:    taskID,
	}
}

func (cr *CommandRunner) Run(command string, args []string) error {
	cr.mu.Lock()
	if cr.status == StatusRunning {
		cr.mu.Unlock()
		return fmt.Errorf("process already running")
	}
	cr.status = StatusRunning
	cr.mu.Unlock()

	cr.cmd = exec.CommandContext(cr.ctx, command, args...)

	stdout, err := cr.cmd.StdoutPipe()
	if err != nil {
		cr.mu.Lock()
		cr.status = StatusError
		cr.mu.Unlock()
		return fmt.Errorf("failed to create stdout pipe: %w", err)
	}

	stderr, err := cr.cmd.StderrPipe()
	if err != nil {
		cr.mu.Lock()
		cr.status = StatusError
		cr.mu.Unlock()
		return fmt.Errorf("failed to create stderr pipe: %w", err)
	}

	if err := cr.cmd.Start(); err != nil {
		cr.mu.Lock()
		cr.status = StatusError
		cr.mu.Unlock()
		return fmt.Errorf("failed to start command: %w", err)
	}

	var wg sync.WaitGroup

	wg.Add(1)
	go func() {
		defer wg.Done()
		cr.readOutput(stdout, "stdout")
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		cr.readOutput(stderr, "stderr")
	}()

	go func() {
		wg.Wait()
		cr.cmd.Wait()
		cr.mu.Lock()
		if cr.status == StatusRunning {
			cr.status = StatusStopped
		}
		cr.mu.Unlock()
		close(cr.outputCh)
	}()

	return nil
}

func (cr *CommandRunner) readOutput(reader io.Reader, outputType string) {
	scanner := bufio.NewScanner(reader)
	for scanner.Scan() {
		line := scanner.Text()
		cr.outputCh <- OutputLine{
			Type:    outputType,
			Content: line,
		}
	}
}

func (cr *CommandRunner) Stop() {
	cr.mu.Lock()
	if cr.status == StatusRunning {
		cr.cancel()
		cr.status = StatusStopped
	}
	cr.mu.Unlock()
}

func (cr *CommandRunner) GetStatus() ProcessStatus {
	cr.mu.RLock()
	defer cr.mu.RUnlock()
	return cr.status
}

func (cr *CommandRunner) OutputChannel() <-chan OutputLine {
	return cr.outputCh
}

func (cr *CommandRunner) ErrorChannel() <-chan error {
	return cr.errorCh
}

func (cr *CommandRunner) GetProjectID() string {
	return cr.projectID
}

func (cr *CommandRunner) GetTaskID() string {
	return cr.taskID
}