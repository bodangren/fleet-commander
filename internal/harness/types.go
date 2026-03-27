package harness

type Definition struct {
	Name       string           `yaml:"name" json:"name"`
	Binary     string           `yaml:"binary" json:"binary"`
	Discovery  DiscoveryConfig  `yaml:"discovery" json:"discovery"`
	Invocation InvocationConfig `yaml:"invocation" json:"invocation"`
}

type DiscoveryConfig struct {
	Command       string `yaml:"command" json:"command"`
	ParseStrategy string `yaml:"parse_strategy" json:"parse_strategy"`
	Pattern       string `yaml:"pattern,omitempty" json:"pattern,omitempty"`
}

type InvocationConfig struct {
	Template string            `yaml:"template" json:"template"`
	Flags    map[string]string `yaml:"flags,omitempty" json:"flags,omitempty"`
}

type Layer string

const (
	LayerBundled Layer = "bundled"
	LayerUser    Layer = "user"
	LayerProject Layer = "project"
)

type ResolvedDefinition struct {
	Definition *Definition `json:"definition"`
	Layer      Layer       `json:"layer"`
}
