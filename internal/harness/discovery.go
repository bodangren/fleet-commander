package harness

import (
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"regexp"
	"strings"
	"sync"
	"time"
)

const defaultDiscoveryTimeout = 30 * time.Second
const defaultDiscoveryCacheTTL = 5 * time.Minute

type DiscoveryService struct {
	timeout  time.Duration
	cacheTTL time.Duration
	mu       sync.Mutex
	cache    map[string]cachedDiscovery
}

type cachedDiscovery struct {
	models  []string
	expires time.Time
}

func NewDiscoveryService() *DiscoveryService {
	return &DiscoveryService{
		timeout:  defaultDiscoveryTimeout,
		cacheTTL: defaultDiscoveryCacheTTL,
		cache:    make(map[string]cachedDiscovery),
	}
}

func NewDiscoveryServiceWithTimeout(timeout time.Duration) *DiscoveryService {
	service := NewDiscoveryService()
	service.timeout = timeout
	return service
}

// SetCacheTTL updates the discovery cache TTL. Thread-safe.
func (ds *DiscoveryService) SetCacheTTL(ttl time.Duration) {
	ds.mu.Lock()
	defer ds.mu.Unlock()
	ds.cacheTTL = ttl
}

func (ds *DiscoveryService) Discover(def *Definition) ([]string, error) {
	if def == nil {
		return nil, fmt.Errorf("definition is nil")
	}
	if def.Binary == "" {
		return nil, fmt.Errorf("harness binary is required")
	}

	if _, err := exec.LookPath(def.Binary); err != nil {
		return nil, fmt.Errorf("harness binary %q not found on PATH: %w", def.Binary, err)
	}

	cacheKey := discoveryCacheKey(def)
	if models, ok := ds.getCached(cacheKey); ok {
		return models, nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), ds.timeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, "sh", "-c", def.Discovery.Command)
	output, err := cmd.CombinedOutput()
	if ctx.Err() == context.DeadlineExceeded {
		return nil, fmt.Errorf("discovery command timed out after %s", ds.timeout)
	}
	if err != nil {
		return nil, fmt.Errorf("discovery command failed: %w: %s", err, strings.TrimSpace(string(output)))
	}

	var models []string
	switch def.Discovery.ParseStrategy {
	case "regex":
		models, err = discoverByRegex(output, def.Discovery.Pattern)
	case "json":
		models, err = discoverByJSON(output, def.Discovery.Pattern)
	case "line-per-model":
		models = discoverByLines(output)
	default:
		return nil, fmt.Errorf("unsupported parse strategy %q", def.Discovery.ParseStrategy)
	}
	if err != nil {
		return nil, err
	}

	ds.setCached(cacheKey, models)
	return models, nil
}

func discoverByRegex(output []byte, pattern string) ([]string, error) {
	if pattern == "" {
		return nil, fmt.Errorf("regex pattern is required")
	}
	re, err := regexp.Compile(pattern)
	if err != nil {
		return nil, fmt.Errorf("invalid regex pattern: %w", err)
	}

	matches := re.FindAllStringSubmatch(string(output), -1)
	seen := make(map[string]struct{})
	results := make([]string, 0, len(matches))
	for _, match := range matches {
		candidate := ""
		switch {
		case len(match) > 1:
			candidate = strings.TrimSpace(match[1])
		case len(match) > 0:
			candidate = strings.TrimSpace(match[0])
		}
		if candidate == "" {
			continue
		}
		if _, ok := seen[candidate]; ok {
			continue
		}
		seen[candidate] = struct{}{}
		results = append(results, candidate)
	}
	return results, nil
}

func discoverByJSON(output []byte, path string) ([]string, error) {
	var data any
	if err := json.Unmarshal(output, &data); err != nil {
		return nil, fmt.Errorf("failed to parse discovery json: %w", err)
	}

	current := data
	if path != "" {
		var err error
		current, err = walkJSONPath(data, path)
		if err != nil {
			return nil, err
		}
	}

	switch value := current.(type) {
	case []any:
		results := make([]string, 0, len(value))
		seen := make(map[string]struct{})
		for _, item := range value {
			str, ok := item.(string)
			if !ok {
				continue
			}
			str = strings.TrimSpace(str)
			if str == "" {
				continue
			}
			if _, exists := seen[str]; exists {
				continue
			}
			seen[str] = struct{}{}
			results = append(results, str)
		}
		return results, nil
	case string:
		if strings.TrimSpace(value) == "" {
			return []string{}, nil
		}
		return []string{strings.TrimSpace(value)}, nil
	default:
		return nil, fmt.Errorf("json discovery path did not resolve to a string or array of strings")
	}
}

func walkJSONPath(data any, path string) (any, error) {
	current := data
	for _, part := range strings.Split(path, ".") {
		if part == "" {
			continue
		}
		switch typed := current.(type) {
		case map[string]any:
			next, ok := typed[part]
			if !ok {
				return nil, fmt.Errorf("json path segment %q not found", part)
			}
			current = next
		case []any:
			return nil, fmt.Errorf("json arrays are not supported in path traversal")
		default:
			return nil, fmt.Errorf("json path segment %q cannot be traversed", part)
		}
	}
	return current, nil
}

func discoverByLines(output []byte) []string {
	lines := strings.Split(string(output), "\n")
	results := make([]string, 0, len(lines))
	seen := make(map[string]struct{})
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		if _, ok := seen[line]; ok {
			continue
		}
		seen[line] = struct{}{}
		results = append(results, line)
	}
	return results
}

func discoveryCacheKey(def *Definition) string {
	return strings.Join([]string{
		def.Binary,
		def.Discovery.Command,
		def.Discovery.ParseStrategy,
		def.Discovery.Pattern,
	}, "\x00")
}

func (ds *DiscoveryService) getCached(key string) ([]string, bool) {
	ds.mu.Lock()
	defer ds.mu.Unlock()

	entry, ok := ds.cache[key]
	if !ok || time.Now().After(entry.expires) {
		if ok {
			delete(ds.cache, key)
		}
		return nil, false
	}

	models := make([]string, len(entry.models))
	copy(models, entry.models)
	return models, true
}

func (ds *DiscoveryService) setCached(key string, models []string) {
	ds.mu.Lock()
	defer ds.mu.Unlock()

	if ds.cache == nil {
		ds.cache = make(map[string]cachedDiscovery)
	}
	copyModels := make([]string, len(models))
	copy(copyModels, models)
	ds.cache[key] = cachedDiscovery{
		models:  copyModels,
		expires: time.Now().Add(ds.cacheTTL),
	}
}
