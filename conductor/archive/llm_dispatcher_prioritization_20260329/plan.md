# Implementation Plan - LLM Dispatcher (Prioritization Engine)

## Phase 1: Core Data Structures

- [x] Task: Define `Candidate` struct for unified task/issue representation
  - [x] Write unit tests for Candidate struct
  - [x] Implement Candidate with fields: id, title, description, type, priority, createdAt, score, rationale

- [x] Task: Define `ScoredCandidate` for ranked output
  - [x] Write unit tests for ScoredCandidate
  - [x] Implement ScoredCandidate with score, rationale, and rank fields

- [x] Task: Create CandidateStore interface
  - [x] Write tests for interface methods
  - [x] Implement interface with method signatures for fetching tasks and issues

## Phase 2: Task Aggregation

- [x] Task: Implement TaskAggregator service
  - [x] Write tests for task fetching from plan.md files
  - [x] Implement `FetchPendingTasks() []Candidate`
  - [x] Write tests for issue fetching from conductor/issues/
  - [x] Implement `FetchOpenIssues() []Candidate`
  - [x] Implement `GetCandidates() []Candidate` that merges both

- [x] Task: Add scoring request builder
  - [x] Write tests for prompt template generation
  - [x] Implement `BuildScoringPrompt(candidates []Candidate, personas []Agent) string`

## Phase 3: LLM Scoring

- [x] Task: Create LLM-based scorer
  - [x] Write tests for scorer with mock LLM responses
  - [x] Implement `Scorer` interface with `Score(candidates []Candidate) ([]ScoredCandidate, error)`
  - [x] Implement `LLMScorer` that calls LLM with scoring prompt

- [x] Task: Add fallback priority scorer
  - [x] Write tests for fallback scoring
  - [x] Implement `PriorityScorer` for non-LLM fallback
  - [x] Add scoring selection logic: use LLM if available, else fallback

- [x] Task: Add score caching with TTL
  - [x] Write tests for cache behavior
  - [x] Implement in-memory cache with 30-second TTL on scores

## Phase 4: Ranking & Selection

- [x] Task: Implement ranking algorithm
  - [x] Write tests for ranking with sample candidates
  - [x] Implement `Rank(scoredCandidates []ScoredCandidate) []ScoredCandidate`
  - - Combine LLM score + age boost + dependency match + persona match

- [x] Task: Implement single task selector
  - [x] Write tests for selection logic
  - [x] Implement `SelectTop(scoredCandidates []ScoredCandidate) *ScoredCandidate`
  - [x] Handle empty candidate list gracefully

## Phase 5: REST API

- [x] Task: Create dispatcher HTTP handlers
  - [x] Write handler tests
  - [x] Implement `GET /api/dispatcher/next` handler
  - [x] Write integration test for next endpoint
  - [x] Implement `GET /api/dispatcher/candidates` handler
  - [x] Write integration test for candidates endpoint

- [x] Task: Wire up routes
  - [x] Add dispatcher routes to main router
  - [x] Write tests for route registration

## Phase 6: Observability & Logging

- [x] Task: Add structured logging
  - [x] Write tests for logging format
  - [x] Log scoring input summary, LLM response, final decision
  - [x] Implement dispatch history recording

## Phase 7: Verification

- [x] Task: Run all tests and verify build
  - [x] Run `go test ./...` - all tests pass
  - [x] Run `go build .` - builds successfully
  - [x] Manual API test: verify endpoints return expected response
  - [x] Update track plan status to complete