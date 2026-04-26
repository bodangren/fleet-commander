# Implementation Plan - Static Analysis Integration

## Phase 1: Analysis Configuration and Parser

- [x] Task: Create `frontend/src/lib/analysis.ts` with `AnalysisConfig`, `ToolConfig`, `AnalysisResult` interfaces
- [x] Task: Implement `parseAnalysisConfig(yamlContent: string)` function to parse `measure/analysis.yml`
- [x] Task: Define default severity maps for eslint, ruff, and typescript
- [x] Task: Write tests for config parsing with valid, missing, and malformed YAML

## Phase 2: Result Parsers

- [x] Task: Implement `parseJsonAnalysisResult(tool, data)` for eslint/ruff JSON output
- [x] Task: Implement `parseTextAnalysisResult(tool, output)` for text-based output
- [x] Task: Map tool-specific severity strings to canonical `error`/`warning`/`info`
- [x] Task: Write tests with real sample outputs from each supported tool

## Phase 3: Convex Storage

- [x] Task: Add `analysisResults` table to `convex/schema.ts` with indexes
- [x] Task: Create `convex/analysisResults.ts` with `storeAnalysisResults`, `getAnalysisByExecution`, `getAnalysisHistory` functions
- [x] Task: Write tests for Convex functions

## Phase 4: Dashboard Integration

- [x] Task: Add `useAnalysisResults()` hook in `frontend/src/lib/useConvexData.ts`
- [x] Task: Build `AnalysisResults` component with file-grouped findings and severity filter
- [x] Task: Add "Analysis" tab to task detail view
- [x] Task: Add `GET /api/analysis/:executionId` route in `pivot/src/routes/analysis.ts`

## Phase 5: Verification

- [x] Task: Run frontend unit tests (all must pass)
- [x] Task: Run Playwright e2e tests (all must pass)
- [x] Task: Run lint and type checks
- [x] Task: Update plan.md checkboxes, write deviation notes if any
