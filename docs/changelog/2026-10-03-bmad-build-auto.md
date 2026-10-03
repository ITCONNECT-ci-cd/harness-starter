---
title: "구현 워커를 bmad-build-auto로 교체 (create-story·dev-story 폐기 대응)"
date: 2026-10-03
tags: [harness, bmad, orca, adr-004]
---

# 26.10.03 구현 워커를 bmad-build-auto로 교체

> [전체 변경 이력](README.md) · [ADR-004](../decisions/ADR-004-bmad-build-auto.md) · 선행: [Orca 오케스트레이션 적용](2026-09-30-orca-orchestration.md)

## 회의에서 설명할 핵심

**하네스가 시키던 구현 스킬 두 개가 BMAD에서 폐기됐습니다.** 구현 워커는 `bmad-create-story`와 `bmad-dev-story`를 순서대로 실행하도록 되어 있었습니다. BMAD 6.11(2026-08-10)이 이 둘을 deprecated로 바꿨고, 6.12 설치기는 기본으로 설치하지 않습니다. 새 프로젝트에서 `preflight.ps1`이 이 때문에 실패했습니다.

**구현 워커는 `bmad-build-auto`를 씁니다.** 업스트림의 Phase 4 표준 흐름은 `bmad-sprint-planning → bmad-build → bmad-code-review`입니다. 그중 `bmad-build-auto`가 사람 승인 없이 도는 무인 변형입니다. 워커는 `sprint-status.yaml`을 고치지 않는다는 기존 규칙과 맞습니다. 이 스킬은 그 파일을 건드리지 않습니다.

**Story 파일이 spec 파일로 바뀝니다.** 미리 만드는 Story 파일 단계가 없어지고, 스킬이 Story 키로 시작하는 이름의 spec 파일을 직접 만듭니다. 코디네이터는 이름을 짐작하지 않고 워커 보고에서 경로를 받습니다.

**하네스 규칙은 BMAD 파일을 고치지 않고 오버라이드로 넣습니다.** `_bmad/custom/bmad-build-auto.toml`의 `persistent_facts`가 TDD, 검증 명령, 커밋 형식, 상태 파일 금지를 워커에 전달합니다. BMAD 스킬 파일은 업데이트 때 덮어쓰이므로 예전처럼 스킬 파일을 직접 고치지 않습니다.

**독립 리뷰는 그대로입니다.** 작성자와 다른 회사 모델의 리뷰 워커가 `bmad-code-review`를 실행합니다. 업스트림도 이 스킬을 Build 내장 리뷰 뒤의 선택 추가 점검으로 둡니다.

## 변경 전후

| 자리 | 변경 전 | 변경 후 |
|---|---|---|
| 구현 워커 스킬 | `bmad-create-story` → `bmad-dev-story` | `bmad-build-auto` |
| 기획 스킬 이름 | `bmad-create-prd`, `bmad-create-architecture` | `bmad-prd`, `bmad-architecture` |
| Quick Flow | `bmad-quick-dev` | `bmad-build` (6.11 이전 번들은 `bmad-quick-dev`) |
| 작업 산출물 | Story 파일 | spec 파일 `spec-<story-key>*.md` |
| 스킬 경로 | 스킬 호출 또는 `workflow.md` 직접 읽기 | 저장소 번들 `.agents/skills/<스킬>/SKILL.md`. `bmad-build-auto`는 렌더 명령 실행 |
| BMAD 요건 | 명시 없음 | 6.11 이상 6.x, `uv` 필요 |
| 하네스 규칙 주입 | 스킬 파일을 직접 수정 | `_bmad/custom/bmad-build-auto.toml` |
| Story당 추가 세션 | 6개 | 12개 (한 번에 통과한 경우. 수정 루프를 다 쓰면 더 늘어남) |
| `preflight.ps1` | 실패 사유를 출력하지 않음 | 새 검사(스킬·`uv`·렌더 스크립트·오버라이드·BMAD 버전)는 사유를 출력. 5.1 파싱 오류 해결 |

## 수정 파일

| 파일 | 역할 |
|---|---|
| `_bmad/custom/bmad-build-auto.toml` | 신규. 구현 워커에 하네스 규칙을 넣는 BMAD 오버라이드 |
| `docs/decisions/ADR-004-bmad-build-auto.md` | 신규. 결정, 대안, 근거, 확인하지 못한 것 |
| `scripts/orca/touch-epic-context.mjs` | 신규. 새 워크트리에서 `epic-<N>-context.md` 수정 시각을 올림 |
| `scripts/tests/orca-scripts.test.mjs` | 위 스크립트 시험 2개 추가 |
| `templates/orca.yaml` | `scripts.setup`에 수정 시각 보정 줄 추가 |
| `scripts/phase-a/preflight.ps1` | 새 스킬·`uv`·`render_skill.py`·오버라이드·BMAD 버전 검사, UTF-8 BOM |
| `scripts/install.sh`, `scripts/install.ps1` | 오버라이드와 ADR-004를 설치 목록에 추가 |
| `AGENTS.md`, `CLAUDE.md`, `docs/agents/*`, `templates/*`, `docs/harness/*`, `plans/README.md`, `README.md` | 스킬 이름, 절차, 계약 서식, 예산, 재시도 규칙 갱신 |

## 설계에서 확인한 사실

- `bmad-build-auto`는 서브에이전트가 필수입니다. 못 쓰면 `blocked`(`no subagents`)로 끝납니다. 이 경우 승인된 대체 모델로 재배정합니다.
- 스킬이 스스로 커밋합니다(push는 안 함). 하네스의 `finalize-story.ps1 -NoPush`는 커밋할 변경이 없으면 커밋 없이 검증만 하므로 두 번째 검증 관문으로 남습니다.
- `epic-<N>-context.md`는 코디네이터가 Epic 시작 때 한 번 만들어 커밋합니다. 스킬은 이 파일을 "기획 문서보다 수정 시각이 새것"일 때만 유효한 캐시로 봅니다. 새 워크트리는 checkout 순서 때문에 낡게 보일 수 있어 `scripts.setup`이 수정 시각을 올립니다.
- `bmad-code-review`의 리뷰 계층은 4개입니다(spec이 없으면 3개). 처음 문서는 3개로 적었다가 리뷰에서 바로잡았습니다.
- 일찍 멈추면 spec이 아니라 `bmad-build-auto-result-*.md`가 남고, `blocked` spec은 영구적입니다. 재시도 전에 워크트리를 정리해야 합니다.

## 검증

실행해서 확인한 것:

이 변경을 적용한 프로젝트 저장소(BMAD 6.12.0 설치)에서:

- `bmad-build-auto` 렌더: 오버라이드의 `persistent_facts`가 렌더된 `workflow.md`에 들어감 (`uv run render_skill.py`, 종료 코드 0).
- `preflight.ps1 -Epic 1`을 `main`에서 실행: `Loop A preflight passed for Epic 1`, 종료 코드 0. 반영 전에는 실패했습니다.
- 하네스 node 테스트 29개 통과 (이 변경의 2개 포함).
- 독립 리뷰 1회: 리뷰어가 스킬 원본과 대조해 지적한 항목 중 소스로 확인된 것을 반영했습니다.

이 저장소(스타터)에서 `harness-self-test.yml`의 단계를 로컬(Windows)에서 같은 명령으로 실행:

- 모든 `scripts/**/*.sh`(12개) `bash -n` 실패 0건.
- 모든 `scripts/**/*.ps1`(16개) PowerShell 7 파싱 오류 0건.
- `node --test scripts/tests/orca-scripts.test.mjs` 19개 통과 (기존 17개 + 이 변경의 2개).
- `.agents/skills`와 `.claude/skills` 동기 유지 (이 변경은 스냅샷을 바꾸지 않음).
- `validate-quick.sh`, `validate.sh`, `validate-quick.ps1`, `validate.ps1` 모두 PASSED (template 모드). `validate.sh`의 보안 단계 경고 1건은 `scripts/validate.ps1:179`의 검색 패턴 문자열이 자기 자신과 일치한 기존 오탐이고 이 변경과 무관합니다. PowerShell 버전의 같은 검사는 통과합니다.
- Windows PowerShell 5.1: `preflight.ps1` 파싱 오류 0건 (변경 전 2건).

실행하지 못했거나 통과로 세지 않는 것:

- 이 설치에서 `bmad-build-auto`를 끝까지 실행하지 않았습니다. 렌더와 오버라이드 주입만 확인했습니다.
- Codex(GPT-6.1 Sol)와 Gemini 3.8 Flash 워커가 서브에이전트를 쓸 수 있는지 확인하지 못했습니다. 첫 Epic 시험 운영(Story 1~2개)에서 확인합니다.
- 수정 시각 보정이 실제 Orca 워크트리 생성 순서에서 동작하는지는 단위 시험만 했습니다.
- 소스 패키지가 없는 프로젝트에서 전체 `validate`는 `NO_PACKAGE`로 실패합니다. 이 변경과 무관한 기존 상태이고 통과로 세지 않습니다.

## 남은 항목

| 항목 | 내용 |
|---|---|
| 이 저장소의 BMAD 스킬 스냅샷 | `.agents/skills`와 `.claude/skills`는 6.12 이전 스냅샷이라 `bmad-build-auto`가 없습니다. 이 변경은 스냅샷을 바꾸지 않았습니다. 프로젝트에는 `install.sh`가 스킬을 설치하지 않으므로(기존 BMAD 사용) 영향은 이 저장소 안에만 있습니다. 스냅샷을 6.12로 갱신할지, 스냅샷을 없애고 설치기에 맡길지는 따로 정해야 합니다. |
| 의존성 추가 금지 규칙 | `AGENTS.md`의 "의존성을 추가하지 않는다"는 모노레포를 처음 만드는 Story와 부딪힙니다. 계약에 허용 목록 칸을 둘지 결정이 필요합니다. 이 변경은 바꾸지 않았습니다. |
| Windows PowerShell 5.1 | `install.ps1`(5건), `init-harness.ps1`(4건), `setup-repo.ps1`(1건)은 5.1에서 파싱 오류가 있습니다. 직접 확인했고 `install.ps1`은 변경 전과 같은 5건입니다. 원인은 BOM 없는 UTF-8 한글 문자열로 추정하며, `preflight.ps1`은 BOM을 붙여 0건이 됐습니다. 나머지 세 파일은 고치지 않았습니다. |
| v7 | BMAD v7이 나오면 `bmad-sprint-planning`과 `sprint-status.yaml`이 `bmad-ticket`으로 대체될 예정입니다(미릴리스). 이 하네스는 6.x에 고정합니다. 올릴 때 ADR-004를 다시 평가합니다. |
