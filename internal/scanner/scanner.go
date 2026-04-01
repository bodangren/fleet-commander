package scanner

import (
	"os"
	"path/filepath"
)

const maxDepth = 5

// FindConductorProjects recursively searches rootDir for directories that
// contain a "conductor/" subdirectory. Recursion depth is limited to maxDepth.
func FindConductorProjects(rootDir string) []string {
	var results []string
	findProjects(rootDir, 0, &results)
	return results
}

func findProjects(dir string, depth int, results *[]string) {
	if depth > maxDepth {
		return
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		return
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		name := entry.Name()
		fullPath := filepath.Join(dir, name)

		if name == "conductor" {
			// The parent directory is a conductor project
			*results = append(*results, dir)
			continue // don't recurse into the conductor/ dir, but keep scanning siblings
		}

		// Skip hidden directories and common non-project dirs
		if len(name) > 0 && name[0] == '.' {
			continue
		}
		if name == "node_modules" || name == "vendor" || name == ".git" {
			continue
		}

		findProjects(fullPath, depth+1, results)
	}
}
