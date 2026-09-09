---
deferred_work_file: '{implementation_artifacts}/deferred-work.md'
---

# Step One-Shot: Implement, Review, Present

## RULES

- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`
- NEVER auto-push.

## INSTRUCTIONS

### Implement

Implement the clarified intent directly.

### Review

Review the changed behavior and required checks directly for a small change. Use `bmad-review-adversarial-general` in an independent subagent when authorized and useful. If independent review is unavailable, disclose the limitation; keep approval pending only when the user or project explicitly requires independent approval.

### Classify

Deduplicate all review findings. Three categories only:

- **patch** — trivially fixable. Auto-fix immediately.
- **defer** — pre-existing issue not caused by this change. Append to `{deferred_work_file}`.
- **reject** — noise. Drop silently.

Fix findings within the authorized scope. Ask only about material changes to requirements, architecture, or authorization; continue independent fixes.

### Commit

After required validation passes, create a local conventional commit containing only this task's changes when version control is available. Preserve unrelated work and follow any user instruction to leave changes uncommitted. If VCS is unavailable, skip.

### Present

1. Open all changed files in the user's editor so they can review the code directly:
   - Resolve two sets of absolute paths: (1) the repository root (`git rev-parse --show-toplevel` — returns the worktree root when in a worktree, project root otherwise; if this fails, fall back to the current working directory), (2) each changed file. Run `code -r "{absolute-root}" <absolute-changed-file-paths>` — the root first so VS Code opens in the right context, then each changed file. Always double-quote paths to handle spaces and special characters.
   - If `code` is not available (command fails), skip gracefully and list the file paths instead.
2. Display a summary in conversation output, including:
   - The commit hash (if one was created).
   - List of files changed with one-line descriptions. Use CWD-relative paths with `:line` notation (e.g., `src/path/file.ts:42`) for terminal clickability. No leading `/`.
   - Review findings breakdown: patches applied, items deferred, items rejected. If all findings were rejected, say so.
3. Offer to push and/or create a pull request.

Finish with a self-contained result. Do not wait for optional follow-up input or push without authorization.

Workflow complete.
