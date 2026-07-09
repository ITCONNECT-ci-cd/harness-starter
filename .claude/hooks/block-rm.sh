#!/usr/bin/env bash
# ============================================================================
# .claude/hooks/block-rm.sh
#
# PreToolUse Hook: 위험한 Bash 명령을 차단합니다.
# 매치 시 exit 2 + stderr 사유 출력으로 도구 실행을 블로킹합니다.
# (Claude Code 훅 프로토콜: exit 2 = block, stderr 내용이 모델에 전달됨)
#
# 차단 대상:
#   rm 재귀+강제 조합 (rm -rf / -fr / -r -f / --recursive --force 등 변형 포함)
#   rm --no-preserve-root, sudo rm, sudo dd, chmod 777 (재귀 포함)
#   truncate /, mkfs, fork bomb, /etc/ 또는 /usr/ 로의 리다이렉트
#
# 한계(중요): 이 훅은 best-effort 소프트 가드입니다. 모든 우회 변형을 막을 수
#   없으므로 최종 안전망은 git commit 규율 + 백업(docs/agents/backup-rules.md)입니다.
#   드물게 한 명령줄에 rm이 여러 번 등장하면 과차단될 수 있습니다(안전한 방향의 오차).
# ============================================================================

# jq 없으면 명령을 파싱할 수 없음 — 조용히 무력화되는 대신 경고를 남긴다.
# (doctor.ps1의 jq 체크와 짝을 이룸)
if ! command -v jq >/dev/null 2>&1; then
  echo "WARN: jq not found — block-rm guard is INACTIVE. Install jq (scoop/brew/apt install jq)." >&2
  exit 0
fi

# stdin에서 JSON 읽기
input=$(cat)

# jq로 명령 추출
command=$(echo "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)

if [ -z "$command" ]; then
  exit 0
fi

block() {
  echo "BLOCKED: dangerous command matched ($1)" >&2
  echo "  command: $command" >&2
  echo "  이 작업이 정말 필요하면 사용자에게 명시적 승인을 받으세요." >&2
  exit 2
}

# ── 1. rm 재귀+강제 조합 (플래그 순서/분리/롱옵션 변형 포함) ──
# 플래그 토큰은 "rm 바로 뒤" 또는 "공백 뒤"의 '-'로 시작해야 매치 —
# 파일명 안의 '-rf'(예: a-rf.txt)는 매치하지 않는다.
if echo "$command" | grep -qE '(^|[;&|[:space:]`(])rm[[:space:]]'; then
  # 결합 플래그: -rf, -fr, -Rf, -vrf 등 (한 토큰에 r과 f가 함께)
  if echo "$command" | grep -qE 'rm[[:space:]]+([^;|&]*[[:space:]])?-[[:alnum:]]*([rR][[:alnum:]]*f|f[[:alnum:]]*[rR])[[:alnum:]]*([[:space:]]|$)'; then
    block "rm recursive+force"
  fi
  # 분리 플래그: rm -r ... -f / rm --recursive ... --force (순서 무관)
  if echo "$command" | grep -qE 'rm[[:space:]]+(([^;|&]*[[:space:]])?-[[:alnum:]]*[rR][[:alnum:]]*([[:space:]]|$)|[^;|&]*--recursive([[:space:]]|$))' \
     && echo "$command" | grep -qE 'rm[[:space:]]+(([^;|&]*[[:space:]])?-[[:alnum:]]*f[[:alnum:]]*([[:space:]]|$)|[^;|&]*--force([[:space:]]|$))'; then
    block "rm recursive+force (separate flags)"
  fi
  if echo "$command" | grep -qE 'rm[[:space:]][^;|&]*--no-preserve-root'; then
    block "rm --no-preserve-root"
  fi
fi

# ── 2. chmod 777 (재귀/플래그 변형 포함) ──
if echo "$command" | grep -qE 'chmod[[:space:]]+(-[[:alnum:]]+[[:space:]]+)*0?777([[:space:]]|$)'; then
  block "chmod 777"
fi

# ── 3. 고정 패턴 (문자열 매치) ──
dangerous_fixed=(
  "sudo rm"
  "sudo dd"
  "> /etc/"
  "> /usr/"
  "truncate /"
  ":(){:|:&};:"
)

for pattern in "${dangerous_fixed[@]}"; do
  if echo "$command" | grep -qF "$pattern"; then
    block "$pattern"
  fi
done

# ── 4. 고정 패턴 (정규식 매치) ──
if echo "$command" | grep -qE 'mkfs\.'; then
  block "mkfs"
fi

exit 0
