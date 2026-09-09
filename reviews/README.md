# reviews/README.md
#
# 이 폴더는 코드 리뷰와 명시적으로 요청된 Harness 독립 리뷰 결과를 저장합니다.
# run-epic.sh가 자동으로 Epic별 하위 폴더를 생성합니다.
#
# 구조:
#   reviews/
#   ├── epic-1/
#   │   ├── story-1-review.md        ← 리뷰 결과
#   │   └── logs/
#   │       ├── story-1-codex.log    ← Codex 실행 로그
#   │       ├── story-1-claude.log   ← Claude 실행 로그
#   │       └── story-1-validate.log ← 검증 로그
#   ├── epic-2/
#   │   └── ...
#   └── ...
#
# 리뷰 결과 확인:
#   cat reviews/epic-1/story-1-review.md
#
# 실패 원인 분석:
#   cat reviews/epic-1/logs/story-1-codex.log
#   cat reviews/epic-1/logs/story-1-validate.log

## Harness 검토 기록

- [2026-09-09 Astra 지침 독립 리뷰와 행동 시험](astra-guidance-2026-09-09/review.md)
