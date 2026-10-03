# plans/README.md
#
# 이 폴더는 복잡한 작업의 실행 계획(ExecPlan)을 저장합니다.
#
# 사용 기준:
#   - 단순한 story에는 ExecPlan을 만들지 않습니다.
#   - 아래 조건 중 하나라도 해당하면 ExecPlan을 작성합니다:
#     1. 여러 story에 걸치는 작업
#     2. 인증/결제/권한 등 리스크가 큰 변경
#     3. 기존 구조를 건드리는 리팩터링
#     4. 1세션에 끝나지 않는 장기 작업
#     5. 검증 순서가 중요한 작업
#
# 파일명 형식: YYYY-MM-DD-작업이름.execplan.md
# 템플릿: templates/execplan.md
#
# Orca Epic 실행 계획:
#   - Orca 코디네이터가 Epic 시작 시 plans/epic-<N>-orca.md를 만듭니다.
#   - 템플릿: templates/orca-epic-plan.md
#   - epics.md와 spec 파일에 없는 실행 정보(의존·해제 조건, 수정 범위, 위험도, 모델 후보, 리뷰, 예산)만 적습니다.
