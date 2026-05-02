# Implementation Plan: Documentation Truth-Up

## Phase 1: Audit Contradictions

- [x] Task: Inventory contradictions
    - [x] Read `measure/product.md`, `measure/product-guidelines.md`, `measure/tech-stack.md` in full.
    - [x] List every statement that conflicts with running code or another doc.
    - [x] Confirm the three known contradictions (concurrency policy, markdown truth, capability #6).

## Phase 2: Rewrite Docs

- [x] Task: Rewrite `measure/product.md`
    - [x] Update concurrency policy statement to match actual allocator defaults.
    - [x] Add "Runtime Truth Boundaries" section (markdown owns tracks/plans/lessons; Convex owns stats/runs/coordination; nothing duplicated).
    - [x] Change capability #6 from "Reversible import/export" to "Documentation import + derived state."
    - [x] Remove or reconcile any other conflicting statements found in Phase 1.

- [x] Task: Rewrite `measure/product-guidelines.md`
    - [x] Align "source of truth" language with the Runtime Truth Boundaries section in `product.md`.
    - [x] Remove any statement that contradicts the updated `product.md`.

- [x] Task: Rewrite `measure/tech-stack.md`
    - [x] Remove or correct any claims that conflict with the updated `product.md`.
    - [x] Ensure one canonical statement per technology choice.

## Phase 3: Verification

- [x] Task: Cross-check all three docs
    - [x] Confirm no conflicting statements remain between the three files.
    - [x] Confirm "Runtime Truth Boundaries" section is present and complete in `product.md`.
    - [x] Confirm capability #6 wording is updated.
    - [x] Confirm no code files were modified.
