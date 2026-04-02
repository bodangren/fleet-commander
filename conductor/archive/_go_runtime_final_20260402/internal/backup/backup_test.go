package backup

import (
	"archive/zip"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestCreateZipArchive(t *testing.T) {
	srcDir := t.TempDir()

	// Create sample files
	if err := os.MkdirAll(filepath.Join(srcDir, "sub"), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(srcDir, "file1.txt"), []byte("hello"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(srcDir, "sub", "file2.txt"), []byte("world"), 0644); err != nil {
		t.Fatal(err)
	}

	destDir := t.TempDir()
	destZip := filepath.Join(destDir, "test.zip")

	if err := CreateZipArchive(srcDir, destZip); err != nil {
		t.Fatalf("CreateZipArchive failed: %v", err)
	}

	// Verify the zip contains expected files
	r, err := zip.OpenReader(destZip)
	if err != nil {
		t.Fatalf("open zip: %v", err)
	}
	defer r.Close()

	names := make(map[string]bool)
	for _, f := range r.File {
		names[f.Name] = true
	}

	if !names["file1.txt"] {
		t.Error("expected file1.txt in zip")
	}
	if !names["sub/file2.txt"] {
		t.Error("expected sub/file2.txt in zip")
	}
	if !names["manifest.json"] {
		t.Error("expected manifest.json in zip")
	}

	// Verify manifest content
	for _, f := range r.File {
		if f.Name == "manifest.json" {
			rc, err := f.Open()
			if err != nil {
				t.Fatal(err)
			}
			var m Manifest
			if err := json.NewDecoder(rc).Decode(&m); err != nil {
				t.Fatalf("decode manifest: %v", err)
			}
			rc.Close()

			if m.FileCount != 2 {
				t.Errorf("expected FileCount=2, got %d", m.FileCount)
			}
			if m.Version != "1.0" {
				t.Errorf("expected Version=1.0, got %s", m.Version)
			}
			if m.Timestamp == "" {
				t.Error("expected non-empty Timestamp")
			}
		}
	}
}

func TestCreateProjectBackup(t *testing.T) {
	projectDir := t.TempDir()
	conductorDir := filepath.Join(projectDir, "conductor")
	if err := os.MkdirAll(filepath.Join(conductorDir, "tracks"), 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(conductorDir, "tracks.md"), []byte("# Tracks"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(conductorDir, "tracks", "plan.md"), []byte("# Plan"), 0644); err != nil {
		t.Fatal(err)
	}

	backupDir := t.TempDir()

	zipPath, err := CreateProjectBackup(projectDir, backupDir)
	if err != nil {
		t.Fatalf("CreateProjectBackup failed: %v", err)
	}

	if _, err := os.Stat(zipPath); os.IsNotExist(err) {
		t.Fatalf("backup file not created: %s", zipPath)
	}

	// Verify zip contains the conductor files
	r, err := zip.OpenReader(zipPath)
	if err != nil {
		t.Fatalf("open zip: %v", err)
	}
	defer r.Close()

	names := make(map[string]bool)
	for _, f := range r.File {
		names[f.Name] = true
	}

	if !names["tracks.md"] {
		t.Error("expected tracks.md in backup")
	}
	if !names["tracks/plan.md"] {
		t.Error("expected tracks/plan.md in backup")
	}
	if !names["manifest.json"] {
		t.Error("expected manifest.json in backup")
	}
}

func TestCreateProjectBackup_MissingConductor(t *testing.T) {
	projectDir := t.TempDir()
	backupDir := t.TempDir()

	_, err := CreateProjectBackup(projectDir, backupDir)
	if err == nil {
		t.Fatal("expected error for missing conductor directory")
	}
}

func TestCreateFullBackup(t *testing.T) {
	conductorDir := t.TempDir()

	// Simulate ~/.conductor structure
	if err := os.WriteFile(filepath.Join(conductorDir, "config.json"), []byte(`{}`), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(conductorDir, "projects.json"), []byte(`[]`), 0644); err != nil {
		t.Fatal(err)
	}

	// Create a backups/ dir that should be excluded
	backupsDir := filepath.Join(conductorDir, "backups")
	if err := os.MkdirAll(backupsDir, 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(backupsDir, "old.zip"), []byte("fake"), 0644); err != nil {
		t.Fatal(err)
	}

	destDir := t.TempDir()
	zipPath, err := CreateFullBackup(conductorDir, destDir)
	if err != nil {
		t.Fatalf("CreateFullBackup failed: %v", err)
	}

	r, err := zip.OpenReader(zipPath)
	if err != nil {
		t.Fatalf("open zip: %v", err)
	}
	defer r.Close()

	names := make(map[string]bool)
	for _, f := range r.File {
		names[f.Name] = true
	}

	if !names["config.json"] {
		t.Error("expected config.json in full backup")
	}
	if !names["projects.json"] {
		t.Error("expected projects.json in full backup")
	}
	if names["backups/old.zip"] {
		t.Error("backups/ directory should be excluded from full backup")
	}
	if !names["manifest.json"] {
		t.Error("expected manifest.json in full backup")
	}
}
