# reviews/README.md
#
# 이 폴더는 코드 리뷰 결과, Orca 실행 기록, 명시적으로 요청된 Harness 독립 리뷰 결과를 저장합니다.
# Orca 코디네이터가 Story를 epic/<N>에 통합할 때 Epic별 하위 폴더에 기록합니다.
#
# 구조:
#   reviews/
#   ├── epic-1/
#   │   ├── <story-key>-review.md   ← 리뷰 워커의 판정과 findings (코디네이터가 저장)
#   │   ├── orca-runs.md            ← Story별 승인/실제 모델·effort, 커밋, 리뷰 결과, 재시도, 시간
#   │   └── logs/                   ← 워커 워크트리에서 복사한 검증 로그 (커밋 제외)
#   │       └── <story-key>-*.log
#   ├── epic-2/
#   │   └── ...
#   └── ...
#
# 리뷰 결과 확인:
#   cat reviews/epic-1/<story-key>-review.md
#
# 모델별 결과 확인 (Phase C 회고 입력):
#   cat reviews/epic-1/orca-runs.md
#
# 실패 원인 분석:
#   ls reviews/epic-1/logs/

## Harness 검토 기록

- [2026-09-09 Astra 지침 독립 리뷰와 행동 시험](astra-guidance-2026-09-09/review.md)
