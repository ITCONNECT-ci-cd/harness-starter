# 2026년 9월 9일 — Astra에 맞춘 Harness 실행 규칙 정비

OpenAI의 Astra 가이드를 참고해 스킬과 운영 문서의 충돌을 정리했습니다. 승인된 작업은 계속 진행하고, 필요한 질문·검증·데이터 보호 기준은 유지하는 것이 목적입니다.

- 구현 커밋: `d9a2d95` (`chore(harness): align Astra execution and skill guidance`)
- 범위: Codex 프로젝트 모델 설정, BMAD 스킬 3종, 공통 운영 규칙, 설치 및 모델 실행 옵션
- 기록 성격: 날짜별 변경 이력. 버전 태그나 GitHub Release 발행은 별도입니다.

## 변경 전·후

| 항목 | Before | After |
|---|---|---|
| 모델 기본값 | 상세 문서와 legacy runner에 이전 모델명이 남고 “최고 reasoning” 표현과 혼재 | `.codex/config.toml` 한 곳에서 Astra / Extra High(`xhigh`) 관리 |
| 사용자 지시와 스킬 | Quick Flow에 사용자 직접 구현 요청을 무시하는 문구가 있음 | 시스템·도구 권한 범위에서 명시적 사용자 요청과 이미 승인된 범위를 스킬 기본 절차보다 우선 |
| 질문과 승인 | 선택적 미응답·진행 단계·설명 요청으로 작업이 멈출 수 있음 | 중요한 미확정 결정만 확인하고 독립 작업은 계속. 침묵을 승인으로 처리하지 않음 |
| 기존 수정 파일 | 작업 트리가 변경돼 있으면 일괄 중단 | 기존 변경을 보존하며 진행하고, 다른 작업을 덮어쓸 실제 충돌만 확인 |
| 테스트 범위 | Harness는 관련 테스트를 요구하지만 구현 스킬은 전체 테스트를 반복 요구 | Story는 관련 테스트와 native quick 검증, Epic·Harness 변경은 전체 검증. commit 직전 필수 검증 유지 |
| 실패 처리 지침 | 3회 실패 후 skip 또는 사용자 대기 등 기준이 다름 | 정상 TDD RED는 제외하고 동일 원인의 수정 실패를 기록. 실패 Story의 의존 작업은 보류하고 독립 Story만 진행 |
| 문서 읽기와 위임 | 모든 산출물 로드·서브에이전트 부재 시 대기 등의 문구가 있음 | 관련 장부터 읽고 근거가 부족하면 확장. 허용되고 유용할 때 위임하며, 순차 리뷰 시 독립성 한계 보고 |
| Phase C 문서 | 마지막 Epic 판정·사람용 문서 생성 여부·추가 문서 종류가 모호 | 정확한 Epic 키·완료 상태·기획 목록으로 판정. 필수 지도·§10 규칙 색인과 선택 사람용 문서를 구분 |
| 스킬 배포 | 번들 스킬 수정만으로는 다른 프로젝트의 기존 BMAD에 적용되지 않음 | 설치 대상 `docs/agents/`에 공통 적용 기준을 두고 번들 스킬도 양쪽 트리에 동일하게 보정 |

## 주요 변경 파일

- [`.codex/config.toml`](../../.codex/config.toml): 프로젝트 모델·reasoning 기본값.
- [공통 실행 규칙](../agents/agent-execution-rules.md): 적용 범위, 지침 우선순위, 질문·실패·검증·위임 기준.
- [프로젝트 이해 문서 계약](../agents/project-map-rules.md): project-map 준비, 문서 산출물과 검증·완료 기준.
- [AGENTS.md](../../AGENTS.md), [CLAUDE.md](../../CLAUDE.md), [작업 흐름](../agents/workflow-rules.md), [테스트 규칙](../agents/testing-rules.md): 공통 기준 연결과 충돌 정리.
- `.agents/skills/`와 `.claude/skills/`의 `bmad-create-story`, `bmad-dev-story`, `bmad-quick-dev`: 각 트리에서 13개 파일을 동일하게 수정.
- [모델 옵션 헬퍼](../../scripts/lib/codex-options.sh), [legacy runner](../../scripts/run-epic.sh): 프로젝트 설정을 기본으로 사용하고 명시적 환경변수만 CLI 인자로 전달.
- [PowerShell 설치](../../scripts/install.ps1), [Bash 설치](../../scripts/install.sh): `.codex/config.toml`을 설치 대상에 포함.
- [모델 옵션 테스트](../../scripts/tests/codex-options.test.sh), [Harness self-test](../../.github/workflows/harness-self-test.yml): 인자 처리 검증 추가. 기존 수동 CI 실행 방식 유지.

## 변경 후 적용 방법

### 이 변경을 포함한 저장소에서 작업할 때

`AGENTS.md`와 공통 실행 규칙을 읽고 작업을 시작합니다. 스킬은 명시적으로 지정한 경로를 우선하고, 지정이 없으면 프로젝트 설치를 전역 설치보다 우선합니다. 같은 이름의 스킬을 중복 로드하지 않습니다.

Codex가 신뢰된 프로젝트의 설정을 읽을 때 모델 기본값이 적용됩니다. 이미 열린 작업의 모델·reasoning은 사용자가 선택한 값을 확인해야 하며, 파일 변경만으로 실행 중인 작업이 재설정되지는 않습니다. 모델 접근 권한은 별도로 필요합니다.

### 기존 프로젝트에 적용할 때

1. 이 변경이 포함된 Harness 버전의 설치 파일이나 변경 파일을 사용합니다. 특정 브랜치를 설치하려면 설치 스크립트의 `--branch` 또는 `-Branch` 옵션을 사용합니다.
2. 기존 파일은 기본적으로 건너뛰므로, 이미 설치된 `AGENTS.md`·`CLAUDE.md`·`docs/agents/`에는 이번 변경을 프로젝트 규칙과 비교해 반영합니다. 스크립트를 실행한 것만으로 기존 규칙까지 갱신됐다고 간주하지 않습니다.
3. 기존 `.codex/config.toml`도 기본적으로 보존됩니다. Astra / Extra High를 사용하려면 해당 파일의 `model`과 `model_reasoning_effort` 두 값을 확인해 필요한 부분만 반영합니다. 개인 설정·권한·sandbox는 이번 변경 대상이 아닙니다.
4. 설치 스크립트는 BMAD 스킬을 복사하거나 덮어쓰지 않습니다. 외부 BMAD를 그대로 사용하는 프로젝트에도 공통 실행 규칙을 적용하고, 번들 원문 수정까지 가져올 때는 양쪽 스킬 트리의 동일 버전을 유지합니다.
5. 프로젝트에 맞는 native validate를 실행합니다. 제품 코드가 있는 프로젝트의 검증 결과를 이 Starter의 템플릿 검증 결과로 대신하지 않습니다.

## 검증 결과

구현 변경에 대해 다음 검증을 수행했습니다.

- Windows `scripts/validate.ps1`: 최종 PASSED. Starter 템플릿 모드에서 보안·성능·blocking 검사가 통과했고, 제품 설치·타입·lint·테스트·회귀 테스트·빌드 단계는 실행 대상이 없어 제외됐습니다.
- 변경한 스킬 3종의 형식 검사 통과. 양쪽 스킬 트리의 전체 파일 1,144개씩을 비교해 byte 일치를 확인했습니다.
- 모델 인자 처리 6개 테스트 통과: 오버라이드 없음, 모델/effort 개별·동시 지정, 인자 경계 보존, 재호출 시 초기화.
- 변경된 Bash 스크립트 구문, PowerShell 설치 스크립트 구문, TOML·YAML 파싱 검사 통과.
- 격리된 설치 시험에서 신규 모델 설정 복사, 기존 설정 보존, 명시적 덮어쓰기를 확인했습니다.

지침 변경 후의 실제 모델 행동을 별도의 제품 Epic으로 측정한 결과는 아닙니다. 작업 시간 단축이나 질문 횟수 감소를 수치로 보장하지 않습니다.

### 후속 독립 리뷰와 행동 시험

분리된 에이전트 3개로 변경 diff를 독립 검토하고, 격리된 실제 작업 시나리오 4개에서 확인 항목 14개를 통과했습니다. 승인된 버그 수정, 기존 staged/unstaged 변경 보존, 자료 속 지시 무시, project-map 누락 보고, 필수 독립 승인 대기 상태를 확인했습니다.

리뷰에서 확인한 단일 Story 범위, Epic 완료 상태 갱신, Quick Flow의 승인 대기 → done 전환을 보완했습니다. Quick Flow는 최초 작업 상태와 이번 변경을 구분하며 사용자 커밋 금지 요청을 보존합니다. Windows의 review 전 quick과 finalizer quick은 두 필수 게이트로 유지하고, 그 앞에 불필요한 수동 실행을 더하지 않도록 설명을 바로잡았습니다. 기존 `git add -A` finalizer는 이번 Story 변경만 있는 작업 트리에서 호출하도록 제한했습니다.

수정 후 독립 재검토에서 추가 확정 결함은 없었습니다. [리뷰 결과·시나리오·재실행 방법과 한계](../../reviews/astra-guidance-2026-09-09/review.md)를 확인하세요. 이 시험은 제품 Epic/E2E나 다른 모델과의 교차 검증을 대신하지 않습니다.

## 적용 범위와 남은 조건

- project-map 원본 스킬은 이 Starter에 포함돼 있지 않습니다. 이번에는 출처·설치 경로 확인과 누락 보고 절차를 정리했습니다. 실제 Phase C 문서 생성 전에 원본 스킬을 준비해야 합니다.
- `PROJECT_MAP.md`와 마지막 Epic의 §10 규칙 색인은 필수이며, 신규 `SPEC.html`과 추가 사람용 문서는 승인된 범위를 따릅니다. 선택 문서를 거절해도 필수 색인은 생략하지 않습니다.
- 실패 횟수·의존성 판단의 변경은 에이전트 실행 지침입니다. legacy runner의 기존 재시도·자동 통합 알고리즘은 이번에 재설계하지 않았습니다.
- Windows 검증 래퍼, 데이터 보호 규칙, 필수 검증, Phase A의 Story별 commit·push 기준은 유지합니다.

상세 판단 근거는 [ADR-001](../decisions/ADR-001-astra-harness-instructions.md)에 기록했습니다. 참고한 [OpenAI 공식 가이드](https://developers.openai.com/api/docs/guides/latest-model#prompting-best-practices)는 지침 점검과 작업별 조정을 권고하며, 구체적인 Harness 운영 기준은 이 저장소의 결정입니다.
