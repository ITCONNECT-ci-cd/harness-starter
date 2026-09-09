---
deferred_work_file: '{implementation_artifacts}/deferred-work.md'
specLoopIteration: 1
---

# Step 4: Review

## RULES

- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`
- Review subagents get NO conversation context.

## INSTRUCTIONS

Change `{spec_file}` status to `in-review` in the frontmatter before continuing.

### Construct Diff

Read `{baseline_commit}` and the pre-implementation working-state record. Construct `{diff_output}` for this task's tracked and untracked changes relative to that original working state. Exclude pre-existing user changes even when they share a file with this task. If the baseline is missing or `NO_VCS`, establish ownership from available evidence; disclose any uncertainty instead of including unrelated work in the task diff.

Do NOT `git add` anything — this is read-only inspection.

### Review

When authorized delegation is available, launch the three review roles below without conversation context. Otherwise perform their checks sequentially and disclose that review was not independent. If the user or project explicitly requires independent approval, prepare review prompts and mark only that approval pending; do not claim it passed.

Record `independent_review_required` and `independent_review_status` in `{spec_file}` frontmatter. Use `not-required` when no independent approval is required, `pending` while a required review is unavailable or unresolved, and `passed` only after the required reviewer actually approves. A sequential self-review cannot satisfy a required independent approval. Preserve `pending` when moving to the presentation step.

- **Blind hunter** — receives `{diff_output}` only. No spec, no context docs, no project access. Invoke via the `bmad-review-adversarial-general` skill.
- **Edge case hunter** — receives `{diff_output}` and read access to the project. Invoke via the `bmad-review-edge-case-hunter` skill.
- **Acceptance auditor** — receives `{diff_output}`, `{spec_file}`, and read access to the project. Must also read the docs listed in `{spec_file}` frontmatter `context`. Checks for violations of acceptance criteria, rules, and principles from the spec and context docs.

### Classify

1. Deduplicate all review findings.
2. Classify each finding. The first three categories are **this story's problem** — caused or exposed by the current change. The last two are **not this story's problem**.
   - **intent_gap** — caused by the change; cannot be resolved from the spec because the captured intent is incomplete. Do not infer intent unless there is exactly one possible reading.
   - **bad_spec** — caused by the change, including direct deviations from spec. The spec should have been clear enough to prevent it. When in doubt between bad_spec and patch, prefer bad_spec — a spec-level fix is more likely to produce coherent code.
   - **patch** — caused by the change; trivially fixable without human input. Just part of the diff.
   - **defer** — pre-existing issue not caused by this story, surfaced incidentally by the review. Collect for later focused attention.
   - **reject** — noise. Drop silently. When unsure between defer and reject, prefer reject — only defer findings you are confident are real.
3. Process findings in cascading order. If intent_gap or bad_spec findings exist, they trigger a loopback — lower findings are moot since code will be re-derived. If neither exists, process patch and defer normally. Increment `{specLoopIteration}` on each loopback. If it exceeds 5, HALT and escalate to the human.
   - **intent_gap** — Root cause is inside `<frozen-after-approval>`. Preserve existing work and ask about the unresolved requirement; continue independent fixes. Rework only this task's changes after the requirement is resolved. Once resolved, read fully and follow `./step-02-plan.md` to re-run steps 2–4.
   - **bad_spec** — Root cause is outside `<frozen-after-approval>`. Before reverting code: extract KEEP instructions for positive preservation (what worked well and must survive re-derivation). Rework only this task's affected changes, preserving unrelated user work. Read the `## Spec Change Log` in `{spec_file}` and strictly respect all logged constraints when amending the non-frozen sections that contain the root cause. Append a new change-log entry recording: the triggering finding, what was amended, the known-bad state avoided, and the KEEP instructions. Read fully and follow `./step-03-implement.md` to re-derive the code, then this step will run again.
   - **patch** — Auto-fix. These are the only findings that survive loopbacks.
   - **defer** — Append to `{deferred_work_file}`.
   - **reject** — Drop silently.

## NEXT

Run the checks required by the repository for the final changed behavior, including any review patches. Reuse passing checks only if their relevant working state is unchanged. Keep unresolved findings and failed checks visible. Read fully and follow `./step-05-present.md`; presentation does not imply completion.
