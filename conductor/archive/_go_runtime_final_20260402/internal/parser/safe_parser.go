package parser

import (
	"fmt"
	"math"
	"time"

	"github.com/conductor/fleet-commander/internal/models"
)

// SafeParsePlan wraps ParsePlan with panic recovery. If the parser panics,
// the panic is caught and returned as an error instead of crashing the process.
func SafeParsePlan(filePath string) (phases []*models.Phase, err error) {
	defer func() {
		if r := recover(); r != nil {
			phases = nil
			err = fmt.Errorf("panic during ParsePlan(%q): %v", filePath, r)
		}
	}()

	return ParsePlan(filePath)
}

// SafeParseTracksRegistry wraps ParseTracksRegistry with panic recovery.
// If the parser panics, the panic is caught and returned as an error.
func SafeParseTracksRegistry(filePath string) (tracks []*models.Track, err error) {
	defer func() {
		if r := recover(); r != nil {
			tracks = nil
			err = fmt.Errorf("panic during ParseTracksRegistry(%q): %v", filePath, r)
		}
	}()

	return ParseTracksRegistry(filePath)
}

// ParsePlanWithRetry calls SafeParsePlan with exponential backoff.
// It retries up to maxRetries times on failure, starting with a 100ms delay
// and doubling each attempt.
func ParsePlanWithRetry(filePath string, maxRetries int) ([]*models.Phase, error) {
	var lastErr error

	for attempt := 0; attempt <= maxRetries; attempt++ {
		phases, err := SafeParsePlan(filePath)
		if err == nil {
			return phases, nil
		}
		lastErr = err

		if attempt < maxRetries {
			delay := time.Duration(math.Pow(2, float64(attempt))) * 100 * time.Millisecond
			time.Sleep(delay)
		}
	}

	return nil, fmt.Errorf("ParsePlanWithRetry failed after %d retries: %w", maxRetries, lastErr)
}

// ParseTracksRegistryWithRetry calls SafeParseTracksRegistry with exponential backoff.
func ParseTracksRegistryWithRetry(filePath string, maxRetries int) ([]*models.Track, error) {
	var lastErr error

	for attempt := 0; attempt <= maxRetries; attempt++ {
		tracks, err := SafeParseTracksRegistry(filePath)
		if err == nil {
			return tracks, nil
		}
		lastErr = err

		if attempt < maxRetries {
			delay := time.Duration(math.Pow(2, float64(attempt))) * 100 * time.Millisecond
			time.Sleep(delay)
		}
	}

	return nil, fmt.Errorf("ParseTracksRegistryWithRetry failed after %d retries: %w", maxRetries, lastErr)
}
