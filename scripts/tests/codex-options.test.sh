#!/usr/bin/env bash
set -euo pipefail
TASK_TEST_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$TASK_TEST_ROOT/scripts/lib/codex-options.sh"

expect_options() {
  local CODEX_MODEL="$1" CODEX_REASONING="$2"
  shift 2
  build_harness_codex_options
  local expected=("$@")
  if [ "${#HARNESS_CODEX_OPTIONS[@]}" -ne "${#expected[@]}" ]; then
    echo "FAIL: unexpected override count" >&2
    exit 1
  fi
  local i
  for ((i=0; i<${#expected[@]}; i++)); do
    if [ "${HARNESS_CODEX_OPTIONS[$i]}" != "${expected[$i]}" ]; then
      echo "FAIL: override argv boundary/value changed at $i" >&2
      exit 1
    fi
  done
}

# No overrides must leave both project defaults intact.
expect_options "" ""
expect_options "selected-model" "" --model "selected-model"
expect_options "" "high" -c "model_reasoning_effort=high"
expect_options "selected-model" "xhigh" --model "selected-model" -c "model_reasoning_effort=xhigh"
# Even invalid values remain one argument; the CLI decides validity.
expect_options 'model with spaces; $(false)' "" --model 'model with spaces; $(false)'
# Rebuilding must not retain arguments from the previous call.
unset CODEX_MODEL CODEX_REASONING
build_harness_codex_options
[ "${#HARNESS_CODEX_OPTIONS[@]}" -eq 0 ]
echo "PASS: 6 Codex override cases (no model requests sent)"
