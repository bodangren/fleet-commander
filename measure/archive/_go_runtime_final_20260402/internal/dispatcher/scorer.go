package dispatcher

import (
	"fmt"
	"regexp"
	"sync"
	"time"
)

type LLMClient interface {
	ScoreWithLLM(prompt string) (string, error)
}

type Scorer interface {
	Score(candidates []Candidate) ([]ScoredCandidate, error)
}

type LLMScorer struct {
	client LLMClient
	cache  *scoreCache
}

type scoreCache struct {
	mu       sync.RWMutex
	scores   map[string][]ScoredCandidate
	expiry   time.Time
	ttl      time.Duration
	scorer   *LLMScorer
	fallback *PriorityScorer
}

func (c *scoreCache) get(key string) ([]ScoredCandidate, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	if time.Now().After(c.expiry) {
		return nil, false
	}
	scored, ok := c.scores[key]
	return scored, ok
}

func (c *scoreCache) set(key string, scored []ScoredCandidate) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.scores[key] = scored
	c.expiry = time.Now().Add(c.ttl)
}

func NewLLMScorer(client LLMClient) *LLMScorer {
	return &LLMScorer{
		client: client,
		cache: &scoreCache{
			scores: make(map[string][]ScoredCandidate),
			ttl:    30 * time.Second,
		},
	}
}

func NewLLMScorerWithCache(client LLMClient, ttl time.Duration) *LLMScorer {
	s := &LLMScorer{
		client: client,
		cache: &scoreCache{
			scores: make(map[string][]ScoredCandidate),
			ttl:    ttl,
		},
	}
	s.cache.scorer = s
	return s
}

func (s *LLMScorer) Score(candidates []Candidate) ([]ScoredCandidate, error) {
	key := cacheKey(candidates)

	if scored, ok := s.cache.get(key); ok {
		return scored, nil
	}

	prompt := BuildScoringPrompt(candidates, []string{})

	response, err := s.client.ScoreWithLLM(prompt)
	if err != nil {
		fallback := &PriorityScorer{}
		return fallback.Score(candidates)
	}

	scored := parseLLMResponse(response, candidates)
	s.cache.set(key, scored)
	return scored, nil
}

type PriorityScorer struct{}

func (s *PriorityScorer) Score(candidates []Candidate) ([]ScoredCandidate, error) {
	scored := make([]ScoredCandidate, len(candidates))
	for i, c := range candidates {
		score := float64(c.Priority)
		score += float64(c.AgeBoost())
		scored[i] = ScoredCandidate{
			Candidate: c,
			Score:     score,
			Rationale: fmt.Sprintf("Priority %d + age boost %d", c.Priority, c.AgeBoost()),
		}
	}
	return scored, nil
}

const scoringPromptTemplate = `You are a task prioritization engine. Evaluate the following tasks and issues and assign a score from 1-10 with a brief rationale.

For each task, consider:
- Priority: is it marked high priority?
- Complexity: is it well-scoped or ambiguous?
- Dependencies: are blockers resolved?
- Agent suitability: which agent is best suited?

Tasks and Issues:
{{.Candidates}}

Available agents: {{.Agents}}

Respond in format:
task-ID: SCORE - Rationale (one per line)
`

func BuildScoringPrompt(candidates []Candidate, agents []string) string {
	var prompt string
	for _, c := range candidates {
		prompt += fmt.Sprintf("- [%s] %s (%s)\n", c.ID, c.Title, c.Type)
		if c.Description != "" {
			prompt += "  Description: " + c.Description + "\n"
		}
	}
	if len(agents) == 0 {
		agents = []string{"architect", "senior-backend", "senior-frontend", "mid-dev", "junior-dev", "reviewer"}
	}
	agentStr := ""
	for _, a := range agents {
		agentStr += "- " + a + "\n"
	}
	return fmt.Sprintf("Evaluate and score the following tasks (1-10):\n%s\nAvailable agents:\n%s", prompt, agentStr)
}

func parseLLMResponse(response string, candidates []Candidate) []ScoredCandidate {
	scored := make([]ScoredCandidate, 0, len(candidates))

	lineRegex := regexp.MustCompile(`(\w+-\d+):\s*(\d+(?:\.\d+)?)\s*-\s*(.+)`)
	idToScore := make(map[string]float64)
	idToRationale := make(map[string]string)

	for _, line := range splitLines(response) {
		matches := lineRegex.FindStringSubmatch(line)
		if len(matches) == 4 {
			idToScore[matches[1]] = parseFloat(matches[2])
			idToRationale[matches[1]] = matches[3]
		}
	}

	for _, c := range candidates {
		score := 5.0
		rationale := "Default score"
		if s, ok := idToScore[c.ID]; ok {
			score = s
		}
		if r, ok := idToRationale[c.ID]; ok {
			rationale = r
		}
		scored = append(scored, ScoredCandidate{
			Candidate: c,
			Score:     score,
			Rationale: rationale,
		})
	}

	return scored
}

func splitLines(s string) []string {
	var lines []string
	start := 0
	for i, r := range s {
		if r == '\n' {
			lines = append(lines, s[start:i])
			start = i + 1
		}
	}
	if start < len(s) {
		lines = append(lines, s[start:])
	}
	return lines
}

func parseFloat(s string) float64 {
	var f float64
	fmt.Sscanf(s, "%f", &f)
	return f
}

func cacheKey(candidates []Candidate) string {
	key := ""
	for _, c := range candidates {
		key += c.ID + c.Type
	}
	return key
}
