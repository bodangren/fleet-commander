package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/conductor/fleet-commander/internal/backup"
)

func runBackup() {
	fs := flag.NewFlagSet("backup", flag.ExitOnError)
	projectPath := fs.String("project", "", "Project directory to back up")
	full := fs.Bool("full", false, "Back up entire ~/.conductor/ directory")
	output := fs.String("output", "", "Custom output directory for backup file")
	fs.Parse(os.Args[2:])

	homeDir, err := os.UserHomeDir()
	if err != nil {
		log.Fatalf("Failed to get home directory: %v", err)
	}

	backupDir := filepath.Join(homeDir, ".conductor", "backups")
	if *output != "" {
		backupDir = *output
	}

	if *full {
		conductorDir := filepath.Join(homeDir, ".conductor")
		path, err := backup.CreateFullBackup(conductorDir, backupDir)
		if err != nil {
			log.Fatalf("Full backup failed: %v", err)
		}
		info, _ := os.Stat(path)
		fmt.Printf("Full backup created: %s (%d bytes)\n", path, info.Size())
		return
	}

	if *projectPath == "" {
		cwd, err := os.Getwd()
		if err != nil {
			log.Fatalf("Failed to get current directory: %v", err)
		}
		*projectPath = cwd
	}

	path, err := backup.CreateProjectBackup(*projectPath, backupDir)
	if err != nil {
		log.Fatalf("Project backup failed: %v", err)
	}
	info, _ := os.Stat(path)
	fmt.Printf("Project backup created: %s (%d bytes)\n", path, info.Size())
}

func runRestore() {
	fs := flag.NewFlagSet("restore", flag.ExitOnError)
	force := fs.Bool("force", false, "Overwrite existing files")
	target := fs.String("target", "", "Target directory for restore (default: current directory)")
	fs.Parse(os.Args[2:])

	args := fs.Args()
	if len(args) == 0 {
		log.Fatal("Usage: conductor restore <backup-file> [--force] [--target <dir>]")
	}

	zipPath := args[0]
	if *target == "" {
		cwd, err := os.Getwd()
		if err != nil {
			log.Fatalf("Failed to get current directory: %v", err)
		}
		*target = cwd
	}

	if err := backup.RestoreBackup(zipPath, *target, *force); err != nil {
		log.Fatalf("Restore failed: %v", err)
	}
	fmt.Printf("Backup restored to: %s\n", *target)
}
