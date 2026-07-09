#!/usr/bin/env bash
# ============================================================================
# scripts/validate-quick.sh
#
# Story 단위 빠른 검증 스크립트
# lint + typecheck + 변경된 파일 관련 테스트만 실행합니다.
# 전체 검증(validate.sh)은 Epic 완료 시 실행합니다.
#
# 사용법:
#   ./scripts/validate-quick.sh                               # summary 모드 (기본)
#   VALIDATE_OUTPUT_MODE=verbose ./scripts/validate-quick.sh  # 전체 출력
#   VALIDATE_BASE_REF=origin/develop ./scripts/validate-quick.sh  # base ref 지정
#
# 환경변수:
#   VALIDATE_OUTPUT_MODE  summary (기본) | verbose
#   VALIDATE_BASE_REF     비교 기준 브랜치 (기본: origin/develop → develop → origin/main → main 자동 탐색)
#   HARNESS_TYPECHECK_CMD / HARNESS_LINT_CMD / HARNESS_RELATED_TEST_CMD
#                         단계별 명령 오버라이드 (최우선)
#
# 설정 파일:
#   harness.validate.json  commands.typecheck/lint/related-tests 인식
#                          (우선순위: env > config > 자동 감지 — validate.ps1과 동일 계약)
#
# 로그 위치:
#   state/validate/latest/*.log   (최신 실행)
#   state/validate/quick-*/*.log  (timestamped 아카이브)
#
# 종료코드: 0 = 성공, 1 = 실패
#
# 설계 원칙:
#   - 전체 테스트 suite로 silent fallback 하지 않음 (story 단위 검증이 느려지는 주 원인)
#   - 도구(vitest/jest)가 없으면 명시적 ERROR로 알림
#   - 템플릿 상태(package.json 없음)에서는 우아하게 SKIP
# ============================================================================
set -e

# ── 헬퍼 로드 ──
SCRIPT_DIR="$(dirname "$0")"
source "${SCRIPT_DIR}/lib/validate-utils.sh"

# ── 초기화 ──
init_validate "quick"

# 조기 종료(예: run_step ... || exit 1)에도 요약·로그 경로가 출력되도록
# EXIT trap에 finalize 등록. exit code는 trap이 보존(side-effect만 수행).
HARNESS_FINALIZE_DONE=false
__harness_finalize_once() {
  if [ "$HARNESS_FINALIZE_DONE" = true ]; then
    return 0
  fi
  HARNESS_FINALIZE_DONE=true
  finish_validate || true
}
trap __harness_finalize_once EXIT

# ── 기준 브랜치 결정 ──
BASE_REF="${VALIDATE_BASE_REF:-}"
if [ -z "$BASE_REF" ]; then
  for ref in origin/develop develop origin/main main; do
    if git rev-parse --verify "$ref" >/dev/null 2>&1; then
      BASE_REF="$ref"
      break
    fi
  done
fi

# ── 1. 타입 체크 ──
# 우선순위: HARNESS_TYPECHECK_CMD > harness.validate.json > package.json 자동 감지
TYPECHECK_CMD=$(resolve_step_cmd "typecheck" "HARNESS_TYPECHECK_CMD" "")
if [ -z "$TYPECHECK_CMD" ] && [ -f package.json ]; then
  if grep -q '"typecheck"' package.json 2>/dev/null; then
    TYPECHECK_CMD="$(get_run_prefix) typecheck"
  elif [ -f tsconfig.json ] && [ -x node_modules/.bin/tsc ]; then
    # tsc --incremental로 증분 캐시 활용 (story 단위에서 특히 효과적)
    TYPECHECK_CMD="npx tsc --noEmit --incremental"
  fi
fi

if [ -n "$TYPECHECK_CMD" ]; then
  run_step "01" "typecheck" "$TYPECHECK_CMD" || exit 1
elif [ ! -f package.json ]; then
  run_step_skip "01" "typecheck" "no package.json (template state)"
else
  run_step_skip "01" "typecheck" "no typecheck script or tsc binary"
fi

# ── 2. 린트 ──
LINT_CMD=$(resolve_step_cmd "lint" "HARNESS_LINT_CMD" "")
if [ -z "$LINT_CMD" ] && [ -f package.json ] && grep -q '"lint"' package.json 2>/dev/null; then
  LINT_CMD="$(get_run_prefix) lint"
fi

if [ -n "$LINT_CMD" ]; then
  run_step "02" "lint" "$LINT_CMD" || exit 1
elif [ ! -f package.json ]; then
  run_step_skip "02" "lint" "no package.json (template state)"
else
  run_step_skip "02" "lint" "no lint script in package.json"
fi

# ── 3. 변경된 파일 관련 테스트만 실행 ──
# 설계: base ref 대비 변경된 소스 파일이 있을 때만 실행.
# 전체 테스트 suite로 silent fallback 하지 않음 — 도구가 없으면 ERROR로 알림.
# HARNESS_RELATED_TEST_CMD/harness.validate.json 오버라이드는 명령을 그대로 사용
# (ps1과 동일 — 변경 파일 목록을 덧붙이지 않음).
RELATED_OVERRIDE=$(resolve_step_cmd "related-tests" "HARNESS_RELATED_TEST_CMD" "")
if [ ! -f package.json ] && [ -z "$RELATED_OVERRIDE" ]; then
  run_step_skip "03" "related-tests" "no package.json (template state)"
elif [ -z "$BASE_REF" ]; then
  run_step_skip "03" "related-tests" "no base ref found (develop/main)"
else
  TRACKED_CHANGED=$(git diff --name-only "$BASE_REF" -- '*.ts' '*.tsx' '*.js' '*.jsx' 2>/dev/null || true)
  UNTRACKED_CHANGED=$(git ls-files --others --exclude-standard -- '*.ts' '*.tsx' '*.js' '*.jsx' 2>/dev/null || true)
  CHANGED=$(printf "%s\n%s\n" "$TRACKED_CHANGED" "$UNTRACKED_CHANGED" | sed '/^$/d' | tr '\n' ' ')

  if [ -z "$CHANGED" ]; then
    run_step_skip "03" "related-tests" "no changed source files vs $BASE_REF"
  else
    # vitest/jest binary 직접 호출 (npm script fallback 없음 — story 단위 빠른 피드백 보장)
    TEST_CMD="$RELATED_OVERRIDE"
    if [ -z "$TEST_CMD" ]; then
      if [ -x node_modules/.bin/vitest ]; then
        TEST_CMD="npx vitest related --run --reporter=verbose $CHANGED"
      elif [ -x node_modules/.bin/jest ]; then
        TEST_CMD="npx jest --findRelatedTests $CHANGED --passWithNoTests"
      fi
    fi

    if [ -z "$TEST_CMD" ]; then
      echo ""
      echo "[03] related-tests        ERROR" >&2
      echo "Story-level validation requires vitest or jest to run related tests only." >&2
      echo "Install one of:" >&2
      echo "  npm install -D vitest" >&2
      echo "  npm install -D jest" >&2
      echo "" >&2
      echo "Or set the command explicitly via HARNESS_RELATED_TEST_CMD or" >&2
      echo "harness.validate.json commands.\"related-tests\"." >&2
      echo "" >&2
      echo "Full test suite is intentionally NOT used as fallback — it makes per-story" >&2
      echo "validation too slow (5-10min). Use validate.sh for full-suite runs." >&2
      exit 1
    fi

    run_step "03" "related-tests" "$TEST_CMD" || exit 1
  fi
fi

# ── 완료 ──
__harness_finalize_once
