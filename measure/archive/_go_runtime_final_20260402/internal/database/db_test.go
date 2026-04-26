package database

import (
	"database/sql"
	"os"
	"path/filepath"
	"testing"
)

func TestNewDatabase(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "test.db")

	db, err := New(dbPath)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		t.Fatalf("Ping() error = %v", err)
	}
}

func TestNewDatabaseCreatesTables(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "test.db")

	db, err := New(dbPath)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}
	defer db.Close()

	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM sqlite_master WHERE type='table'").Scan(&count)
	if err != nil {
		t.Fatalf("QueryRow() error = %v", err)
	}

	if count < 5 {
		t.Errorf("Expected at least 5 tables, got %d", count)
	}
}

func TestNewDatabaseInvalidPath(t *testing.T) {
	_, err := New("")
	if err == nil {
		t.Error("Expected error for empty path")
	}
}

func TestNewDatabaseCreatesDirectory(t *testing.T) {
	dir := t.TempDir()
	nestedPath := filepath.Join(dir, "nested", "dir", "test.db")

	db, err := New(nestedPath)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}
	defer db.Close()

	if _, err := os.Stat(nestedPath); os.IsNotExist(err) {
		t.Error("Database file should be created")
	}
}

func TestInTransactionCommits(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "test.db")

	db, err := New(dbPath)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}
	defer db.Close()

	testID := "commit-test-project"
	err = db.InTransaction(func(tx *sql.Tx) error {
		_, err := tx.Exec("INSERT INTO projects (id, name, path, last_updated) VALUES (?, ?, ?, ?)", testID, "Test Project", "/tmp/test", 123456)
		return err
	})

	if err != nil {
		t.Fatalf("Transaction should commit: %v", err)
	}

	var name string
	err = db.QueryRow("SELECT name FROM projects WHERE id = ?", testID).Scan(&name)
	if err != nil {
		t.Fatalf("Should be able to read inserted row: %v", err)
	}
	if name != "Test Project" {
		t.Errorf("name = %q, want %q", name, "Test Project")
	}
}

func TestRunMigrations(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "migrate_test.db")

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		t.Fatalf("sql.Open() error = %v", err)
	}
	defer db.Close()

	if err := RunMigrations(db); err != nil {
		t.Fatalf("RunMigrations() error = %v", err)
	}

	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM sqlite_master WHERE type='table'").Scan(&count)
	if err != nil {
		t.Fatalf("QueryRow() error = %v", err)
	}

	if count < 5 {
		t.Errorf("Expected at least 5 tables, got %d", count)
	}
}
