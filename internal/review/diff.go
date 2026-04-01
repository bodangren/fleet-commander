package review

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// GenerateFileDiff produces a unified diff between two directory snapshots.
// Either beforeDir or afterDir may be empty (for new/deleted files).
// Returns an empty string if there are no differences.
func GenerateFileDiff(beforeDir, afterDir string) (string, error) {
	if beforeDir == "" && afterDir == "" {
		return "", nil
	}

	tmpDir, err := os.MkdirTemp("", "review-diff-*")
	if err != nil {
		return "", fmt.Errorf("create temp dir: %w", err)
	}
	defer os.RemoveAll(tmpDir)

	aPath := filepath.Join(tmpDir, "a")
	bPath := filepath.Join(tmpDir, "b")
	os.MkdirAll(aPath, 0755)
	os.MkdirAll(bPath, 0755)

	if beforeDir != "" {
		if _, err := os.Stat(beforeDir); os.IsNotExist(err) {
			return "", fmt.Errorf("before directory does not exist: %s", beforeDir)
		}
		if err := copyDir(beforeDir, aPath); err != nil {
			return "", fmt.Errorf("copy before dir: %w", err)
		}
	}
	if afterDir != "" {
		if err := copyDir(afterDir, bPath); err != nil {
			return "", fmt.Errorf("copy after dir: %w", err)
		}
	}

	cmd := exec.Command("diff", "-ruN", "a/", "b/")
	cmd.Dir = tmpDir
	output, err := cmd.CombinedOutput()
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok && exitErr.ExitCode() == 1 {
			// Exit code 1 means differences found
			return strings.TrimSpace(string(output)), nil
		}
		return "", fmt.Errorf("diff command failed: %w: %s", err, string(output))
	}

	return "", nil
}

func copyDir(src, dst string) error {
	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		target := filepath.Join(dst, rel)
		if info.IsDir() {
			return os.MkdirAll(target, 0755)
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		return os.WriteFile(target, data, info.Mode())
	})
}
