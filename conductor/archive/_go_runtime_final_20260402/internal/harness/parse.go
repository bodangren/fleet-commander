package harness

import (
	"fmt"

	"gopkg.in/yaml.v3"
)

func ParseDefinition(data []byte) (*Definition, error) {
	var def Definition
	if err := yaml.Unmarshal(data, &def); err != nil {
		return nil, fmt.Errorf("failed to parse harness yaml: %w", err)
	}
	if def.Name == "" {
		return nil, fmt.Errorf("harness name is required")
	}
	return &def, nil
}

func MarshalDefinition(def *Definition) ([]byte, error) {
	if def == nil {
		return nil, fmt.Errorf("definition is nil")
	}
	if def.Name == "" {
		return nil, fmt.Errorf("harness name is required")
	}
	data, err := yaml.Marshal(def)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal harness yaml: %w", err)
	}
	return data, nil
}
