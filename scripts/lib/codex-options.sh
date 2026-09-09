#!/usr/bin/env bash
# Leave defaults to the trusted project's .codex/config.toml.
# Explicit environment overrides remain separate argv entries; never eval them.
build_harness_codex_options() {
  HARNESS_CODEX_OPTIONS=()
  if [ -n "${CODEX_MODEL:-}" ]; then
    HARNESS_CODEX_OPTIONS+=(--model "$CODEX_MODEL")
  fi
  if [ -n "${CODEX_REASONING:-}" ]; then
    HARNESS_CODEX_OPTIONS+=(-c "model_reasoning_effort=$CODEX_REASONING")
  fi
}
