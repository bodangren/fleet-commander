package agents

type Definition struct {
	Name        string          `json:"name"`
	Description string          `yaml:"description" json:"description"`
	Mode        string          `yaml:"mode" json:"mode"`
	Model       string          `yaml:"model" json:"model"`
	Temperature float64         `yaml:"temperature" json:"temperature"`
	Tools       map[string]bool `yaml:"tools" json:"tools"`
	Body        string          `yaml:"-" json:"body"`
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
