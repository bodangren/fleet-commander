package logs

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

type Logger struct {
	logsDir   string
	projectID string
	today     string
	file      *os.File
	writer    *bufio.Writer
	mu        sync.Mutex
	retention time.Duration
}

func NewLogger(logsDir, projectID string) *Logger {
	return &Logger{
		logsDir:   logsDir,
		projectID: projectID,
		retention: 30 * 24 * time.Hour,
	}
}

// SetRetention updates the log retention duration. Thread-safe.
func (l *Logger) SetRetention(d time.Duration) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.retention = d
}

func (l *Logger) ensureDir() error {
	if l.logsDir == "" {
		return fmt.Errorf("logs directory not configured")
	}
	return os.MkdirAll(l.logsDir, 0755)
}

func (l *Logger) todayString() string {
	return time.Now().Format("2006-01-02")
}

func (l *Logger) rotationCheck() error {
	today := l.todayString()
	if l.today == today && l.file != nil {
		return nil
	}

	if l.writer != nil {
		l.writer.Flush()
	}
	if l.file != nil {
		l.file.Close()
	}

	l.today = today

	if err := l.ensureDir(); err != nil {
		return err
	}

	filename := fmt.Sprintf("%s.jsonl", today)
	path := filepath.Join(l.logsDir, l.projectID, filename)

	file, err := os.OpenFile(path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return fmt.Errorf("failed to open log file: %w", err)
	}

	l.file = file
	l.writer = bufio.NewWriter(file)

	go l.cleanupOldLogs()

	return nil
}

func (l *Logger) Write(entry *LogEntry) error {
	l.mu.Lock()
	defer l.mu.Unlock()

	if err := l.rotationCheck(); err != nil {
		return err
	}

	data, err := entry.ToJSON()
	if err != nil {
		return fmt.Errorf("failed to marshal log entry: %w", err)
	}

	_, err = l.writer.Write(data)
	if err != nil {
		return fmt.Errorf("failed to write log entry: %w", err)
	}

	_, err = l.writer.Write([]byte("\n"))
	return err
}

func (l *Logger) Flush() {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.writer != nil {
		l.writer.Flush()
	}
}

func (l *Logger) Close() {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.writer != nil {
		l.writer.Flush()
	}
	if l.file != nil {
		l.file.Close()
		l.file = nil
	}
}

func (l *Logger) cleanupOldLogs() {
	if l.logsDir == "" || l.projectID == "" {
		return
	}

	projectDir := filepath.Join(l.logsDir, l.projectID)
	entries, err := os.ReadDir(projectDir)
	if err != nil {
		return
	}

	cutoff := time.Now().Add(-l.retention)

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		info, err := entry.Info()
		if err != nil {
			continue
		}

		if info.ModTime().Before(cutoff) {
			path := filepath.Join(projectDir, entry.Name())
			os.Remove(path)
		}
	}
}

func (l *Logger) ReadByDate(date string) ([]LogEntry, error) {
	if l.logsDir == "" {
		return []LogEntry{}, nil
	}

	path := filepath.Join(l.logsDir, l.projectID, date+".jsonl")
	file, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return []LogEntry{}, nil
		}
		return nil, fmt.Errorf("failed to open log file: %w", err)
	}
	defer file.Close()

	var entries []LogEntry
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		entry, err := LogEntryFromJSON(scanner.Bytes())
		if err != nil {
			continue
		}
		entries = append(entries, *entry)
	}

	return entries, scanner.Err()
}

func (l *Logger) ReadRecent(limit int) ([]LogEntry, error) {
	if l.logsDir == "" {
		return []LogEntry{}, nil
	}

	projectDir := filepath.Join(l.logsDir, l.projectID)
	entries, err := os.ReadDir(projectDir)
	if err != nil {
		return []LogEntry{}, nil
	}

	type fileEntry struct {
		name    string
		modTime time.Time
	}

	var logFiles []fileEntry
	for _, entry := range entries {
		if entry.IsDir() || len(entry.Name()) < 10 {
			continue
		}
		info, _ := entry.Info()
		logFiles = append(logFiles, fileEntry{entry.Name(), info.ModTime()})
	}

	if len(logFiles) == 0 {
		return []LogEntry{}, nil
	}

	var allEntries []LogEntry
	for i := len(logFiles) - 1; i >= 0 && len(allEntries) < limit; i-- {
		date := logFiles[i].name[:10]
		entries, err := l.ReadByDate(date)
		if err != nil {
			continue
		}
		allEntries = append(allEntries, entries...)
	}

	if len(allEntries) > limit {
		allEntries = allEntries[len(allEntries)-limit:]
	}

	return allEntries, nil
}
