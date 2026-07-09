#!/usr/bin/env bash
# ============================================================================
# .claude/hooks/check-feedback-rules.sh
#
# SessionStart Hook: 세션 시작 시 feedback-rules.md의 활성 규칙을 확인합니다.
# 가시성 목적 — 차단하지 않고 정보만 제공합니다.
#
# 출력은 stdout으로 보냅니다: SessionStart 훅의 stdout은 Claude의 컨텍스트에
# 주입되므로, 활성 규칙 목록이 세션 시작 시점에 모델에게 직접 전달됩니다.
# ============================================================================

project_dir="${CLAUDE_PROJECT_DIR:-.}"
rules_file="$project_dir/docs/agents/feedback-rules.md"

if [ ! -f "$rules_file" ]; then
  echo "feedback-rules.md not found" >&2
  exit 0
fi

# "## Active Rules" 섹션 안에서만 "### N." 패턴을 센다.
# - 다른 섹션(Retired Rules)과 HTML 주석(<!-- 예시 -->)의 예시 규칙은 제외
# - grep -c는 매치 없어도 0을 출력하므로 || fallback을 쓰지 않는다
#   (|| echo 0 을 붙이면 "0\n0" 이중 출력으로 정수 비교가 깨진다)
active_block=$(awk '/^## Active Rules/{f=1; next} /^## /{f=0} f' "$rules_file" 2>/dev/null | sed '/<!--/,/-->/d')
active_count=$(printf '%s\n' "$active_block" | grep -c "^### [0-9]")
case "$active_count" in
  ''|*[!0-9]*) active_count=0 ;;
esac

if [ "$active_count" -gt 0 ]; then
  echo "Feedback rules loaded: $active_count active rule(s)"
  printf '%s\n' "$active_block" | grep "^### [0-9]" | sed 's/^/  /'
fi

exit 0
