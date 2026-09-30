---
title: "Orca 오케스트레이션 적용 — Phase A·B 교체와 4개 모델 통일"
date: 2026-09-30
tags: [harness, orca, model-routing, workflow]
---

# 26.09.30 Orca 오케스트레이션 적용

> [전체 변경 이력](README.md) · [결정 기록 ADR-002](../decisions/ADR-002-orca-orchestration.md) · [Orca 가이드](../harness/orca.md)

ORCA SDD Orchestrator v5.0 프롬프트를 하네스에 적용했습니다. Phase A(Codex Desktop 구현)와 Phase B(Claude Code 리뷰)를 Orca 흐름으로 바꾸고, 모델을 Gemini 3.8 Flash, Sonnet 5.5, GPT-6 Sol, Opus 5.5 네 개로 통일했습니다. 사용자는 README의 Orca 프롬프트에 빈칸만 채워 개발을 맡깁니다.

## 회의에서 설명할 핵심

**개발은 코디네이터가 나눠 주고 워커가 합니다.** Story마다 구현 워커가 story 생성, TDD 구현, 빠른 검증, 커밋을 하고, 작성자와 다른 회사의 모델이 읽기 전용으로 리뷰합니다. 코디네이터는 합격한 Story를 `epic/<번호>` 브랜치에 모으고 Epic 끝에 전체 검증을 한 번 돌립니다. develop 병합은 사람이 따로 요청할 때만 합니다.

**프롬프트는 저장소 규칙으로 옮겼습니다.** 263줄 프롬프트를 채팅에 붙이면 코디네이터만 보고 워커는 보지 못합니다. 규칙을 `orca-rules.md`와 `AGENTS.md`에 두어 모든 워커가 같은 규칙을 읽고, 회고에서 고친 내용이 다음 Epic에 바로 반영되게 했습니다.

**원래 프롬프트에서 실행할 수 없거나 비용이 새는 부분을 고쳤습니다.** Orca는 사용량을 명령어로 제공하지 않아 한도 계산식을 사람이 알려 주는 값 기준으로 바꿨습니다. 60초 대기는 최대 9분 대기로, 런당 세션 6개는 Story당 6개로, 코디네이터 직접 수정 전면 금지는 작은 수정 허용으로 바꿨습니다.

**모델 기준을 한 곳으로 모았습니다.** Codex 기본값(Astra), Codex 역할 프로필 5개, Claude 표(Opus 5, Fable 5.1 등)로 흩어져 있던 기준을 `model-routing-rules.md` 하나로 합쳤습니다.

## 변경 전후

| 구분 | 변경 전 | 변경 후 |
|---|---|---|
| 구현 | Codex Desktop이 Epic 전체를 순서대로 구현 | Orca 구현 워커가 Story 하나씩 구현 (모델은 Story 위험도로 배정) |
| 리뷰 | Epic이 끝난 뒤 Claude Code가 일괄 리뷰 | Story마다 작성자와 다른 회사 모델이 리뷰 |
| 브랜치 | story/* → develop → main | story/* → epic/* → develop → main |
| 커밋·push | 구현 에이전트가 Story마다 commit + push | 워커는 로컬 커밋, push·merge는 코디네이터가 승인 범위 안에서 |
| 상태 파일 | BMAD 스킬이 각자 `sprint-status.yaml` 수정 | 코디네이터만 수정 |
| 검증 | Story quick, Epic validate, 리뷰 후 validate + smoke | Story quick, Epic 통합 후 validate + smoke 한 번 |
| 모델 | Astra(Codex 기본), 5.6 Sol, Opus 5, Fable 5.1, Sonnet 5, Haiku 4.5 | Gemini 3.8 Flash, Sonnet 5.5, GPT-6 Sol, Opus 5.5 |
| 모델 기준 위치 | `config.toml` + 역할 프로필 5개 + Claude 표 | `model-routing-rules.md` 한 곳 |
| 실패 처리 | 같은 원인 3회 후 skip | 워커 안 3회 + 다른 모델로 재배정 1회 후 보류 |
| 회고 입력 | 리뷰, validate 로그, codex 로그 | 리뷰, 수집한 검증 로그, Orca 실행 기록(모델별 결과) |
| 자동화 | `run-epic.sh` (Codex CLI + Claude CLI) | 삭제. Orca가 대체 |

## 수정 파일

| 파일 | 변경 |
|---|---|
| `docs/agents/orca-rules.md` | 신규. 코디네이터 규칙 (원래 프롬프트 1~10장을 하네스 흐름에 맞게 재작성) |
| `AGENTS.md` | 역할 표 교체, 코디네이터 시작 루틴, 모든 워커가 읽는 「Orca 워커 규칙」 |
| `CLAUDE.md` | 역할 2를 Orca 개발로 교체, 상황별 규칙 표에 orca-rules 추가 (상시 @import 목록은 그대로) |
| `GEMINI.md` | 신규. Gemini 워커가 AGENTS.md를 읽도록 연결 |
| `docs/agents/model-routing-rules.md` | 4개 모델 기준으로 재작성 (역할별 배정, 위험 영역, effort, 설정 위치) |
| `docs/agents/agent-execution-rules.md` | Orca 워커의 BMAD 적용 기준(sprint-status, 리뷰 결과 기록, 다음 Story), 비대화형 실행, 위임, 모델 기본값 |
| `docs/agents/workflow-rules.md` | Phase A·B를 Story 단위 Orca 흐름으로 교체, 브랜치 규칙, 실패 처리, Phase C 입력 |
| `docs/agents/testing-rules.md`, `REVIEW.md` | Story 리뷰는 validate-quick, Epic 통합은 validate + smoke 기준 |
| `templates/orca-worker-contract.md`, `templates/orca-epic-plan.md`, `templates/orca.yaml` | 신규. 워커 계약, Epic 실행 계획, 워크트리 준비 명령 양식 |
| `.codex/config.toml` | GPT-6 Sol / medium (Codex를 직접 열 때의 기본값) |
| `.codex/agents/harness-*.toml` (5개) | 삭제. 작업 분배는 Orca가 담당 |
| `scripts/run-epic.sh`, `scripts/lib/codex-options.sh`, `scripts/tests/codex-options.test.sh` | 삭제. legacy 자동화 |
| `scripts/phase-a/finalize-story.ps1` | `-NoPush` 추가. 지정하면 현재 브랜치에 커밋만 하고 push하지 않음 |
| `scripts/install.sh`, `scripts/install.ps1` | GEMINI.md 배포, 역할 프로필 제외, `.gitignore` 블록에 `state/orca/` 추가 (install.sh) |
| `.github/workflows/harness-self-test.yml` | 삭제한 codex-options 테스트 단계 제거 |
| `scripts/status.sh`, `scripts/doctor.ps1`, `scripts/lib/validate-utils.sh` | 안내 문구와 주석의 run-epic·Phase A 표현 정리 |
| `.gitignore` | `state/orca/` 제외 |
| `README.md` | Orca 개발·이어서 하기·Epic 통합 프롬프트, 문서 표, 최근 변경 |
| `docs/harness/orca.md` | 신규. 사람용 준비·운영 안내 |
| `docs/harness/greenfield.md`, `docs/harness/validation.md`, `README-brownfield.md` | 흐름, 설치 경로 목록, 문제 해결 표 갱신 |
| `state/README.md`, `reviews/README.md`, `plans/README.md` | 상태 파일, Orca 실행 기록, Epic 계획의 위치 |
| `docs/decisions/ADR-002-orca-orchestration.md` | 신규. 결정 이유와 대안 |
| `docs/decisions/ADR-001-astra-harness-instructions.md` | 상태를 "일부 대체"로 표시 |

BMAD 스킬(`.claude/skills`, `.agents/skills`)과 validate·smoke 스크립트는 수정하지 않았습니다.

## 실행한 검증

- `bash -n`: `scripts` 아래 모든 .sh 통과
- PowerShell 7.4 파서(self-test와 같은 검사): `scripts` 아래 .ps1 16개 통과. 핵심 진입점의 Bash 호출 없음
- `finalize-story.ps1` 동작 시험(임시 저장소, Linux의 PowerShell 7.4): `-NoPush`는 현재 브랜치(`orca/worker-1`)에 커밋하고 push 없이 종료 코드 0. `-NoPush`가 없으면 기존대로 `story/<이름>` 브랜치로 전환·커밋한 뒤 push를 시도(원격이 없어 실패)
- template mode `validate.sh`·`validate-quick.sh`와 `validate.ps1`·`validate-quick.ps1`(Linux의 PowerShell 7.4) 모두 통과. `validate.sh`의 security 경고 1건은 변경 전 HEAD에서도 나는 기존 경고(`validate.ps1` 안의 검사 패턴 문자열이 grep에 걸림)
- 두 스킬 트리 byte 동기화 통과. `.codex/config.toml`(TOML), `templates/orca.yaml`·`harness-self-test.yml`(YAML) 파싱 통과. `git diff --check` 통과
- 바뀐 문서의 상대 링크가 모두 존재하는지 확인. 삭제한 스크립트와 옛 모델 이름이 역사 기록(ADR, changelog, incident 발견 기록) 밖에 남지 않았는지 확인

## 남은 확인 항목

- Windows 러너의 Harness Self-Test(PowerShell 진입점, doctor 실행)는 GitHub Actions에서 수동 실행으로 확인해야 합니다.
- 실제 Orca 실행은 하지 않았습니다. GPT-6 Sol과 Gemini 3.8 Flash의 등록 ID(`gpt-6-sol`은 프롬프트가 인용한 모델 문서 경로에서 추정), `worker-start`의 `--worktree`·`--setup` 값, Gemini 워커의 GEMINI.md 로드는 첫 실행의 시작 확인에서 확인합니다.
- 예산과 모델 배분 기본값은 초기값입니다. Story 2~3개 파일럿 후 `orca-runs.md`로 조정합니다.

## 기존 설치 프로젝트에 적용할 때

- 설치 스크립트는 기존 파일을 덮어쓰지 않습니다. `AGENTS.md`, `CLAUDE.md`, `docs/agents/*`는 `--force` 설치 또는 수동 병합으로 갱신합니다.
- `.codex/agents/harness-*.toml`은 설치 스크립트가 지우지 않습니다. 직접 삭제합니다.
- `.gitignore`에 Harness 규칙 블록이 이미 있으면 `state/orca/`를 직접 추가합니다.
- `templates/orca.yaml`을 참고해 루트 `orca.yaml`을 만듭니다.
