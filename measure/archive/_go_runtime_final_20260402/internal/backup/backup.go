package backup

import (
	"archive/zip"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// Manifest is written into every backup zip as manifest.json.
type Manifest struct {
	Timestamp string `json:"timestamp"`
	Version   string `json:"version"`
	Project   string `json:"project,omitempty"`
	FileCount int    `json:"fileCount"`
}

// CreateZipArchive recursively zips srcDir into destZip, embedding a manifest.json.
func CreateZipArchive(srcDir, destZip string) error {
	if err := os.MkdirAll(filepath.Dir(destZip), 0755); err != nil {
		return fmt.Errorf("create backup dir: %w", err)
	}

	f, err := os.Create(destZip)
	if err != nil {
		return fmt.Errorf("create zip file: %w", err)
	}
	defer f.Close()

	w := zip.NewWriter(f)
	defer w.Close()

	fileCount := 0
	err = filepath.Walk(srcDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}

		rel, err := filepath.Rel(srcDir, path)
		if err != nil {
			return fmt.Errorf("compute relative path: %w", err)
		}
		// Normalize to forward slashes in the zip
		rel = filepath.ToSlash(rel)

		header, err := zip.FileInfoHeader(info)
		if err != nil {
			return fmt.Errorf("file info header: %w", err)
		}
		header.Name = rel
		header.Method = zip.Deflate

		writer, err := w.CreateHeader(header)
		if err != nil {
			return fmt.Errorf("create zip entry: %w", err)
		}

		file, err := os.Open(path)
		if err != nil {
			return fmt.Errorf("open file %s: %w", path, err)
		}
		defer file.Close()

		if _, err := io.Copy(writer, file); err != nil {
			return fmt.Errorf("copy file %s: %w", path, err)
		}
		fileCount++
		return nil
	})
	if err != nil {
		return fmt.Errorf("walk directory: %w", err)
	}

	// Write manifest
	manifest := Manifest{
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Version:   "1.0",
		FileCount: fileCount,
	}
	data, err := json.MarshalIndent(manifest, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal manifest: %w", err)
	}
	mw, err := w.Create("manifest.json")
	if err != nil {
		return fmt.Errorf("create manifest entry: %w", err)
	}
	if _, err := mw.Write(data); err != nil {
		return fmt.Errorf("write manifest: %w", err)
	}

	return nil
}

// CreateProjectBackup creates a zip of a project's measure/ directory.
// Returns the path to the created backup file.
func CreateProjectBackup(projectPath, backupDir string) (string, error) {
	measureDir := filepath.Join(projectPath, "measure")
	if _, err := os.Stat(measureDir); os.IsNotExist(err) {
		return "", fmt.Errorf("measure directory not found: %s", measureDir)
	}

	if err := os.MkdirAll(backupDir, 0755); err != nil {
		return "", fmt.Errorf("create backup dir: %w", err)
	}

	projectName := filepath.Base(projectPath)
	ts := time.Now().UTC().Format("2006-01-02T150405")
	filename := fmt.Sprintf("%s-%s.zip", projectName, ts)
	destZip := filepath.Join(backupDir, filename)

	if err := CreateZipArchive(measureDir, destZip); err != nil {
		return "", fmt.Errorf("create project backup: %w", err)
	}

	return destZip, nil
}

// CreateFullBackup creates a zip of the entire measureDir (e.g. ~/.measure/)
// excluding the backups/ subdirectory to avoid recursion.
// Returns the path to the created backup file.
func CreateFullBackup(measureDir, backupDir string) (string, error) {
	if _, err := os.Stat(measureDir); os.IsNotExist(err) {
		return "", fmt.Errorf("measure config directory not found: %s", measureDir)
	}

	if err := os.MkdirAll(backupDir, 0755); err != nil {
		return "", fmt.Errorf("create backup dir: %w", err)
	}

	ts := time.Now().UTC().Format("2006-01-02T150405")
	filename := fmt.Sprintf("full-backup-%s.zip", ts)
	destZip := filepath.Join(backupDir, filename)

	if err := createFullZipExcluding(measureDir, destZip, "backups"); err != nil {
		return "", fmt.Errorf("create full backup: %w", err)
	}

	return destZip, nil
}

// createFullZipExcluding zips srcDir into destZip, skipping directories named excludeDir.
func createFullZipExcluding(srcDir, destZip, excludeDir string) error {
	if err := os.MkdirAll(filepath.Dir(destZip), 0755); err != nil {
		return fmt.Errorf("create backup dir: %w", err)
	}

	f, err := os.Create(destZip)
	if err != nil {
		return fmt.Errorf("create zip file: %w", err)
	}
	defer f.Close()

	w := zip.NewWriter(f)
	defer w.Close()

	fileCount := 0
	err = filepath.Walk(srcDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		rel, err := filepath.Rel(srcDir, path)
		if err != nil {
			return err
		}

		// Skip the excluded directory
		parts := strings.Split(filepath.ToSlash(rel), "/")
		if len(parts) > 0 && parts[0] == excludeDir {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		if info.IsDir() {
			return nil
		}

		header, err := zip.FileInfoHeader(info)
		if err != nil {
			return err
		}
		header.Name = filepath.ToSlash(rel)
		header.Method = zip.Deflate

		writer, err := w.CreateHeader(header)
		if err != nil {
			return err
		}

		file, err := os.Open(path)
		if err != nil {
			return err
		}
		defer file.Close()

		if _, err := io.Copy(writer, file); err != nil {
			return err
		}
		fileCount++
		return nil
	})
	if err != nil {
		return fmt.Errorf("walk directory: %w", err)
	}

	// Write manifest
	manifest := Manifest{
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Version:   "1.0",
		FileCount: fileCount,
	}
	data, err := json.MarshalIndent(manifest, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal manifest: %w", err)
	}
	mw, err := w.Create("manifest.json")
	if err != nil {
		return fmt.Errorf("create manifest entry: %w", err)
	}
	if _, err := mw.Write(data); err != nil {
		return fmt.Errorf("write manifest: %w", err)
	}

	return nil
}
