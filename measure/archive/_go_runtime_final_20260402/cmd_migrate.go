package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/measure/fleet-commander/internal/database"
)

func runMigrate() {
	fs := flag.NewFlagSet("migrate", flag.ExitOnError)
	force := fs.Bool("force", false, "Skip bad projects instead of aborting")
	rootDir := fs.String("root", "", "Root directory to scan for projects (default: current directory)")
	fs.Parse(os.Args[2:])

	if *rootDir == "" {
		cwd, err := os.Getwd()
		if err != nil {
			log.Fatalf("Failed to get current directory: %v", err)
		}
		*rootDir = cwd
	}

	homeDir, err := os.UserHomeDir()
	if err != nil {
		log.Fatalf("Failed to get home directory: %v", err)
	}

	dbPath := filepath.Join(homeDir, ".measure", "fleet_commander.db")
	db, err := database.New(dbPath)
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}
	defer db.Close()

	migrator := database.NewMigrator(db, *force)

	// Check if the root directory itself is a measure project
	measureDir := filepath.Join(*rootDir, "measure")
	if _, err := os.Stat(measureDir); err == nil {
		log.Printf("Migrating project: %s", *rootDir)
		result, err := migrator.MigrateProject(*rootDir)
		if err != nil {
			log.Fatalf("Migration failed: %v", err)
		}
		printMigrationResult(*rootDir, result)
		return
	}

	// Otherwise scan for sub-directories with measure/
	entries, err := os.ReadDir(*rootDir)
	if err != nil {
		log.Fatalf("Failed to read directory: %v", err)
	}

	totalResult := &database.MigrationResult{}
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		projectPath := filepath.Join(*rootDir, entry.Name())
		if _, err := os.Stat(filepath.Join(projectPath, "measure")); os.IsNotExist(err) {
			continue
		}

		log.Printf("Migrating project: %s", entry.Name())
		result, err := migrator.MigrateProject(projectPath)
		if err != nil {
			if *force {
				log.Printf("Warning: Skipping %s: %v", entry.Name(), err)
				continue
			}
			log.Fatalf("Migration failed for %s: %v", entry.Name(), err)
		}
		totalResult.ProjectsImported += result.ProjectsImported
		totalResult.TracksImported += result.TracksImported
		totalResult.TasksImported += result.TasksImported
		totalResult.IssuesImported += result.IssuesImported
		totalResult.LogsImported += result.LogsImported
		totalResult.Errors = append(totalResult.Errors, result.Errors...)
	}

	fmt.Println("\n=== Migration Summary ===")
	fmt.Printf("Projects: %d\n", totalResult.ProjectsImported)
	fmt.Printf("Tracks:   %d\n", totalResult.TracksImported)
	fmt.Printf("Tasks:    %d\n", totalResult.TasksImported)
	fmt.Printf("Issues:   %d\n", totalResult.IssuesImported)
	fmt.Printf("Logs:     %d\n", totalResult.LogsImported)
	if len(totalResult.Errors) > 0 {
		fmt.Printf("Warnings: %d\n", len(totalResult.Errors))
		for _, e := range totalResult.Errors {
			fmt.Printf("  - %s\n", e)
		}
	}
}

func printMigrationResult(path string, result *database.MigrationResult) {
	fmt.Printf("\n=== Migration Result: %s ===\n", filepath.Base(path))
	fmt.Printf("Projects: %d\n", result.ProjectsImported)
	fmt.Printf("Tracks:   %d\n", result.TracksImported)
	fmt.Printf("Tasks:    %d\n", result.TasksImported)
	fmt.Printf("Issues:   %d\n", result.IssuesImported)
	fmt.Printf("Logs:     %d\n", result.LogsImported)
	if len(result.Errors) > 0 {
		fmt.Printf("Warnings: %d\n", len(result.Errors))
		for _, e := range result.Errors {
			fmt.Printf("  - %s\n", e)
		}
	}
}
