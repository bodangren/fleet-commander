package harness

import "embed"

//go:embed defaults/harnesses/*.yaml
var BundledFS embed.FS
