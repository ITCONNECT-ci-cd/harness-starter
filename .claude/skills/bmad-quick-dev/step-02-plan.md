---
wipFile: '{implementation_artifacts}/spec-wip.md'
deferred_work_file: '{implementation_artifacts}/deferred-work.md'
---

# Step 2: Plan

## RULES

- YOU MUST ALWAYS SPEAK OUTPUT in your Agent communication style with the config `{communication_language}`
- No intermediate approvals.

## INSTRUCTIONS

1. Investigate relevant code and dependencies. Delegate bounded independent research only when authorized and useful; request concise evidence summaries.
2. Read `./spec-template.md` fully. Fill it out based on the intent and investigation, and write the result to `{wipFile}`.
3. Self-review against READY FOR DEVELOPMENT standard.
4. Resolve routine gaps from context. Ask about material unresolved requirements or authorization; continue independent work without inventing requirements.
5. Token count check (see SCOPE STANDARD). If spec exceeds 1600 tokens:
   - Show user the token count.
   - Treat length as a readability signal, not a gate. Keep a coherent authorized scope; ask about splitting only when it changes the requested deliverables.
   - On **S**: Propose the split — name each secondary goal. Append deferred goals to `{deferred_work_file}`. Rewrite the current spec to cover only the main goal — do not surgically carve sections out; regenerate the spec for the narrowed scope. Continue to checkpoint.
   - On **K**: Continue to checkpoint with full spec.

### CHECKPOINT 1

Present the concrete plan. If implementation is already authorized and no material decision remains, record that authorization and continue using the A transition without asking again. For a plan-only request or a genuinely new decision, wait for `[A] Approve` | `[E] Edit`. Silence is not approval.

- **A**: Rename `{wipFile}` to `{spec_file}`, set status `ready-for-dev`. Everything inside `<frozen-after-approval>` is now locked — only the human can change it. Display the finalized spec path to the user as a CWD-relative path (no leading `/`) so it is clickable in the terminal. → Step 3.
- **E**: Apply changes, then return to CHECKPOINT 1.


## NEXT

Read fully and follow `./step-03-implement.md`
