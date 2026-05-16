#!/usr/bin/env bash
# measure/automation-script.sh
#
# Automates Fleet Commander track completion using a tiered AI pipeline:
#   Sr dev (per track)  -- writes test-strategy.md
#   Mid dev (per phase) -- writes failing tests (Red)
#   Jr dev (per phase)  -- implements to pass tests (Green)
#   Sr dev (per track)  -- final review + tech-debt clearance
#
# Usage:
#   chmod +x measure/automation-script.sh
#   ./measure/automation-script.sh              # all incomplete tracks/phases
#   ./measure/automation-script.sh --start 2    # start from 2nd incomplete phase
#   ./measure/automation-script.sh --dry-run    # preview without executing
#   ./measure/automation-script.sh --track perf # filter tracks by regex
#   ./measure/automation-script.sh --skip-strategy

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# --- AI Runner Configuration ---------------------------------------------
# Override with env vars to use different models or tools.
# Examples:
#   JR_RUNNER="opencode run -m some-junior-model"
#   MID_RUNNER="kimi -y -p"
#   SR_RUNNER="opencode run -m some-senior-model"
JR_RUNNER="${JR_RUNNER:-opencode run -m minimax-cn-coding-plan/MiniMax-M2.7}"
MID_RUNNER="${MID_RUNNER:-kimi -y -p}"
SR_RUNNER="${SR_RUNNER:-opencode run -m xiaomi/mimo-v2.5}"

# --- Project-specific settings -------------------------------------------
FC_PATHS="pivot/src/, frontend/src/, convex/"
FC_TESTS="bun --cwd pivot test && bun --cwd frontend test"
FC_CHECKS="bun --cwd pivot typecheck && bun --cwd frontend check"
FC_LINT="npm run lint"
FC_DEV_URL="http://localhost:5173"

# --- Parse arguments -----------------------------------------------------
START_PHASE=1
DRY_RUN=false
TRACK_FILTER=""
SKIP_STRATEGY=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --start)
      START_PHASE="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --track)
      TRACK_FILTER="$2"
      shift 2
      ;;
    --skip-strategy)
      SKIP_STRATEGY=true
      shift
      ;;
    -h|--help)
      cat <<EOF
Usage: $0 [OPTIONS]

Automates Fleet Commander track completion.

Options:
  --start N         Start from the Nth incomplete phase (1-based)
  --dry-run         Preview the plan without executing
  --track REGEX     Only process tracks matching the regex
  --skip-strategy   Skip Sr dev test-strategy generation (assume it exists)
  -h, --help        Show this help message

Environment variables:
  JR_RUNNER         Command prefix for the junior implementation agent
  MID_RUNNER        Command prefix for the mid test-writing agent
  SR_RUNNER         Command prefix for the senior review agent
EOF
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      exit 1
      ;;
  esac
done

# --- Auto-discover tracks ------------------------------------------------
mapfile -t ALL_TRACKS < <(
  for dir in "$REPO_ROOT/measure/tracks"/*/; do
    [ -d "$dir" ] || continue
    basename "$dir"
  done | sort
)

TRACKS=()
for t in "${ALL_TRACKS[@]}"; do
  if [[ -n "$TRACK_FILTER" && ! "$t" =~ $TRACK_FILTER ]]; then
    continue
  fi
  TRACKS+=("$t")
done

if [[ ${#TRACKS[@]} -eq 0 ]]; then
  echo "No tracks found matching filter: $TRACK_FILTER"
  exit 0
fi

# --- Discover incomplete phases using Python -----------------------------
# Groups phases by track. Skips deferred tasks (any task line containing
# "deferred" is treated as intentionally excluded).
TRACKS_CSV="$(IFS=,; echo "${TRACKS[*]}")"
PHASE_DATA="$(python3 -c "
import re, os, sys

tracks = sys.argv[1].split(',')
repo = sys.argv[2]

for tid in tracks:
    plan_path = os.path.join(repo, 'measure', 'tracks', tid, 'plan.md')
    if not os.path.isfile(plan_path):
        continue
    text = open(plan_path).read()
    phases = re.split(r'(?=^## Phase )', text, flags=re.MULTILINE)
    for phase in phases:
        heading_match = re.match(r'^## (Phase .+)', phase, re.MULTILINE)
        if not heading_match:
            continue
        heading_line = heading_match.group(0)
        all_tasks = re.findall(r'^- \[([ ~x])\] (.+)', phase, re.MULTILINE)
        incomplete = 0
        for status, task_text in all_tasks:
            if status != 'x' and 'deferred' not in task_text.lower():
                incomplete += 1
        total = len(all_tasks)
        if incomplete > 0:
            display = re.sub(r'^## ', '', heading_line)
            display = re.sub(r' *\[(checkpoint|final-verification):[^\]]*\]', '', display)
            print(f'{tid}|{display}|{incomplete}|{total}')
" "$TRACKS_CSV" "$REPO_ROOT")"

if [[ -z "$PHASE_DATA" ]]; then
  echo ""
  echo "All phases are already complete! Nothing to run."
  exit 0
fi

# --- Build arrays from Python output -------------------------------------
declare -a PHASE_TRACK=()
declare -a PHASE_HEADING=()
declare -a PHASE_INCOMPLETE=()
declare -a PHASE_TOTAL=()

while IFS='|' read -r tid heading incomplete total; do
  PHASE_TRACK+=("$tid")
  PHASE_HEADING+=("$heading")
  PHASE_INCOMPLETE+=("$incomplete")
  PHASE_TOTAL+=("$total")
done <<< "$PHASE_DATA"

TOTAL_PHASES=${#PHASE_TRACK[@]}

# --- Validate --start argument -------------------------------------------
if [[ $START_PHASE -lt 1 ]] || [[ $START_PHASE -gt $TOTAL_PHASES ]]; then
  echo "ERROR: --start must be between 1 and $TOTAL_PHASES"
  exit 1
fi

# --- Print header --------------------------------------------------------
echo ""
echo "+--------------------------------------------------------------+"
echo "|   Fleet Commander -- Automated Production Pipeline           |"
echo "+--------------------------------------------------------------+"
echo ""
echo "Tracks selected: ${#TRACKS[@]}"
echo "Incomplete phases found: $TOTAL_PHASES (completed phases are skipped)"
echo ""

for i in $(seq 0 $((TOTAL_PHASES - 1))); do
  num=$((i + 1))
  if [[ $num -lt $START_PHASE ]]; then
    echo "  [$num] ${PHASE_TRACK[$i]} -- ${PHASE_HEADING[$i]}  (${PHASE_INCOMPLETE[$i]}/${PHASE_TOTAL[$i]} remaining)  (skipped)"
  else
    echo "  [$num] ${PHASE_TRACK[$i]} -- ${PHASE_HEADING[$i]}  (${PHASE_INCOMPLETE[$i]}/${PHASE_TOTAL[$i]} remaining)"
  fi
done

echo ""

if [[ $DRY_RUN == true ]]; then
  echo "DRY RUN -- no commands will be executed."
  echo "Would start from phase $START_PHASE."
  exit 0
fi

# --- Helper: check if a track has more phases later in the list ---------
has_more_phases() {
  local current_idx="$1"
  local track_id="$2"
  local j
  for ((j = current_idx + 1; j < TOTAL_PHASES; j++)); do
    if [[ "${PHASE_TRACK[$j]}" == "$track_id" ]]; then
      return 0
    fi
  done
  return 1
}

# --- Main production loop ------------------------------------------------
declare -A TRACK_STRATEGY_CHECKED

for i in $(seq "$START_PHASE" "$TOTAL_PHASES"); do
  idx=$((i - 1))
  track_id="${PHASE_TRACK[$idx]}"
  phase_heading="${PHASE_HEADING[$idx]}"
  plan_file="measure/tracks/$track_id/plan.md"
  strategy_file="measure/tracks/$track_id/test-strategy.md"

  echo "=============================================================="
  echo "  Phase $i of $TOTAL_PHASES: $phase_heading"
  echo "  Track:  $track_id"
  echo "  Plan:   $plan_file"
  echo "  Tasks:  ${PHASE_INCOMPLETE[$idx]}/${PHASE_TOTAL[$idx]} remaining"
  echo "=============================================================="
  echo ""

  # -- Track Setup: Sr dev test strategy (once per track) ---------------
  if [[ "$SKIP_STRATEGY" == false && -z "${TRACK_STRATEGY_CHECKED[$track_id]:-}" ]]; then
    if [[ ! -f "$REPO_ROOT/$strategy_file" ]]; then
      echo ">>> [Track Setup] Sr dev writing test-strategy.md for $track_id"
      echo ""

      STRATEGY_PROMPT="Load the measure skill. Read measure/index.md, $plan_file, and measure/tracks/$track_id/spec.md if it exists. You are the Tech Lead for this track. Write a concise test-strategy.md in the same directory with: (1) testing pyramid guidance per phase (unit vs integration vs e2e), (2) shared test fixtures or mocks needed across phases, (3) cross-phase edge cases and dependencies, (4) architecture guardrails -- existing patterns to reuse and anti-patterns to avoid, (5) brief per-phase test approach notes. Keep it under 100 lines. Do NOT write implementation code. Do NOT modify existing source files."

      if ! $SR_RUNNER "$STRATEGY_PROMPT"; then
        echo "ERROR: Sr dev failed to write test strategy for $track_id"
        exit 1
      fi
      echo ""
      echo ">>> Track strategy complete for $track_id"
      echo ""
    else
      echo ">>> Using existing test-strategy.md for $track_id"
    fi
    TRACK_STRATEGY_CHECKED["$track_id"]=1
  fi

  # -- Step 1: Mid dev writes failing tests -----------------------------
  echo ">>> [Step 1/2] Mid dev writing tests for: $phase_heading"
  echo ""

  STEP1_PROMPT="Load the measure skill. Read measure/index.md, $strategy_file, and $plan_file. Focus on the current phase: $phase_heading. You are writing failing tests (Red phase) for the next uncompleted tasks in this phase. Follow the test strategy. Work in the Fleet Commander codebase: $FC_PATHS. Write tests first. Mark tasks as [~] in plan.md as you start them. Do NOT implement feature logic. Do NOT modify existing source code. Commit tests with a descriptive Conventional Commit message. If the test strategy is unclear or contradicts existing patterns, add a brief note to measure/tech-debt.md."

  if ! $MID_RUNNER "$STEP1_PROMPT"; then
    echo "ERROR: Mid dev failed for phase $phase_heading"
    exit 1
  fi

  echo ""
  echo ">>> Step 1 complete: tests written for $phase_heading"
  echo ""

  # -- Step 2: Jr dev implements to pass tests --------------------------
  echo ">>> [Step 2/2] Jr dev implementing: $phase_heading"
  echo ""

  STEP2_PROMPT="Load the measure skill. Read $plan_file and the tests just written for phase $phase_heading. Implement the feature logic to make all tests pass (Green phase). Follow existing code patterns in $FC_PATHS. Do NOT modify the tests. Do NOT create new architectural patterns or utility libraries -- reuse existing ones. If a test is impossible to satisfy without breaking architecture or existing patterns, STOP and add a tech-debt item to measure/tech-debt.md with severity (Critical/High/Medium/Low) and a brief description. Keep tech-debt.md at or below 50 lines -- prune resolved items first if needed. Commit implementation with a descriptive Conventional Commit message and update plan.md: mark completed tasks as [x] and record the commit SHA."

  if ! $JR_RUNNER "$STEP2_PROMPT"; then
    echo "ERROR: Jr dev failed for phase $phase_heading"
    exit 1
  fi

  echo ""
  echo ">>> Step 2 complete: implementation done for $phase_heading"
  echo ""

  # -- Track Closeout: Sr dev final review (last phase of track) --------
  if ! has_more_phases "$idx" "$track_id"; then
    echo "=============================================================="
    echo "  Track Closeout: $track_id"
    echo "=============================================================="
    echo ""

    FINAL_PROMPT="Load the measure skill. Perform final review for track $track_id. Read $plan_file and verify all tasks are marked [x] with commit SHAs. Review measure/tech-debt.md for items related to this track: (1) if an issue is a quick fix under 5 minutes, fix it now and mark Resolved, (2) if already fixed in this track, mark Resolved with a note, (3) if significant work remains, leave Open with a brief deferral note. Keep tech-debt.md at or below 50 lines. Run the full quality gate: $FC_LINT, $FC_CHECKS, and $FC_TESTS. Use the kimi-webbridge skill to visually verify changes at $FC_DEV_URL if applicable. Commit any fixes with Conventional Commits. If all phases are complete, note that the track is ready for archival."

    if ! $SR_RUNNER "$FINAL_PROMPT"; then
      echo "WARNING: Sr dev final review failed for $track_id"
      echo "Review manually before archiving."
    else
      echo ""
      echo ">>> Track closeout complete for $track_id"
      echo "    Reminder: Update measure/tracks.md and consider archiving"
      echo "    the track directory to measure/archive/ when verified."
    fi
    echo ""
  fi

  echo "  Phase $i of $TOTAL_PHASES done."
  echo ""
done

echo ""
echo "+--------------------------------------------------------------+"
printf "|   All %d phases processed!                                   |\n" "$TOTAL_PHASES"
echo "+--------------------------------------------------------------+"
echo ""
