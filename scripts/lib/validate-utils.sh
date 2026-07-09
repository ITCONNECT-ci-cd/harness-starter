#!/usr/bin/env bash
# ============================================================================
# scripts/lib/validate-utils.sh
#
# validate.sh / validate-quick.sh 공용 헬퍼 라이브러리
#
# 제공 기능:
#   - 출력 모드 분리 (summary / verbose)
#   - 로그 아티팩트 구조 (state/validate/latest/*.log)
#   - Node/CLI 실행 래퍼 (exit code 정확 전파 + 로그 저장)
#   - 노이즈 디렉터리 제외 grep 래퍼
#   - 실패 요약 출력
#
# 사용법:
#   source "$(dirname "$0")/lib/validate-utils.sh"
#   init_validate "epic"   # 또는 "quick"
#   run_step "01" "typecheck" "npm run typecheck"
#   finish_validate
# ============================================================================

# ── 출력 모드 ──
# VALIDATE_OUTPUT_MODE: summary (기본) | verbose
VALIDATE_OUTPUT_MODE="${VALIDATE_OUTPUT_MODE:-summary}"

# ── 단계별 timeout (초). 0 = 무제한. 환경변수로 오버라이드 가능 ──
# vitest watch 모드 잘못 진입, npm registry 응답 지연, eslint 무한 루프 등
# 어떤 외부 원인으로든 무한 행에 빠지지 않도록 하드 캡을 둔다.
VALIDATE_INSTALL_TIMEOUT="${VALIDATE_INSTALL_TIMEOUT:-1800}"      # 30m
VALIDATE_TYPECHECK_TIMEOUT="${VALIDATE_TYPECHECK_TIMEOUT:-600}"   # 10m
VALIDATE_LINT_TIMEOUT="${VALIDATE_LINT_TIMEOUT:-300}"             # 5m
VALIDATE_TEST_TIMEOUT="${VALIDATE_TEST_TIMEOUT:-1200}"            # 20m
VALIDATE_BUILD_TIMEOUT="${VALIDATE_BUILD_TIMEOUT:-1200}"          # 20m
VALIDATE_DEFAULT_TIMEOUT="${VALIDATE_DEFAULT_TIMEOUT:-600}"       # 10m

# timeout 명령 탐지 (Linux: timeout, macOS coreutils: gtimeout)
HARNESS_TIMEOUT_BIN=""
if command -v timeout >/dev/null 2>&1; then
  HARNESS_TIMEOUT_BIN="timeout"
elif command -v gtimeout >/dev/null 2>&1; then
  HARNESS_TIMEOUT_BIN="gtimeout"
fi

# step_name → 적용할 timeout 초 반환
get_step_timeout() {
  case "$1" in
    install)        echo "$VALIDATE_INSTALL_TIMEOUT" ;;
    typecheck)      echo "$VALIDATE_TYPECHECK_TIMEOUT" ;;
    lint)           echo "$VALIDATE_LINT_TIMEOUT" ;;
    test|regression-test|related-tests) echo "$VALIDATE_TEST_TIMEOUT" ;;
    build)          echo "$VALIDATE_BUILD_TIMEOUT" ;;
    *)              echo "$VALIDATE_DEFAULT_TIMEOUT" ;;
  esac
}

# ── 로그 디렉터리 ──
VALIDATE_LOG_DIR=""
VALIDATE_LOG_LATEST=""
VALIDATE_RUN_TYPE=""
VALIDATE_LATEST_IS_LINK=false

# ── 결과 추적 ──
VALIDATE_TOTAL_STEPS=0
VALIDATE_PASSED_STEPS=0
VALIDATE_FAILED_STEP=""
VALIDATE_FAILED_CODE=0
VALIDATE_START_TIME=0

# ── 노이즈 제외 패턴 (grep --exclude-dir) ──
NOISE_EXCLUDE_DIRS=(
  .git
  node_modules
  .venv
  venv
  dist
  build
  coverage
  .next
  .turbo
  .cache
  .tmp
  playwright-report
  test-results
  __pycache__
)

# ============================================================================
# 초기화
# ============================================================================

init_validate() {
  local run_type="${1:-epic}"  # "epic" 또는 "quick"
  VALIDATE_RUN_TYPE="$run_type"
  VALIDATE_START_TIME=$(date +%s)

  # timestamped 디렉터리 생성
  local timestamp
  timestamp=$(date +%Y%m%d_%H%M%S)
  local run_dir="state/validate/${run_type}-${timestamp}"
  mkdir -p "$run_dir"

  # latest 심링크 (또는 복사)
  VALIDATE_LOG_LATEST="state/validate/latest"
  rm -rf "$VALIDATE_LOG_LATEST" 2>/dev/null
  # 심링크 시도, 실패 시 (Windows 등) finish 단계에서 복사
  if ln -s "$(basename "$run_dir")" "$VALIDATE_LOG_LATEST" 2>/dev/null && [ -L "$VALIDATE_LOG_LATEST" ]; then
    VALIDATE_LATEST_IS_LINK=true
  else
    rm -rf "$VALIDATE_LOG_LATEST" 2>/dev/null
    mkdir -p "$VALIDATE_LOG_LATEST"
    VALIDATE_LATEST_IS_LINK=false
  fi

  VALIDATE_LOG_DIR="$run_dir"

  if [ "$VALIDATE_OUTPUT_MODE" = "summary" ]; then
    echo "======================================"
    echo " Validation Start (${run_type}-level)"
    echo " Mode: summary (set VALIDATE_OUTPUT_MODE=verbose for full output)"
    echo " Logs: ${VALIDATE_LOG_DIR}/"
    echo "======================================"
  fi
}

# ============================================================================
# 단계 실행 래퍼
# ============================================================================

# run_step <step_num> <step_name> <command...>
#
# - stdout/stderr를 로그 파일에 저장
# - summary 모드: 시작/종료/소요시간만 출력
# - verbose 모드: 실시간 출력 + 로그 파일 저장
# - exit code를 정확히 전파
run_step() {
  local step_num="$1"
  local step_name="$2"
  shift 2
  local cmd="$*"

  VALIDATE_TOTAL_STEPS=$((VALIDATE_TOTAL_STEPS + 1))

  local log_file="${VALIDATE_LOG_DIR}/${step_num}-${step_name}.log"
  local step_start
  step_start=$(date +%s)

  local step_exit=0
  local tmout
  tmout=$(get_step_timeout "$step_name")

  # timeout 래퍼. HARNESS_TIMEOUT_BIN 부재(Windows Git Bash 등) 또는
  # tmout=0/빈값이면 무가드 실행. timeout 발동 시 exit 124.
  local run_with_timeout=""
  if [ -n "$HARNESS_TIMEOUT_BIN" ] && [ -n "$tmout" ] && [ "$tmout" -gt 0 ]; then
    run_with_timeout="$HARNESS_TIMEOUT_BIN -k 30s ${tmout}s bash -c"
  fi

  if [ "$VALIDATE_OUTPUT_MODE" = "verbose" ]; then
    # verbose: 실시간 출력 + 로그 파일 저장
    echo ""
    echo "[${step_num}] ${step_name}..."
    if [ -n "$run_with_timeout" ]; then
      $run_with_timeout "$cmd" 2>&1 | tee "$log_file" || step_exit=${PIPESTATUS[0]}
    else
      eval "$cmd" 2>&1 | tee "$log_file" || step_exit=${PIPESTATUS[0]}
    fi
    if [ $step_exit -eq 0 ] && [ "${PIPESTATUS[0]:-0}" -ne 0 ]; then
      step_exit=${PIPESTATUS[0]}
    fi
  else
    # summary: 로그 파일에만 저장, 콘솔에는 한 줄 요약
    printf "[%s] %-20s " "$step_num" "$step_name"
    if [ -n "$run_with_timeout" ]; then
      $run_with_timeout "$cmd" > "$log_file" 2>&1
    else
      eval "$cmd" > "$log_file" 2>&1
    fi
    step_exit=$?
  fi

  local step_end
  step_end=$(date +%s)
  local elapsed=$((step_end - step_start))

  # exit 124 = timeout 명령의 시간 초과 코드. 별도 메시지를 로그에 추가.
  if [ "$step_exit" -eq 124 ] && [ -n "$run_with_timeout" ]; then
    {
      echo ""
      echo "── HARNESS TIMEOUT ──────────────────────"
      echo "  Step exceeded ${tmout}s and was killed by ${HARNESS_TIMEOUT_BIN}."
      echo "  Tune via env: VALIDATE_*_TIMEOUT (0 = unlimited)."
    } >> "$log_file" 2>&1
  fi

  if [ $step_exit -eq 0 ]; then
    VALIDATE_PASSED_STEPS=$((VALIDATE_PASSED_STEPS + 1))
    sync_latest_logs
    if [ "$VALIDATE_OUTPUT_MODE" = "summary" ]; then
      echo "PASSED (${elapsed}s)"
    else
      echo "[${step_num}] ${step_name}: PASSED (${elapsed}s)"
    fi
  else
    VALIDATE_FAILED_STEP="$step_name"
    VALIDATE_FAILED_CODE=$step_exit
    sync_latest_logs
    if [ "$VALIDATE_OUTPUT_MODE" = "summary" ]; then
      echo "FAILED (${elapsed}s)"
      print_failure_summary "$step_num" "$step_name" "$step_exit" "$log_file"
    else
      echo "[${step_num}] ${step_name}: FAILED (exit: ${step_exit}, ${elapsed}s)"
      echo "  Log: ${log_file}"
    fi
    return $step_exit
  fi

  return 0
}

# run_step_skip <step_num> <step_name> <reason>
# --from 옵션으로 건너뛴 단계 표시
run_step_skip() {
  local step_num="$1"
  local step_name="$2"
  local reason="${3:-skipped}"

  VALIDATE_TOTAL_STEPS=$((VALIDATE_TOTAL_STEPS + 1))
  VALIDATE_PASSED_STEPS=$((VALIDATE_PASSED_STEPS + 1))

  if [ "$VALIDATE_OUTPUT_MODE" = "summary" ]; then
    printf "[%s] %-20s SKIPPED (%s)\n" "$step_num" "$step_name" "$reason"
  else
    echo ""
    echo "[${step_num}] ${step_name}... SKIPPED (${reason})"
  fi
}

sync_latest_logs() {
  if [ "$VALIDATE_LATEST_IS_LINK" = true ]; then
    return 0
  fi

  if [ -z "$VALIDATE_LOG_LATEST" ] || [ "$VALIDATE_LOG_LATEST" = "$VALIDATE_LOG_DIR" ]; then
    return 0
  fi

  mkdir -p "$VALIDATE_LOG_LATEST"
  cp -a "${VALIDATE_LOG_DIR}/." "$VALIDATE_LOG_LATEST/" 2>/dev/null || \
    cp -R "${VALIDATE_LOG_DIR}/." "$VALIDATE_LOG_LATEST/" 2>/dev/null || true
}

# ============================================================================
# 실패 요약 출력
# ============================================================================

print_failure_summary() {
  local step_num="$1"
  local step_name="$2"
  local exit_code="$3"
  local log_file="$4"

  echo ""
  echo "── Failure Detail ──────────────────────"
  echo "  Step:      [${step_num}] ${step_name}"
  echo "  Exit code: ${exit_code}"
  echo "  Log:       ${log_file}"

  if [ -f "$log_file" ]; then
    local line_count
    line_count=$(wc -l < "$log_file" | tr -d ' ')

    # 테스트 러너의 구조화 출력이 있으면 우선 사용
    # (vitest/jest의 실패 테스트 요약 패턴 감지)
    local test_failures
    test_failures=$(grep -E "^[[:space:]]*(FAIL|✕|×|✗|FAILED)" "$log_file" 2>/dev/null | head -20)

    if [ -n "$test_failures" ]; then
      echo "  Failed tests:"
      echo "$test_failures" | sed 's/^/    /'
      echo ""
    fi

    # 마지막 50줄 (또는 파일이 짧으면 전체)
    local tail_lines=50
    if [ "$line_count" -le "$tail_lines" ]; then
      tail_lines="$line_count"
    fi
    echo "  Last ${tail_lines} lines:"
    tail -"$tail_lines" "$log_file" | sed 's/^/    /'
  fi
  echo "────────────────────────────────────────"
}

# ============================================================================
# 검증 완료
# ============================================================================

finish_validate() {
  local end_time
  end_time=$(date +%s)
  local total_elapsed=$((end_time - VALIDATE_START_TIME))
  sync_latest_logs

  echo ""
  if [ -n "$VALIDATE_FAILED_STEP" ]; then
    echo "======================================"
    echo " Validation FAILED"
    echo "  Failed at: ${VALIDATE_FAILED_STEP} (exit: ${VALIDATE_FAILED_CODE})"
    echo "  Steps:     ${VALIDATE_PASSED_STEPS}/${VALIDATE_TOTAL_STEPS} passed"
    echo "  Duration:  ${total_elapsed}s"
    echo "  Logs:      ${VALIDATE_LOG_DIR}/"
    echo "======================================"
    return 1
  else
    echo "======================================"
    echo " Validation PASSED"
    echo "  Steps:    ${VALIDATE_PASSED_STEPS}/${VALIDATE_TOTAL_STEPS} passed"
    echo "  Duration: ${total_elapsed}s"
    echo "  Logs:     ${VALIDATE_LOG_DIR}/"
    echo "======================================"
    return 0
  fi
}

# ============================================================================
# grep 래퍼 (노이즈 디렉터리 제외)
# ============================================================================

# safe_grep <grep_args...>
# node_modules, dist, .git 등을 자동 제외하는 grep 래퍼
safe_grep() {
  local exclude_args=""
  for dir in "${NOISE_EXCLUDE_DIRS[@]}"; do
    exclude_args="$exclude_args --exclude-dir=$dir"
  done
  # shellcheck disable=SC2086
  grep $exclude_args "$@"
}

# safe_grep_rn <pattern> <path> [--include=*.ts ...]
# -rn 옵션이 포함된 편의 래퍼
safe_grep_rn() {
  local pattern="$1"
  local path="$2"
  shift 2
  safe_grep -rn "$@" "$pattern" "$path" 2>/dev/null
}

# ============================================================================
# harness.validate.json + 검증 명령 결정
# (PowerShell scripts/lib/package-runner.ps1과 동일 계약의 bash 구현 —
#  두 진입점이 같은 설정 소스를 읽어야 Phase A(Windows)와 Phase B(bash)의
#  판정이 갈라지지 않는다)
#
# 우선순위: HARNESS_*_CMD 환경변수 > harness.validate.json commands > 자동 감지
# 스키마:   { "mode": "template"|"project",
#             "commands": { "install"|"typecheck"|"lint"|"test"|"build"|
#                           "regression-test"|"related-tests": "<cmd>" },
#             "required": { "<step>": true|false } }
# ============================================================================

HARNESS_VALIDATE_CONFIG_FILE="${HARNESS_VALIDATE_CONFIG_FILE:-harness.validate.json}"
HARNESS_CONFIG_JQ_WARNED=false

# config의 commands.<step> 값 (jq 없으면 빈 값 + 1회 경고)
get_config_command() {
  local step="$1"
  [ -f "$HARNESS_VALIDATE_CONFIG_FILE" ] || return 0
  if ! command -v jq >/dev/null 2>&1; then
    if [ "$HARNESS_CONFIG_JQ_WARNED" = false ]; then
      echo "WARN: harness.validate.json 발견했으나 jq 없음 — config 무시 (env/자동감지로 진행)" >&2
      HARNESS_CONFIG_JQ_WARNED=true
    fi
    return 0
  fi
  jq -r --arg k "$step" '.commands[$k] // empty' "$HARNESS_VALIDATE_CONFIG_FILE" 2>/dev/null
}

# config의 required.<step> 값 ("true"/"false"/빈 값)
# 주의: jq의 `//`는 false를 empty로 삼키므로 has() 체크를 사용한다
get_config_required() {
  local step="$1"
  [ -f "$HARNESS_VALIDATE_CONFIG_FILE" ] || return 0
  command -v jq >/dev/null 2>&1 || return 0
  jq -r --arg k "$step" 'if ((.required // {}) | has($k)) then .required[$k] | tostring else empty end' \
    "$HARNESS_VALIDATE_CONFIG_FILE" 2>/dev/null
}

# config의 mode ("template"/"project"/빈 값)
get_config_mode() {
  [ -f "$HARNESS_VALIDATE_CONFIG_FILE" ] || return 0
  command -v jq >/dev/null 2>&1 || return 0
  jq -r '.mode // empty' "$HARNESS_VALIDATE_CONFIG_FILE" 2>/dev/null
}

# 프로젝트 마커 감지 (package-runner.ps1 Test-HarnessProjectMarker와 동일)
has_project_marker() {
  local f d
  for f in package.json pyproject.toml go.mod Cargo.toml pom.xml \
           build.gradle build.gradle.kts Gemfile Package.swift; do
    [ -f "$f" ] && return 0
  done
  ls ./*.csproj >/dev/null 2>&1 && return 0

  for d in src app apps backend frontend server client packages cmd internal; do
    [ -d "$d" ] || continue
    if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
      [ -n "$(git ls-files -- "$d" 2>/dev/null | head -1)" ] && return 0
      [ -n "$(git ls-files --others --exclude-standard -- "$d" 2>/dev/null | head -1)" ] && return 0
    elif [ -n "$(find "$d" -maxdepth 3 -type f -print 2>/dev/null | head -1)" ]; then
      return 0
    fi
  done
  return 1
}

# 검증 모드 결정: config mode > 마커 자동 감지. 잘못된 값이면 "invalid" 반환.
get_validation_mode() {
  local m
  m=$(get_config_mode)
  case "$m" in
    template|project) echo "$m"; return 0 ;;
    "") ;;
    *) echo "invalid"; return 0 ;;
  esac
  if has_project_marker; then echo "project"; else echo "template"; fi
}

# step_required <step>
# config required.<step>이 명시되면 그 값, 아니면 project mode에서 기본 필수
step_required() {
  local step="$1" cfg
  cfg=$(get_config_required "$step")
  case "$cfg" in
    true) return 0 ;;
    false) return 1 ;;
  esac
  [ "${VALIDATE_MODE:-template}" = "project" ]
}

# 패키지 매니저 감지 (package-runner.ps1 Get-HarnessPackageManager와 동일)
get_run_prefix() {
  if [ -f pnpm-lock.yaml ]; then echo "pnpm run"
  elif [ -f yarn.lock ]; then echo "yarn"
  elif [ -f bun.lockb ] || [ -f bun.lock ]; then echo "bun run"
  else echo "npm run"
  fi
}

get_install_cmd_default() {
  if [ -f pnpm-lock.yaml ]; then echo "pnpm install --prefer-offline"
  elif [ -f yarn.lock ]; then echo "yarn install"
  elif [ -f bun.lockb ] || [ -f bun.lock ]; then echo "bun install"
  else echo "npm install --prefer-offline"
  fi
}

# resolve_step_cmd <step> <env_var_name> <default_cmd>
# 우선순위: env > harness.validate.json commands > default
resolve_step_cmd() {
  local step="$1" envname="$2" default_cmd="${3:-}" val
  eval "val=\${$envname:-}"
  if [ -n "$val" ]; then echo "$val"; return 0; fi
  val=$(get_config_command "$step")
  if [ -n "$val" ]; then echo "$val"; return 0; fi
  echo "$default_cmd"
}

# step_missing_fail <step_num> <step_name>
# project mode에서 필수 단계의 실행 명령이 없을 때 명시적 실패 처리
step_missing_fail() {
  local step_num="$1" step_name="$2" envname
  envname="HARNESS_$(echo "$step_name" | tr 'a-z-' 'A-Z_')_CMD"
  VALIDATE_TOTAL_STEPS=$((VALIDATE_TOTAL_STEPS + 1))
  VALIDATE_FAILED_STEP="$step_name"
  VALIDATE_FAILED_CODE=1
  echo "[${step_num}] ${step_name}: FAILED — project mode인데 실행할 명령이 없습니다." >&2
  echo "  해결: package.json scripts, ${envname}," >&2
  echo "        또는 harness.validate.json commands.\"${step_name}\" 에 명령을 추가하세요." >&2
  echo "  예외: harness.validate.json required.\"${step_name}\"=false 로 명시적으로 끌 수 있습니다." >&2
  return 1
}
