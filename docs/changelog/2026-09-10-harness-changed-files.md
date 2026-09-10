# 26.09.10 Harness 변경 파일 상세

공통 하네스의 Astra / High 기본값과 역할별 모델 배정 변경을 설명합니다. 내부 프로젝트 목록, 운영 상태, 대상별 파일·브랜치·커밋 목록은 비공개 문서에서 관리하며 Git에 포함하지 않습니다.

[전체 변경 이력](README.md) · [Astra / High 변경 요약](2026-09-10-astra-high-model-routing.md)

## 변경 전후

| 역할 | 이전 | 변경 후 |
|---|---|---|
| 일반 작업 | Astra / Extra High | Astra / High |
| 복잡한 계획 | 공통 역할 없음 | Astra / Extra High planner |
| 독립 구현 | 공통 역할 없음 | Sol / High worker, 위임 허용 시에만 |
| 조사·탐색 | 공통 역할 없음 | Sol / Medium explorer |
| 일반 리뷰 | 공통 역할 없음 | Astra / High reviewer |
| 심층 분석 | 공통 역할 없음 | Astra / Extra High deep reviewer |

역할 파일과 운영 지침을 추가한 것으로, 실행 중인 주 에이전트의 모델을 자동으로 바꾸는 기능은 아닙니다. 각 프로젝트의 직접 구현·단일 리뷰어·검증·승인 기준을 유지합니다.

## 공통 하네스 수정 파일 12개


아래 경로는 `harness-starter` 저장소 기준이다. 상세 변경은 [원본 커밋](https://github.com/ITCONNECT-ci-cd/harness-starter/commit/753b4f5e85e7ae7f9c3afece5c176b225506be6e)에서 확인할 수 있다.

| 파일 | 역할과 변경 내용 |
|---|---|
| `.codex/agents/harness-deep-reviewer.toml` | 어려운 오류·권한·동시성 분석: Astra / Extra High, 읽기 전용 |
| `.codex/agents/harness-explorer.toml` | 조사·탐색·로그 분석: Sol / Medium, 읽기 전용 |
| `.codex/agents/harness-planner.toml` | 복잡한 계획·의존성 분석: Astra / Extra High, 읽기 전용 |
| `.codex/agents/harness-reviewer.toml` | 일반 독립 리뷰: Astra / High, 읽기 전용 |
| `.codex/agents/harness-worker.toml` | 독립 구현: Sol / High, 구현 위임 허용 프로젝트만 |
| `.codex/config.toml` | 일반 작업 기본값 Astra / High; 기존 다른 설정 보존 |
| `README.md` | 날짜별 변경 기록으로 이동하는 링크 |
| `docs/agents/agent-execution-rules.md` | 사용자 승인 우선·자율 진행·검증·실패 처리 및 모델 배정 연결 |
| `docs/agents/model-routing-rules.md` | 역할 선택·모델/추론 지정·위임 제한·실패 시 상향 조건 |
| `docs/changelog/2026-09-10-astra-high-model-routing.md` | High 기본값·역할별 배정의 변경 기록과 검증 한계 |
| `scripts/install.ps1` | 설정/규칙 배포 경로 연결; 원본은 새 역할 5개를 개별 설치, 기존 파일 보존 |
| `scripts/install.sh` | 설정/규칙 배포 경로 연결; 원본은 새 역할 5개를 개별 설치, 기존 파일 보존 |


## 적용 기준

- 프로젝트 기본값은 `.codex/config.toml`, 역할별 실행 값은 `.codex/agents/harness-*.toml`에서 관리합니다.
- 역할 호출은 TOML의 `name`을 사용하며 모델과 reasoning을 함께 지정합니다.
- 구현 위임이 허용되지 않은 프로젝트에는 worker를 배포하지 않습니다.
- 설치 스크립트는 역할 파일을 개별 복사하고, 같은 이름의 기존 파일과 사용자 설정을 기본적으로 보존합니다.
- 공통 규칙과 제품별 설정 차이는 검토 후 반영합니다. 전체 프로젝트 목록이나 적용 대상 정보를 이 문서에 추가하지 않습니다.

## 검증 기록과 한계

- 원본 native 전체 validate의 template 보안·성능·blocking 검사를 통과했습니다. 제품 관련 6단계는 대상이 없어 제외됐습니다.
- TOML/역할 값, 설치 스크립트 구문, 격리된 실제 복사 함수, 문서 링크·diff 검사와 독립 리뷰·배정 시나리오를 확인했습니다.
- 앱의 커스텀 역할 자동 발견/로딩, 실제 제품 Story·E2E·DB 테스트, 모델별 품질·시간·비용 비교는 이 기록의 검증 범위에 포함되지 않습니다.
- 대상 프로젝트의 적용·검증·운영 결과는 비공개 관리 자료에 별도로 기록합니다.
