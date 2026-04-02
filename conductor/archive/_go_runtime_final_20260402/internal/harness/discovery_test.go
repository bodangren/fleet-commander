package harness

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"
)

func writeMockBinary(t *testing.T, dir, name, script string) {
	t.Helper()
	path := filepath.Join(dir, name)
	if runtime.GOOS == "windows" {
		path += ".cmd"
		script = "@echo off\r\n" + script
	}
	if err := os.WriteFile(path, []byte(script), 0755); err != nil {
		t.Fatalf("failed to write mock binary: %v", err)
	}
}

func TestDiscoveryServiceRegex(t *testing.T) {
	dir := t.TempDir()
	writeMockBinary(t, dir, "mock-harness", "#!/bin/sh\necho 'models: alpha, beta, alpha'\n")
	t.Setenv("PATH", dir+string(os.PathListSeparator)+os.Getenv("PATH"))

	ds := NewDiscoveryService()
	def := &Definition{
		Name:   "Mock Harness",
		Binary: "mock-harness",
		Discovery: DiscoveryConfig{
			Command:       "mock-harness",
			ParseStrategy: "regex",
			Pattern:       "([a-z]+)",
		},
	}

	got, err := ds.Discover(def)
	if err != nil {
		t.Fatalf("Discover failed: %v", err)
	}
	if len(got) == 0 {
		t.Fatal("expected at least one discovered model")
	}
}

func TestDiscoveryServiceJSON(t *testing.T) {
	dir := t.TempDir()
	writeMockBinary(t, dir, "mock-harness", "#!/bin/sh\necho '{\"models\":[\"alpha\",\"beta\"]}'\n")
	t.Setenv("PATH", dir+string(os.PathListSeparator)+os.Getenv("PATH"))

	ds := NewDiscoveryService()
	def := &Definition{
		Name:   "Mock Harness",
		Binary: "mock-harness",
		Discovery: DiscoveryConfig{
			Command:       "mock-harness",
			ParseStrategy: "json",
			Pattern:       "models",
		},
	}

	got, err := ds.Discover(def)
	if err != nil {
		t.Fatalf("Discover failed: %v", err)
	}
	if len(got) != 2 || got[0] != "alpha" || got[1] != "beta" {
		t.Fatalf("unexpected discovery result: %v", got)
	}
}

func TestDiscoveryServiceLinePerModel(t *testing.T) {
	dir := t.TempDir()
	writeMockBinary(t, dir, "mock-harness", "#!/bin/sh\necho 'alpha'\necho 'beta'\n")
	t.Setenv("PATH", dir+string(os.PathListSeparator)+os.Getenv("PATH"))

	ds := NewDiscoveryService()
	def := &Definition{
		Name:   "Mock Harness",
		Binary: "mock-harness",
		Discovery: DiscoveryConfig{
			Command:       "mock-harness",
			ParseStrategy: "line-per-model",
		},
	}

	got, err := ds.Discover(def)
	if err != nil {
		t.Fatalf("Discover failed: %v", err)
	}
	if len(got) != 2 || got[0] != "alpha" || got[1] != "beta" {
		t.Fatalf("unexpected discovery result: %v", got)
	}
}

func TestDiscoveryServiceCacheHitAndExpiry(t *testing.T) {
	dir := t.TempDir()
	countFile := filepath.Join(dir, "count")
	script := "#!/bin/sh\ncount=0\nif [ -f \"" + countFile + "\" ]; then count=$(cat \"" + countFile + "\"); fi\ncount=$((count + 1))\necho \"$count\" > \"" + countFile + "\"\necho alpha\n"
	writeMockBinary(t, dir, "mock-harness", script)
	t.Setenv("PATH", dir+string(os.PathListSeparator)+os.Getenv("PATH"))

	ds := NewDiscoveryService()
	ds.cacheTTL = 20 * time.Millisecond
	ds.timeout = time.Second

	def := &Definition{
		Name:   "Mock Harness",
		Binary: "mock-harness",
		Discovery: DiscoveryConfig{
			Command:       "mock-harness",
			ParseStrategy: "line-per-model",
		},
	}

	first, err := ds.Discover(def)
	if err != nil {
		t.Fatalf("first Discover failed: %v", err)
	}
	second, err := ds.Discover(def)
	if err != nil {
		t.Fatalf("second Discover failed: %v", err)
	}
	if len(first) != 1 || len(second) != 1 || first[0] != "alpha" || second[0] != "alpha" {
		t.Fatalf("unexpected discovery results: %v / %v", first, second)
	}

	countBytes, err := os.ReadFile(countFile)
	if err != nil {
		t.Fatalf("failed to read count file: %v", err)
	}
	if strings.TrimSpace(string(countBytes)) != "1" {
		t.Fatalf("expected cached second call, got count %q", strings.TrimSpace(string(countBytes)))
	}

	time.Sleep(30 * time.Millisecond)
	third, err := ds.Discover(def)
	if err != nil {
		t.Fatalf("third Discover failed: %v", err)
	}
	if len(third) != 1 || third[0] != "alpha" {
		t.Fatalf("unexpected third discovery result: %v", third)
	}
	countBytes, err = os.ReadFile(countFile)
	if err != nil {
		t.Fatalf("failed to read count file after expiry: %v", err)
	}
	if strings.TrimSpace(string(countBytes)) != "2" {
		t.Fatalf("expected cache expiry to rerun discovery, got count %q", strings.TrimSpace(string(countBytes)))
	}
}

func TestSetCacheTTL(t *testing.T) {
	ds := NewDiscoveryService()

	// Default is 5 minutes
	if ds.cacheTTL != 5*time.Minute {
		t.Errorf("Default cacheTTL = %v, want %v", ds.cacheTTL, 5*time.Minute)
	}

	// Update TTL
	ds.SetCacheTTL(10 * time.Minute)
	if ds.cacheTTL != 10*time.Minute {
		t.Errorf("cacheTTL after SetCacheTTL = %v, want %v", ds.cacheTTL, 10*time.Minute)
	}

	// Zero value is valid (no caching effectively)
	ds.SetCacheTTL(0)
	if ds.cacheTTL != 0 {
		t.Errorf("cacheTTL after SetCacheTTL(0) = %v, want 0", ds.cacheTTL)
	}
}
