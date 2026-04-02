package backup

import (
	"os"
	"path/filepath"
	"testing"
)

func TestRestoreBackup(t *testing.T) {
	// Create a source directory and zip it
	srcDir := t.TempDir()
	if err := os.MkdirAll(filepath.Join(srcDir, "tracks"), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(srcDir, "tracks.md"), []byte("# Tracks"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(srcDir, "tracks", "plan.md"), []byte("# Plan"), 0644); err != nil {
		t.Fatal(err)
	}

	zipDir := t.TempDir()
	zipPath := filepath.Join(zipDir, "backup.zip")
	if err := CreateZipArchive(srcDir, zipPath); err != nil {
		t.Fatalf("create zip: %v", err)
	}

	// Restore to new directory
	targetDir := filepath.Join(t.TempDir(), "restored")
	if err := RestoreBackup(zipPath, targetDir, false); err != nil {
		t.Fatalf("RestoreBackup failed: %v", err)
	}

	// Verify restored files
	data, err := os.ReadFile(filepath.Join(targetDir, "tracks.md"))
	if err != nil {
		t.Fatalf("read restored tracks.md: %v", err)
	}
	if string(data) != "# Tracks" {
		t.Errorf("expected '# Tracks', got %q", string(data))
	}

	data, err = os.ReadFile(filepath.Join(targetDir, "tracks", "plan.md"))
	if err != nil {
		t.Fatalf("read restored tracks/plan.md: %v", err)
	}
	if string(data) != "# Plan" {
		t.Errorf("expected '# Plan', got %q", string(data))
	}
}

func TestRestoreBackup_ConflictWithoutForce(t *testing.T) {
	// Create a zip
	srcDir := t.TempDir()
	if err := os.WriteFile(filepath.Join(srcDir, "file.txt"), []byte("data"), 0644); err != nil {
		t.Fatal(err)
	}

	zipDir := t.TempDir()
	zipPath := filepath.Join(zipDir, "backup.zip")
	if err := CreateZipArchive(srcDir, zipPath); err != nil {
		t.Fatal(err)
	}

	// Create a non-empty target directory
	targetDir := t.TempDir()
	if err := os.WriteFile(filepath.Join(targetDir, "existing.txt"), []byte("old"), 0644); err != nil {
		t.Fatal(err)
	}

	err := RestoreBackup(zipPath, targetDir, false)
	if err == nil {
		t.Fatal("expected error when target is non-empty without force")
	}
}

func TestRestoreBackup_ConflictWithForce(t *testing.T) {
	srcDir := t.TempDir()
	if err := os.WriteFile(filepath.Join(srcDir, "file.txt"), []byte("new data"), 0644); err != nil {
		t.Fatal(err)
	}

	zipDir := t.TempDir()
	zipPath := filepath.Join(zipDir, "backup.zip")
	if err := CreateZipArchive(srcDir, zipPath); err != nil {
		t.Fatal(err)
	}

	// Create a non-empty target directory
	targetDir := t.TempDir()
	if err := os.WriteFile(filepath.Join(targetDir, "existing.txt"), []byte("old"), 0644); err != nil {
		t.Fatal(err)
	}

	err := RestoreBackup(zipPath, targetDir, true)
	if err != nil {
		t.Fatalf("expected force restore to succeed: %v", err)
	}

	// Verify the new file was extracted
	data, err := os.ReadFile(filepath.Join(targetDir, "file.txt"))
	if err != nil {
		t.Fatalf("read restored file: %v", err)
	}
	if string(data) != "new data" {
		t.Errorf("expected 'new data', got %q", string(data))
	}
}

func TestRestoreBackup_MissingFile(t *testing.T) {
	err := RestoreBackup("/nonexistent/backup.zip", t.TempDir(), false)
	if err == nil {
		t.Fatal("expected error for missing backup file")
	}
}

func TestReadManifest(t *testing.T) {
	srcDir := t.TempDir()
	if err := os.WriteFile(filepath.Join(srcDir, "file.txt"), []byte("data"), 0644); err != nil {
		t.Fatal(err)
	}

	zipDir := t.TempDir()
	zipPath := filepath.Join(zipDir, "backup.zip")
	if err := CreateZipArchive(srcDir, zipPath); err != nil {
		t.Fatal(err)
	}

	m, err := ReadManifest(zipPath)
	if err != nil {
		t.Fatalf("ReadManifest failed: %v", err)
	}

	if m.FileCount != 1 {
		t.Errorf("expected FileCount=1, got %d", m.FileCount)
	}
	if m.Version != "1.0" {
		t.Errorf("expected Version=1.0, got %s", m.Version)
	}
}
