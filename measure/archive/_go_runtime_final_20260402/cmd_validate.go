package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/measure/fleet-commander/internal/database"
	"github.com/measure/fleet-commander/internal/parser"
)

func runValidate() {
	fs := flag.NewFlagSet("validate", flag.ExitOnError)
	projectDir := fs.String("project", "", "Project directory to validate (default: current directory)")
	fs.Parse(os.Args[2:])

	if *projectDir == "" {
		cwd, err := os.Getwd()
		if err != nil {
			log.Fatalf("Failed to get current directory: %v", err)
		}
		*projectDir = cwd
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

	stores := database.NewStores(db)
	projectID := filepath.Base(*projectDir)

	fmt.Printf("=== Validation Report: %s ===\n\n", projectID)

	discrepancies := 0

	// Validate tracks
	tracksFile := filepath.Join(*projectDir, "measure", "tracks.md")
	if _, err := os.Stat(tracksFile); err == nil {
		fsTracks, err := parser.ParseTracksRegistry(tracksFile)
		if err != nil {
			log.Printf("Warning: failed to parse tracks.md: %v", err)
		} else {
			var dbTrackCount int
			err := db.QueryRow("SELECT COUNT(*) FROM tracks WHERE project_id = ?", projectID).Scan(&dbTrackCount)
			if err != nil {
				log.Printf("Warning: failed to count DB tracks: %v", err)
			}
			fmt.Printf("Tracks:\n")
			fmt.Printf("  Filesystem: %d\n", len(fsTracks))
			fmt.Printf("  SQLite:     %d\n", dbTrackCount)
			if len(fsTracks) != dbTrackCount {
				discrepancies++
				fmt.Printf("  ⚠ MISMATCH\n")
			} else {
				fmt.Printf("  ✓ Match\n")
			}
		}
	}

	// Validate tasks
	var fsTaskCount int
	measureTracksDir := filepath.Join(*projectDir, "measure", "tracks")
	if entries, err := os.ReadDir(measureTracksDir); err == nil {
		for _, entry := range entries {
			if !entry.IsDir() {
				continue
			}
			planPath := filepath.Join(measureTracksDir, entry.Name(), "plan.md")
			if phases, err := parser.ParsePlan(planPath); err == nil {
				for _, phase := range phases {
					fsTaskCount += len(phase.Tasks)
				}
			}
		}
	}

	var dbTaskCount int
	err = db.QueryRow(`SELECT COUNT(*) FROM tasks WHERE track_id IN (SELECT id FROM tracks WHERE project_id = ?)`, projectID).Scan(&dbTaskCount)
	if err != nil {
		log.Printf("Warning: failed to count DB tasks: %v", err)
	}
	fmt.Printf("\nTasks:\n")
	fmt.Printf("  Filesystem: %d\n", fsTaskCount)
	fmt.Printf("  SQLite:     %d\n", dbTaskCount)
	if fsTaskCount != dbTaskCount {
		discrepancies++
		fmt.Printf("  ⚠ MISMATCH\n")
	} else {
		fmt.Printf("  ✓ Match\n")
	}

	// Validate issues
	var fsIssueCount int
	for _, dir := range []string{"open", "resolved"} {
		issueDir := filepath.Join(*projectDir, "measure", "broker", dir)
		if entries, err := os.ReadDir(issueDir); err == nil {
			for _, entry := range entries {
				if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".md") {
					fsIssueCount++
				}
			}
		}
	}

	dbIssues, err := stores.Issues.ListByProject(projectID)
	if err != nil {
		log.Printf("Warning: failed to list DB issues: %v", err)
	}
	fmt.Printf("\nIssues:\n")
	fmt.Printf("  Filesystem: %d\n", fsIssueCount)
	fmt.Printf("  SQLite:     %d\n", len(dbIssues))
	if fsIssueCount != len(dbIssues) {
		discrepancies++
		fmt.Printf("  ⚠ MISMATCH\n")
	} else {
		fmt.Printf("  ✓ Match\n")
	}

	// Validate logs
	var fsLogLines int
	logsDir := filepath.Join(*projectDir, "measure", "logs", projectID)
	if entries, err := os.ReadDir(logsDir); err == nil {
		for _, entry := range entries {
			if strings.HasSuffix(entry.Name(), ".jsonl") {
				if data, err := os.ReadFile(filepath.Join(logsDir, entry.Name())); err == nil {
					for _, line := range strings.Split(string(data), "\n") {
						if strings.TrimSpace(line) != "" {
							fsLogLines++
						}
					}
				}
			}
		}
	}

	dbLogs, err := stores.ExecutionLogs.ListByProject(projectID, 10000)
	if err != nil {
		log.Printf("Warning: failed to list DB logs: %v", err)
	}
	fmt.Printf("\nExecution Logs:\n")
	fmt.Printf("  Filesystem: %d\n", fsLogLines)
	fmt.Printf("  SQLite:     %d\n", len(dbLogs))
	if fsLogLines != len(dbLogs) {
		discrepancies++
		fmt.Printf("  ⚠ MISMATCH\n")
	} else {
		fmt.Printf("  ✓ Match\n")
	}

	fmt.Printf("\n=== Total Discrepancies: %d ===\n", discrepancies)
	if discrepancies > 0 {
		os.Exit(1)
	}
}
