# state/README.md
#
# 이 폴더는 에이전트의 작업 상태를 추적합니다.
# learning-loop.json과 템플릿만 커밋하고, 실행 결과는 .gitignore로 제외합니다.
#
# 파일 설명:
#
# epic-{N}-progress.json
#   - Orca 코디네이터가 기록 (docs/agents/agent-execution-rules.md의 실패 처리)
#   - 각 epic의 story 처리 상태 (completed, failed, skipped, in_progress)
#   - 실패 상세는 failure_details 객체에 story 키별로 저장할 수 있음
#   - "이어서 하기"에서 코디네이터가 이 파일과 Git 상태를 대조해 멈춘 지점부터 진행
#
# orca/env.json
#   - Orca 코디네이터의 시작 확인 결과 (docs/agents/orca-rules.md §2)
#   - 도구 버전, 논리 모델별 실제 ID·에이전트·계정 별칭·지원 effort, 확인 시각
#   - 도구 버전이 바뀌지 않으면 다음 실행에서 재사용. 토큰·비밀값·이메일은 적지 않음
#
# orca/handoff/epic-{N}-{k}.md
#   - 코디네이터 인계문 (docs/agents/orca-rules.md §11, templates/orca-handoff.md)
#   - 앞 코디네이터가 쓰고 후임이 처음 읽음. Git 제외
#
# orca/rollover.jsonl
#   - scripts/orca/session-rollover.mjs의 단계별 기록 (created → send → sent). 중복 인계 방지에 쓰임. Git 제외
#
# ~/.orchestrator/ (저장소 밖, 사용자 폴더 — 선택 기능)
#   - limits.json: 사용량 가드 한도 (docs/agents/orca-rules.md §8.1, templates/orchestrator-limits.json)
#   - claude-usage.json: statusline-tee가 남기는 Claude 주간 사용률
#   - STOP, STOP-<저장소 이름>: 멈춤 파일
#
# validate/
#   - validate·validate-quick 실행 로그 (latest/와 실행별 폴더)
#   - Orca 워커의 로그는 워커 워크트리에 생기므로 코디네이터가 reviews/epic-N/logs/로 복사
#
# learning-loop.json
#   - Phase C 회고의 패턴별 발생 횟수와 승격 상태 (커밋 대상)
#
# progress-template.json
#   - epic-{N}-progress.json의 템플릿 (참고용)
#
# 사용 예:
#   # 전체 epic 상태 요약
#   ./scripts/status.sh
#
#   # 실패한 story 목록
#   jq '.failed' state/epic-1-progress.json
