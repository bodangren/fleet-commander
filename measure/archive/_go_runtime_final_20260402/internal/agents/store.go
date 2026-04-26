package agents

import (
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/measure/fleet-commander/internal/storage"
)

const BundledDir = "defaults/agents"

type Store struct {
	bundled    fs.FS
	userDir    string
	projectDir string
}

func NewStore(bundled fs.FS, userDir, projectDir string) *Store {
	return &Store{
		bundled:    bundled,
		userDir:    userDir,
		projectDir: projectDir,
	}
}

func (s *Store) List() ([]ResolvedDefinition, error) {
	resolved := map[string]ResolvedDefinition{}

	if s.bundled != nil {
		bundled, err := readDefinitionsFromFS(s.bundled, BundledDir, LayerBundled)
		if err != nil {
			return nil, err
		}
		for name, def := range bundled {
			resolved[name] = def
		}
	}

	if s.userDir != "" {
		userDefs, err := readDefinitionsFromDir(s.userDir, LayerUser)
		if err != nil {
			return nil, err
		}
		for name, def := range userDefs {
			resolved[name] = def
		}
	}

	if s.projectDir != "" {
		projectDefs, err := readDefinitionsFromDir(s.projectDir, LayerProject)
		if err != nil {
			return nil, err
		}
		for name, def := range projectDefs {
			resolved[name] = def
		}
	}

	names := make([]string, 0, len(resolved))
	for name := range resolved {
		names = append(names, name)
	}
	sort.Strings(names)

	result := make([]ResolvedDefinition, 0, len(names))
	for _, name := range names {
		result = append(result, resolved[name])
	}
	return result, nil
}

func (s *Store) Get(name string) (*ResolvedDefinition, bool, error) {
	list, err := s.List()
	if err != nil {
		return nil, false, err
	}
	needle := sanitizeName(name)
	for _, item := range list {
		if strings.EqualFold(item.Definition.Name, name) || sanitizeName(item.Definition.Name) == needle {
			return &item, true, nil
		}
	}
	return nil, false, nil
}

func (s *Store) SaveUser(def *Definition) error {
	if s.userDir == "" {
		return fmt.Errorf("user directory is not configured")
	}
	return saveDefinition(s.userDir, def)
}

func (s *Store) SaveProject(def *Definition) error {
	if s.projectDir == "" {
		return fmt.Errorf("project directory is not configured")
	}
	return saveDefinition(s.projectDir, def)
}

func (s *Store) ResetUser(name string) error {
	if s.userDir == "" {
		return fmt.Errorf("user directory is not configured")
	}
	path := filepath.Join(s.userDir, fmt.Sprintf("%s.md", sanitizeName(name)))
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

func (s *Store) ResetProject(name string) error {
	if s.projectDir == "" {
		return fmt.Errorf("project directory is not configured")
	}
	path := filepath.Join(s.projectDir, fmt.Sprintf("%s.md", sanitizeName(name)))
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

func (s *Store) Reset(name string) error {
	if err := s.ResetUser(name); err != nil {
		return err
	}
	if err := s.ResetProject(name); err != nil {
		return err
	}
	return nil
}

func (s *Store) Clone(sourceName, targetName string, layer Layer) error {
	resolved, found, err := s.Get(sourceName)
	if err != nil {
		return err
	}
	if !found {
		return fmt.Errorf("agent %q not found", sourceName)
	}

	clone := *resolved.Definition
	clone.Name = targetName

	switch layer {
	case LayerUser:
		return s.SaveUser(&clone)
	case LayerProject:
		return s.SaveProject(&clone)
	default:
		return fmt.Errorf("unsupported layer %q", layer)
	}
}

func readDefinitionsFromFS(source fs.FS, dir string, layer Layer) (map[string]ResolvedDefinition, error) {
	entries, err := fs.ReadDir(source, dir)
	if err != nil {
		if os.IsNotExist(err) {
			return map[string]ResolvedDefinition{}, nil
		}
		return nil, fmt.Errorf("failed to read bundled agents: %w", err)
	}

	result := make(map[string]ResolvedDefinition)
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		if !strings.HasSuffix(strings.ToLower(entry.Name()), ".md") {
			continue
		}
		path := filepath.Join(dir, entry.Name())
		data, err := fs.ReadFile(source, path)
		if err != nil {
			return nil, fmt.Errorf("failed to read bundled agent: %w", err)
		}
		def, err := ParseDefinition(data)
		if err != nil {
			return nil, err
		}
		def.Name = strings.TrimSuffix(entry.Name(), filepath.Ext(entry.Name()))
		result[def.Name] = ResolvedDefinition{Definition: def, Layer: layer}
	}
	return result, nil
}

func readDefinitionsFromDir(dir string, layer Layer) (map[string]ResolvedDefinition, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return map[string]ResolvedDefinition{}, nil
		}
		return nil, fmt.Errorf("failed to read agent dir: %w", err)
	}

	result := make(map[string]ResolvedDefinition)
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		if !strings.HasSuffix(strings.ToLower(entry.Name()), ".md") {
			continue
		}
		path := filepath.Join(dir, entry.Name())
		data, err := os.ReadFile(path)
		if err != nil {
			return nil, fmt.Errorf("failed to read agent file: %w", err)
		}
		def, err := ParseDefinition(data)
		if err != nil {
			return nil, err
		}
		def.Name = strings.TrimSuffix(entry.Name(), filepath.Ext(entry.Name()))
		result[def.Name] = ResolvedDefinition{Definition: def, Layer: layer}
	}
	return result, nil
}

func saveDefinition(dir string, def *Definition) error {
	data, err := MarshalDefinition(def)
	if err != nil {
		return err
	}
	name := def.Name
	if name == "" {
		name = "agent"
	}
	filename := fmt.Sprintf("%s.md", sanitizeName(name))
	path := filepath.Join(dir, filename)
	return storage.WriteFileAtomic(path, data, 0644)
}

func sanitizeName(input string) string {
	lower := strings.ToLower(strings.TrimSpace(input))
	var b strings.Builder
	lastDash := false
	for _, r := range lower {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
			lastDash = false
			continue
		}
		if !lastDash {
			b.WriteRune('-')
			lastDash = true
		}
	}
	result := strings.Trim(b.String(), "-")
	if result == "" {
		return "agent"
	}
	return result
}
