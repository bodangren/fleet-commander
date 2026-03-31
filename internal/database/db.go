package database

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

type DB struct {
	*sql.DB
	filePath string
}

func New(dbPath string) (*DB, error) {
	if dbPath == "" {
		return nil, fmt.Errorf("database path is required")
	}

	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create database directory: %w", err)
	}

	db, err := sql.Open("sqlite", dbPath+"?_journal_mode=WAL&_foreign_keys=ON")
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	database := &DB{
		DB:       db,
		filePath: dbPath,
	}

	if err := database.migrate(); err != nil {
		return nil, fmt.Errorf("failed to migrate database: %w", err)
	}

	return database, nil
}

func (d *DB) migrate() error {
	schema := `
	CREATE TABLE IF NOT EXISTS projects (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		path TEXT NOT NULL,
		last_updated INTEGER NOT NULL
	);

	CREATE TABLE IF NOT EXISTS tracks (
		id TEXT PRIMARY KEY,
		project_id TEXT NOT NULL,
		name TEXT NOT NULL,
		type TEXT NOT NULL,
		status TEXT NOT NULL,
		plan_path TEXT,
		FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS tasks (
		id TEXT PRIMARY KEY,
		track_id TEXT NOT NULL,
		phase TEXT NOT NULL,
		description TEXT NOT NULL,
		status TEXT NOT NULL,
		agent_tag TEXT,
		created_at INTEGER NOT NULL,
		FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS issues (
		id TEXT PRIMARY KEY,
		project_id TEXT NOT NULL,
		title TEXT NOT NULL,
		description TEXT,
		type TEXT NOT NULL,
		status TEXT NOT NULL,
		related_task TEXT,
		created_at INTEGER NOT NULL,
		updated_at INTEGER,
		FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS execution_logs (
		id TEXT PRIMARY KEY,
		project_id TEXT NOT NULL,
		task_id TEXT,
		agent_name TEXT,
		harness TEXT,
		command TEXT,
		args TEXT,
		output TEXT,
		status TEXT NOT NULL,
		duration_ms INTEGER,
		timestamp INTEGER NOT NULL,
		FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
	);

	CREATE INDEX IF NOT EXISTS idx_tracks_project ON tracks(project_id);
	CREATE INDEX IF NOT EXISTS idx_tasks_track ON tasks(track_id);
	CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
	CREATE INDEX IF NOT EXISTS idx_issues_project ON issues(project_id);
	CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
	CREATE INDEX IF NOT EXISTS idx_logs_project_timestamp ON execution_logs(project_id, timestamp);
	CREATE INDEX IF NOT EXISTS idx_logs_project_agent_status ON execution_logs(project_id, agent_name, status);
	CREATE INDEX IF NOT EXISTS idx_logs_status ON execution_logs(status);
	CREATE INDEX IF NOT EXISTS idx_issues_project_status_created ON issues(project_id, status, created_at);
	CREATE INDEX IF NOT EXISTS idx_tasks_track_status ON tasks(track_id, status);
	`

	_, err := d.Exec(schema)
	return err
}

func (d *DB) Close() error {
	if d.DB != nil {
		return d.DB.Close()
	}
	return nil
}

func (d *DB) InTransaction(fn func(tx *sql.Tx) error) error {
	tx, err := d.BeginTx(context.Background(), nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}

	if err := fn(tx); err != nil {
		if rbErr := tx.Rollback(); rbErr != nil {
			return fmt.Errorf("rollback failed: %v (original error: %w)", rbErr, err)
		}
		return err
	}

	return tx.Commit()
}

type Executor interface {
	Exec(query string, args ...any) (sql.Result, error)
	Query(query string, args ...any) (*sql.Rows, error)
	QueryRow(query string, args ...any) *sql.Row
}

func RunMigrations(db *sql.DB) error {
	schema := `
	CREATE TABLE IF NOT EXISTS projects (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		path TEXT NOT NULL,
		last_updated INTEGER NOT NULL
	);

	CREATE TABLE IF NOT EXISTS tracks (
		id TEXT PRIMARY KEY,
		project_id TEXT NOT NULL,
		name TEXT NOT NULL,
		type TEXT NOT NULL,
		status TEXT NOT NULL,
		plan_path TEXT,
		FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS tasks (
		id TEXT PRIMARY KEY,
		track_id TEXT NOT NULL,
		phase TEXT NOT NULL,
		description TEXT NOT NULL,
		status TEXT NOT NULL,
		agent_tag TEXT,
		created_at INTEGER NOT NULL,
		FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS issues (
		id TEXT PRIMARY KEY,
		project_id TEXT NOT NULL,
		title TEXT NOT NULL,
		description TEXT,
		type TEXT NOT NULL,
		status TEXT NOT NULL,
		related_task TEXT,
		created_at INTEGER NOT NULL,
		updated_at INTEGER,
		FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS execution_logs (
		id TEXT PRIMARY KEY,
		project_id TEXT NOT NULL,
		task_id TEXT,
		agent_name TEXT,
		harness TEXT,
		command TEXT,
		args TEXT,
		output TEXT,
		status TEXT NOT NULL,
		duration_ms INTEGER,
		timestamp INTEGER NOT NULL,
		FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
	);

	CREATE INDEX IF NOT EXISTS idx_tracks_project ON tracks(project_id);
	CREATE INDEX IF NOT EXISTS idx_tasks_track ON tasks(track_id);
	CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
	CREATE INDEX IF NOT EXISTS idx_issues_project ON issues(project_id);
	CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
	CREATE INDEX IF NOT EXISTS idx_logs_project_timestamp ON execution_logs(project_id, timestamp);
	CREATE INDEX IF NOT EXISTS idx_logs_project_agent_status ON execution_logs(project_id, agent_name, status);
	CREATE INDEX IF NOT EXISTS idx_logs_status ON execution_logs(status);
	CREATE INDEX IF NOT EXISTS idx_issues_project_status_created ON issues(project_id, status, created_at);
	CREATE INDEX IF NOT EXISTS idx_tasks_track_status ON tasks(track_id, status);
	`

	_, err := db.Exec(schema)
	return err
}
