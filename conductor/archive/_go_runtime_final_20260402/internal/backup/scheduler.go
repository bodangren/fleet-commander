package backup

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"sync"
	"time"
)

// Scheduler runs periodic backups and rotates old ones.
type Scheduler struct {
	conductorDir string
	backupDir    string
	keep         int

	mu      sync.Mutex
	ticker  *time.Ticker
	stopCh  chan struct{}
	running bool
}

// NewScheduler creates a new backup scheduler.
func NewScheduler(conductorDir, backupDir string, keep int) *Scheduler {
	if keep <= 0 {
		keep = 10
	}
	return &Scheduler{
		conductorDir: conductorDir,
		backupDir:    backupDir,
		keep:         keep,
	}
}

// Start begins periodic backups at the given interval.
func (s *Scheduler) Start(interval time.Duration) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.running {
		return
	}

	s.ticker = time.NewTicker(interval)
	s.stopCh = make(chan struct{})
	s.running = true

	go func() {
		for {
			select {
			case <-s.ticker.C:
				path, err := CreateFullBackup(s.conductorDir, s.backupDir)
				if err != nil {
					log.Printf("Scheduled backup failed: %v", err)
					continue
				}
				log.Printf("Scheduled backup created: %s", path)

				if err := RotateBackups(s.backupDir, s.keep); err != nil {
					log.Printf("Backup rotation failed: %v", err)
				}
			case <-s.stopCh:
				return
			}
		}
	}()
}

// Stop halts the periodic backup scheduler.
func (s *Scheduler) Stop() {
	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.running {
		return
	}

	s.ticker.Stop()
	close(s.stopCh)
	s.running = false
}

// RotateBackups keeps only the newest `keep` zip files in backupDir,
// deleting the oldest ones beyond that count.
func RotateBackups(backupDir string, keep int) error {
	entries, err := os.ReadDir(backupDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return fmt.Errorf("read backup dir: %w", err)
	}

	type backupFile struct {
		name    string
		modTime time.Time
	}

	var backups []backupFile
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		if filepath.Ext(entry.Name()) != ".zip" {
			continue
		}
		info, err := entry.Info()
		if err != nil {
			continue
		}
		backups = append(backups, backupFile{
			name:    entry.Name(),
			modTime: info.ModTime(),
		})
	}

	if len(backups) <= keep {
		return nil
	}

	// Sort by modification time, newest first
	sort.Slice(backups, func(i, j int) bool {
		return backups[i].modTime.After(backups[j].modTime)
	})

	// Delete oldest beyond keep count
	for _, b := range backups[keep:] {
		path := filepath.Join(backupDir, b.name)
		if err := os.Remove(path); err != nil {
			log.Printf("Failed to remove old backup %s: %v", path, err)
		}
	}

	return nil
}
