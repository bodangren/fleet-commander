package backup

import (
	"archive/zip"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// RestoreBackup extracts a backup zip to targetDir. It validates that the zip
// contains a manifest.json. If force is false and targetDir already exists and
// is non-empty, it returns an error.
func RestoreBackup(zipPath, targetDir string, force bool) error {
	if _, err := os.Stat(zipPath); os.IsNotExist(err) {
		return fmt.Errorf("backup file not found: %s", zipPath)
	}

	// Check if targetDir exists and is non-empty
	if !force {
		if entries, err := os.ReadDir(targetDir); err == nil && len(entries) > 0 {
			return fmt.Errorf("target directory %s is not empty; use force to overwrite", targetDir)
		}
	}

	r, err := zip.OpenReader(zipPath)
	if err != nil {
		return fmt.Errorf("open zip: %w", err)
	}
	defer r.Close()

	// Validate manifest exists
	hasManifest := false
	for _, f := range r.File {
		if f.Name == "manifest.json" {
			hasManifest = true
			break
		}
	}
	if !hasManifest {
		return fmt.Errorf("invalid backup: manifest.json not found in archive")
	}

	if err := os.MkdirAll(targetDir, 0755); err != nil {
		return fmt.Errorf("create target dir: %w", err)
	}

	for _, f := range r.File {
		if err := extractZipFile(f, targetDir); err != nil {
			return fmt.Errorf("extract %s: %w", f.Name, err)
		}
	}

	return nil
}

// RestoreProject extracts a project backup zip to a target project directory.
// The zip contents are placed into targetDir directly.
func RestoreProject(zipPath, targetDir string, force bool) error {
	return RestoreBackup(zipPath, targetDir, force)
}

// ReadManifest reads the manifest.json from a backup zip without extracting.
func ReadManifest(zipPath string) (*Manifest, error) {
	r, err := zip.OpenReader(zipPath)
	if err != nil {
		return nil, fmt.Errorf("open zip: %w", err)
	}
	defer r.Close()

	for _, f := range r.File {
		if f.Name == "manifest.json" {
			rc, err := f.Open()
			if err != nil {
				return nil, fmt.Errorf("open manifest: %w", err)
			}
			defer rc.Close()

			var m Manifest
			if err := json.NewDecoder(rc).Decode(&m); err != nil {
				return nil, fmt.Errorf("decode manifest: %w", err)
			}
			return &m, nil
		}
	}
	return nil, fmt.Errorf("manifest.json not found in archive")
}

// extractZipFile extracts a single file from a zip archive to destDir.
func extractZipFile(f *zip.File, destDir string) error {
	// Guard against zip slip
	destPath := filepath.Join(destDir, f.Name)
	if !strings.HasPrefix(filepath.Clean(destPath), filepath.Clean(destDir)+string(os.PathSeparator)) &&
		filepath.Clean(destPath) != filepath.Clean(destDir) {
		return fmt.Errorf("illegal file path in zip: %s", f.Name)
	}

	if f.FileInfo().IsDir() {
		return os.MkdirAll(destPath, 0755)
	}

	if err := os.MkdirAll(filepath.Dir(destPath), 0755); err != nil {
		return fmt.Errorf("create parent dir: %w", err)
	}

	rc, err := f.Open()
	if err != nil {
		return fmt.Errorf("open zip entry: %w", err)
	}
	defer rc.Close()

	out, err := os.Create(destPath)
	if err != nil {
		return fmt.Errorf("create file: %w", err)
	}
	defer out.Close()

	if _, err := io.Copy(out, rc); err != nil {
		return fmt.Errorf("copy content: %w", err)
	}

	return nil
}
