#!/usr/bin/env python3
"""Generate per-slice node inventories for the graph-node review.

Each slice is a directory glob (e.g. `pivot/src/orchestrator/`). For each slice:
  - List every node (function, class, interface, type_alias, schema, route, file)
    whose `file_path` falls inside the slice.
  - Annotate with: originating track, introducing commit, in-edges, out-edges.
  - Emit `inventories/<slice>.json` and `inventories/<slice>.md` for the subagent.

We deliberately *exclude* `param` nodes from the per-node review (they roll up
into their parent function) but keep them queryable in the graph.
"""
import json
import sqlite3
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[4]
GRAPH_DB = REPO / "graph.db"
FILE_TO_TRACK = REPO / "measure" / "reviews" / "graph-node-audit" / "inventories" / "file-to-track.json"
OUT_DIR = REPO / "measure" / "reviews" / "graph-node-audit" / "inventories"

SLICES = [
    {
        "id": "slice-1-pivot-orchestrator",
        "title": "pivot/orchestrator core",
        "globs": ["pivot/src/orchestrator/"],
    },
    {
        "id": "slice-2-pivot-policy-pipeline",
        "title": "pivot/policy + pivot/pipeline + scoring",
        "globs": ["pivot/src/policy/", "pivot/src/pipeline/", "pivot/src/economics/", "pivot/src/dispatch/"],
    },
    {
        "id": "slice-3-pivot-rest",
        "title": "pivot/routes + server + reconciliation + performance + git + failover + everything-else-pivot",
        "globs": ["pivot/"],
        "exclude_prefixes": ["pivot/src/orchestrator/", "pivot/src/policy/", "pivot/src/pipeline/",
                             "pivot/src/economics/", "pivot/src/dispatch/"],
    },
    {
        "id": "slice-4-frontend-pages-components",
        "title": "frontend/pages + frontend/components",
        "globs": ["frontend/src/pages/", "frontend/src/components/", "frontend/src/widgets/",
                  "frontend/src/features/"],
    },
    {
        "id": "slice-5-frontend-lib-hooks",
        "title": "frontend/lib + frontend/hooks + fixtures + the rest of frontend",
        "globs": ["frontend/src/"],
        "fallback_package": "frontend",
        "exclude_prefixes": ["frontend/src/pages/", "frontend/src/components/",
                             "frontend/src/widgets/", "frontend/src/features/"],
    },
    {
        "id": "slice-6-convex",
        "title": "convex backend (schema + queries + mutations + analytics)",
        "globs": ["convex/"],
    },
]


def relpath(p):
    s = str(p)
    if s.startswith(str(REPO) + "/"):
        return s[len(str(REPO)) + 1:]
    return s


def main():
    file_to_track = json.loads(FILE_TO_TRACK.read_text())
    conn = sqlite3.connect(str(GRAPH_DB))
    conn.row_factory = sqlite3.Row

    # Pull all non-param nodes once
    nodes = conn.execute(
        """SELECT id, type, name, file_path, line_start, line_end, summary, tags, complexity, package_id
           FROM nodes
           WHERE type IN ('file','function','class','interface','type_alias','schema','route')
           ORDER BY file_path, line_start"""
    ).fetchall()

    # Edge tallies per node id
    edge_in = {}
    edge_out = {}
    for r in conn.execute("SELECT source, target, type FROM edges").fetchall():
        edge_out.setdefault(r["source"], []).append((r["type"], r["target"]))
        edge_in.setdefault(r["target"], []).append((r["type"], r["source"]))

    # Build slice -> nodes
    slice_nodes = {s["id"]: [] for s in SLICES}
    leftovers = []
    for n in nodes:
        fp = n["file_path"] or ""
        rel = relpath(fp)
        assigned = False
        for s in SLICES:
            # Exclude rules first
            excl = s.get("exclude_prefixes", [])
            if any(rel.startswith(e) for e in excl):
                continue
            # Glob match (prefix)
            if any(rel.startswith(g) for g in s["globs"]):
                slice_nodes[s["id"]].append((n, rel))
                assigned = True
                break
        if not assigned:
            leftovers.append((n, rel))

    # Summarise + write per slice
    summary = {}
    for s in SLICES:
        bucket = slice_nodes[s["id"]]
        by_file = {}
        type_counts = {}
        for n, rel in bucket:
            by_file.setdefault(rel, []).append(dict(n))
            type_counts[n["type"]] = type_counts.get(n["type"], 0) + 1

        # File-level entries (with track info + node list)
        files_out = []
        for rel, ns in sorted(by_file.items()):
            tinfo = file_to_track.get(rel) or {}
            in_edges_file = len(edge_in.get(f"file:{rel}", [])) + len(edge_in.get(ns[0]["file_path"] if ns else "", []))
            # Some queries use absolute file: ids — count both
            abs_fid = ns[0]["file_path"] if ns else ""
            file_node = next((x for x in ns if x["type"] == "file"), None)
            node_summaries = []
            for x in ns:
                if x["type"] == "file":
                    continue
                nid = x["id"]
                ie = len(edge_in.get(nid, []))
                oe = len(edge_out.get(nid, []))
                node_summaries.append({
                    "id": nid,
                    "type": x["type"],
                    "name": x["name"],
                    "lines": f"{x['line_start']}-{x['line_end']}",
                    "summary": (x["summary"] or "")[:200],
                    "tags": x["tags"] or "",
                    "complexity": x["complexity"],
                    "in_edges": ie,
                    "out_edges": oe,
                })
            files_out.append({
                "file": rel,
                "track": tinfo.get("best_track"),
                "commit": tinfo.get("introducing_commit"),
                "commit_date": (tinfo.get("introduced_at") or "")[:10],
                "commit_subject": tinfo.get("introducing_subject"),
                "track_candidates": tinfo.get("candidates", []),
                "file_imports": len([e for e in edge_in.get(abs_fid, []) if e[0] == "imports"]) if abs_fid else 0,
                "node_count": len(node_summaries),
                "nodes": node_summaries,
            })
        # Write JSON
        out_json = OUT_DIR / f"{s['id']}.json"
        out_json.write_text(json.dumps({
            "slice_id": s["id"],
            "slice_title": s["title"],
            "globs": s["globs"],
            "file_count": len(files_out),
            "node_count": sum(f["node_count"] for f in files_out),
            "type_counts": type_counts,
            "files": files_out,
        }, indent=2))
        # Write MD summary (compact for the subagent)
        md = [f"# {s['title']}", "", f"**Slice ID:** `{s['id']}`",
              f"**Files:** {len(files_out)}  ·  **Nodes:** {sum(f['node_count'] for f in files_out)}", ""]
        md.append("| Type | Count |")
        md.append("|------|-------|")
        for t, c in sorted(type_counts.items(), key=lambda x: -x[1]):
            md.append(f"| {t} | {c} |")
        md.append("")
        md.append("## Files in this slice (with originating track)")
        md.append("")
        md.append("| File | Originating Track | Intro Commit | Nodes |")
        md.append("|------|-------------------|--------------|-------|")
        for f in files_out:
            md.append(f"| `{f['file']}` | `{f['track'] or '-'}` | `{f['commit'] or '-'}` ({f['commit_date'] or '-'}) | {f['node_count']} |")
        out_md = OUT_DIR / f"{s['id']}.md"
        out_md.write_text("\n".join(md) + "\n")

        summary[s["id"]] = {
            "title": s["title"],
            "files": len(files_out),
            "nodes": sum(f["node_count"] for f in files_out),
            "types": type_counts,
        }
        print(f"[slice] {s['id']:36s}  files={len(files_out):3d}  nodes={sum(f['node_count'] for f in files_out):4d}", file=sys.stderr)

    if leftovers:
        # Drop leftovers under slice-7 for awareness
        unassigned_md = ["# Unassigned files", "", "Files whose path didn't match any slice glob:", ""]
        for n, rel in sorted({(x[1], x[0]["type"]) for x in leftovers}):
            unassigned_md.append(f"- `{rel}` ({n})")
        (OUT_DIR / "unassigned.md").write_text("\n".join(unassigned_md) + "\n")
        print(f"[slice] unassigned: {len({l[1] for l in leftovers})} files", file=sys.stderr)

    (OUT_DIR / "summary.json").write_text(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
