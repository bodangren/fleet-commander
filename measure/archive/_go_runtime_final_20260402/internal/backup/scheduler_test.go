package backup

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestRotateBackups(t *testing.T) {
	backupDir := t.TempDir()

	// Create 5 backup files with staggered modification times
	for i := 0; i < 5; i++ {
		name := filepath.Join(backupDir, "backup-"+string(rune('a'+i))+".zip")
		if err := os.WriteFile(name, []byte("fake zip"), 0644); err != nil {
			t.Fatal(err)
		}
		// Set modification times so they are ordered: a=oldest, e=newest
		modTime := time.Now().Add(time.Duration(i) * time.Minute)
		if err := os.Chtimes(name, modTime, modTime); err != nil {
			t.Fatal(err)
		}
	}

	if err := RotateBackups(backupDir, 3); err != nil {
		t.Fatalf("RotateBackups failed: %v", err)
	}

	entries, err := os.ReadDir(backupDir)
	if err != nil {
		t.Fatal(err)
	}

	remaining := make(map[string]bool)
	for _, e := range entries {
		remaining[e.Name()] = true
	}

	if len(remaining) != 3 {
		t.Errorf("expected 3 backups remaining, got %d", len(remaining))
	}

	// The newest 3 should remain: c, d, e
	if !remaining["backup-c.zip"] {
		t.Error("expected backup-c.zip to remain")
	}
	if !remaining["backup-d.zip"] {
		t.Error("expected backup-d.zip to remain")
	}
	if !remaining["backup-e.zip"] {
		t.Error("expected backup-e.zip to remain")
	}

	// Oldest 2 should be deleted
	if remaining["backup-a.zip"] {
		t.Error("expected backup-a.zip to be deleted")
	}
	if remaining["backup-b.zip"] {
		t.Error("expected backup-b.zip to be deleted")
	}
}

func TestRotateBackups_FewerThanKeep(t *testing.T) {
	backupDir := t.TempDir()

	if err := os.WriteFile(filepath.Join(backupDir, "backup.zip"), []byte("data"), 0644); err != nil {
		t.Fatal(err)
	}

	if err := RotateBackups(backupDir, 5); err != nil {
		t.Fatalf("RotateBackups failed: %v", err)
	}

	entries, err := os.ReadDir(backupDir)
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 1 {
		t.Errorf("expected 1 file remaining, got %d", len(entries))
	}
}

func TestRotateBackups_EmptyDir(t *testing.T) {
	backupDir := t.TempDir()

	if err := RotateBackups(backupDir, 3); err != nil {
		t.Fatalf("RotateBackups failed on empty dir: %v", err)
	}
}

func TestRotateBackups_NonexistentDir(t *testing.T) {
	if err := RotateBackups("/nonexistent/dir", 3); err != nil {
		t.Fatalf("RotateBackups should not fail for nonexistent dir: %v", err)
	}
}

func TestSchedulerStartStop(t *testing.T) {
	measureDir := t.TempDir()
	backupDir := t.TempDir()

	// Create minimal content so backup succeeds
	if err := os.WriteFile(filepath.Join(measureDir, "config.json"), []byte("{}"), 0644); err != nil {
		t.Fatal(err)
	}

	s := NewScheduler(measureDir, backupDir, 5)
	s.Start(50 * time.Millisecond)

	// Wait for at least one backup to fire
	time.Sleep(150 * time.Millisecond)
	s.Stop()

	entries, err := os.ReadDir(backupDir)
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) == 0 {
		t.Error("expected at least one backup to be created by scheduler")
	}
}

func TestSchedulerDoubleStart(t *testing.T) {
	s := NewScheduler(t.TempDir(), t.TempDir(), 5)
	s.Start(time.Hour)
	s.Start(time.Hour) // should be no-op
	s.Stop()
	s.Stop() // should be no-op
}
