package review

import (
	"os"
	"path/filepath"
	"testing"
)

func TestGenerateFileDiff(t *testing.T) {
	dir := t.TempDir()

	// Create a "before" snapshot
	beforeDir := filepath.Join(dir, "before")
	os.MkdirAll(beforeDir, 0755)
	os.WriteFile(filepath.Join(beforeDir, "main.go"), []byte("package main\n\nfunc main() {\n\tprintln(\"hello\")\n}\n"), 0644)

	// Create an "after" snapshot with changes
	afterDir := filepath.Join(dir, "after")
	os.MkdirAll(afterDir, 0755)
	os.WriteFile(filepath.Join(afterDir, "main.go"), []byte("package main\n\nimport \"fmt\"\n\nfunc main() {\n\tfmt.Println(\"hello world\")\n}\n"), 0644)

	diff, err := GenerateFileDiff(beforeDir, afterDir)
	if err != nil {
		t.Fatalf("GenerateFileDiff failed: %v", err)
	}
	if diff == "" {
		t.Fatal("expected non-empty diff")
	}
	if !containsAny(diff, "main.go", "fmt.Println") {
		t.Errorf("diff should contain file name and change, got:\n%s", diff)
	}
}

func TestGenerateFileDiff_NoChanges(t *testing.T) {
	dir := t.TempDir()

	content := []byte("package main\n")
	beforeDir := filepath.Join(dir, "before")
	afterDir := filepath.Join(dir, "after")
	os.MkdirAll(beforeDir, 0755)
	os.MkdirAll(afterDir, 0755)
	os.WriteFile(filepath.Join(beforeDir, "main.go"), content, 0644)
	os.WriteFile(filepath.Join(afterDir, "main.go"), content, 0644)

	diff, err := GenerateFileDiff(beforeDir, afterDir)
	if err != nil {
		t.Fatalf("GenerateFileDiff failed: %v", err)
	}
	if diff != "" {
		t.Errorf("expected empty diff for identical files, got:\n%s", diff)
	}
}

func TestGenerateFileDiff_NewFile(t *testing.T) {
	dir := t.TempDir()

	afterDir := filepath.Join(dir, "after")
	os.MkdirAll(afterDir, 0755)
	os.WriteFile(filepath.Join(afterDir, "new.go"), []byte("package main\n"), 0644)

	diff, err := GenerateFileDiff("", afterDir)
	if err != nil {
		t.Fatalf("GenerateFileDiff failed: %v", err)
	}
	if !containsAny(diff, "new.go") {
		t.Errorf("diff should reference new file, got:\n%s", diff)
	}
}

func TestGenerateFileDiff_DeletedFile(t *testing.T) {
	dir := t.TempDir()

	beforeDir := filepath.Join(dir, "before")
	os.MkdirAll(beforeDir, 0755)
	os.WriteFile(filepath.Join(beforeDir, "old.go"), []byte("package main\n"), 0644)

	diff, err := GenerateFileDiff(beforeDir, "")
	if err != nil {
		t.Fatalf("GenerateFileDiff failed: %v", err)
	}
	if !containsAny(diff, "old.go") {
		t.Errorf("diff should reference deleted file, got:\n%s", diff)
	}
}

func TestGenerateFileDiff_InvalidPaths(t *testing.T) {
	_, err := GenerateFileDiff("/nonexistent/path", "")
	if err == nil {
		t.Error("expected error for invalid before path")
	}
}

func containsAny(s string, substrs ...string) bool {
	for _, sub := range substrs {
		if len(s) > 0 && containsStr(s, sub) {
			return true
		}
	}
	return len(substrs) == 0
}

func containsStr(s, sub string) bool {
	return len(s) >= len(sub) && searchStr(s, sub)
}

func searchStr(s, sub string) bool {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
