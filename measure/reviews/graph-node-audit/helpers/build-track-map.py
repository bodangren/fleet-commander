#!/usr/bin/env python3
"""Build a mapping from every TS/TSX file path -> originating archive track.

Algorithm:
  1. Walk measure/archive/*/metadata.json to collect track date windows & ids.
  2. Run `git log --reverse --diff-filter=A --name-status --format='COMMIT|...'`
     ONCE across the whole repo, capturing every file's introducing commit.
  3. For each TS/TSX file: pick the archived track whose [created_at, completed+3d]
     window contains the introducing commit. Fallbacks: (a) track id slug substring
     in commit subject; (b) YYYYMMDD slug ±14d nearest; (c) "unmapped".
  4. Output JSON: { "<rel_path>": {commit, date, subject, track, candidates[]} }
"""
import json
import os
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[4]
ARCHIVE = REPO / "measure" / "archive"
OUT = REPO / "measure" / "reviews" / "graph-node-audit" / "inventories" / "file-to-track.json"


def _parse_dt(s):
    if not s:
        return None
    try:
        s2 = s.replace("Z", "+00:00")
        if "T" not in s2:
            s2 = s2 + "T00:00:00+00:00"
        dt = datetime.fromisoformat(s2)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


def load_tracks():
    tracks = []
    for meta_path in sorted(ARCHIVE.glob("*/metadata.json")):
        try:
            meta = json.loads(meta_path.read_text())
        except Exception:
            continue
        tid = meta.get("track_id") or meta_path.parent.name
        c0 = _parse_dt(meta.get("created_at"))
        c1 = _parse_dt(meta.get("completed") or meta.get("updated_at")) or c0
        # Pull YYYYMMDD from the track id slug
        slug_date = None
        if "_" in tid:
            tail = tid.rsplit("_", 1)[-1]
            if tail.isdigit() and len(tail) == 8:
                try:
                    slug_date = datetime.strptime(tail, "%Y%m%d").replace(tzinfo=timezone.utc)
                except Exception:
                    pass
        tracks.append({
            "id": tid,
            "type": meta.get("type", "?"),
            "status": meta.get("status", "?"),
            "start": c0,
            "end": c1,
            "slug_date": slug_date,
            "slug_keywords": [w for w in tid.split("_") if w and not w.isdigit()],
        })
    return tracks


def git_log_add_events():
    """Returns dict: rel_path -> (commit, isoDate, subject) for first add event."""
    cmd = [
        "git", "-C", str(REPO), "log",
        "--reverse", "--diff-filter=A", "--name-status",
        "--format=COMMIT|%H|%aI|%s",
    ]
    out = subprocess.check_output(cmd, text=True, errors="replace")
    introduced = {}
    cur = None
    for line in out.splitlines():
        if line.startswith("COMMIT|"):
            parts = line.split("|", 3)
            cur = {"commit": parts[1], "date": parts[2], "subject": parts[3] if len(parts) > 3 else ""}
            continue
        if not cur or not line.strip():
            continue
        # Format: "A\t<path>"
        bits = line.split("\t")
        if len(bits) >= 2 and bits[0].startswith("A"):
            path = bits[1]
            if path not in introduced:  # first (oldest) introducing commit wins
                introduced[path] = dict(cur)
    return introduced


def match_track(path, intro, tracks):
    """Pick best track for an introducing commit on `path`."""
    if not intro:
        return None, []
    ts = _parse_dt(intro["date"])
    subj_low = intro["subject"].lower()
    path_low = path.lower()

    # 1) Window-match: intro timestamp inside [start, end+3d]
    window_hits = []
    if ts:
        for t in tracks:
            if t["start"] and t["end"] and t["start"] <= ts <= t["end"] + timedelta(days=3):
                window_hits.append(t)

    # 2) Subject mention: track id slug present in commit subject
    subj_hits = []
    for t in tracks:
        # Use 2+ keywords of the track id (not the date) for a strong match
        kws = [k for k in t["slug_keywords"] if len(k) >= 4]
        score = sum(1 for k in kws if k in subj_low)
        if score >= 2:
            subj_hits.append((score, t))

    # 3) Path-keyword match
    path_hits = []
    for t in tracks:
        kws = [k for k in t["slug_keywords"] if len(k) >= 5]
        score = sum(1 for k in kws if k in path_low)
        if score >= 2:
            path_hits.append((score, t))

    candidates = []
    # rank: subject mentions first (most reliable), then window, then path
    subj_hits.sort(key=lambda x: -x[0])
    for s, t in subj_hits[:3]:
        candidates.append({"track": t["id"], "type": t["type"], "via": f"subject({s})"})
    for t in window_hits[:3]:
        if not any(c["track"] == t["id"] for c in candidates):
            candidates.append({"track": t["id"], "type": t["type"], "via": "window"})
    path_hits.sort(key=lambda x: -x[0])
    for s, t in path_hits[:3]:
        if not any(c["track"] == t["id"] for c in candidates):
            candidates.append({"track": t["id"], "type": t["type"], "via": f"path({s})"})

    # 4) Nearest slug-date as last resort
    if not candidates and ts:
        nearest = None
        nearest_delta = None
        for t in tracks:
            if t["slug_date"]:
                d = abs((ts - t["slug_date"]).days)
                if nearest_delta is None or d < nearest_delta:
                    nearest, nearest_delta = t, d
        if nearest and nearest_delta is not None and nearest_delta <= 14:
            candidates.append({"track": nearest["id"], "type": nearest["type"], "via": f"slug±{nearest_delta}d"})

    best = candidates[0]["track"] if candidates else None
    return best, candidates


def main():
    tracks = load_tracks()
    print(f"[track-map] {len(tracks)} archived tracks loaded", file=sys.stderr)
    intros = git_log_add_events()
    print(f"[track-map] {len(intros)} file introductions found", file=sys.stderr)

    result = {}
    for path, intro in intros.items():
        if not (path.endswith(".ts") or path.endswith(".tsx")):
            continue
        # Skip vendor/build output
        if any(seg in path for seg in ("node_modules/", "/dist/", "/.bun/", "_generated/")):
            continue
        best, cands = match_track(path, intro, tracks)
        result[path] = {
            "introducing_commit": intro["commit"][:10],
            "introduced_at": intro["date"],
            "introducing_subject": intro["subject"],
            "best_track": best,
            "candidates": cands,
        }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, indent=2, sort_keys=True))
    mapped = sum(1 for v in result.values() if v["best_track"])
    print(f"[track-map] wrote {OUT} — {len(result)} files, {mapped} mapped", file=sys.stderr)


if __name__ == "__main__":
    main()
