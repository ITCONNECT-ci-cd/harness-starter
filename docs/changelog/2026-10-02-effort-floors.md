---
title: "effort 하한 — Sonnet 5.5·GPT-6.1 Sol·리뷰는 최소 high"
date: 2026-10-02
tags: [harness, model-routing, effort]
---

# 26.10.02 effort 하한

> [전체 변경 이력](README.md) · [모델 배정 규칙](../agents/model-routing-rules.md) · 선행: [코디네이터 무인 진행·사용량 가드·세션 인계](2026-10-02-coordinator-autonomy.md)

모델 선택 표는 그대로 두고, effort에 모델·역할별 **하한**을 더했습니다. 지금까지는 위험도만으로 effort를 정해(낮음 medium) Sonnet 5.5와 GPT-6.1 Sol이 medium으로 도는 자리가 많았습니다.

## 회의에서 설명할 핵심

**Sonnet 5.5와 GPT-6.1 Sol은 어떤 일이든 high 이상입니다.** 위험 낮음 Story, 코디네이터, 회고, 조사처럼 지금까지 medium이던 자리를 모두 high로 올렸습니다. 품질을 우선하는 운영 결정이며, 효과는 `orca-runs.md` 기록으로 확인합니다.

**리뷰(검증)는 모델과 상관없이 high 이상, 위험 높음은 xhigh입니다.** 놓친 결함은 뒤에서 더 비쌉니다.

**Opus 5.5는 기본 medium이고, 어려운 일은 배정안에서 올립니다.** 설계 판단·원인 분석은 high부터입니다. 모델이 스스로 effort 수준을 올리지는 않으므로(같은 수준 안에서 생각의 깊이만 조절), 어려운 일에 높은 수준을 쓰려면 배정안에 적어 띄워야 합니다.

**Gemini 3.8 Flash 구현은 high입니다.** Antigravity에서 Flash의 수준은 모델 ID에 붙고(`gemini-3.8-flash-low`·`-medium`·`-high`) high가 최상위입니다. 다른 저장소의 운영 기록에서 Flash medium 구현은 단순한 일은 통과했지만 첫 통과에서 medium 발견 26건이 나온 경우가 있었고, Flash high로 돌린 검증 렌즈는 자체 모순 결과를 내 기각됐습니다. 그래서 구현은 최상위로 올리고, 리뷰·검증에는 지금처럼 쓰지 않습니다.

**Codex를 직접 열 때 GPT-6.1 Sol은 medium입니다.** Codex에서 Sol의 기본 effort는 low라서 `.codex/config.toml`의 medium을 지우거나 낮추지 않습니다. Orca 워커로 띄울 때는 하한대로 high 이상을 명시합니다.

## 변경 전후

| 자리 | 변경 전 | 변경 후 |
|---|---|---|
| 일반 × 위험 낮음 (Sonnet 5.5) | medium | high |
| 연계 × 위험 낮음 (GPT-6.1 Sol) | medium | high |
| 설계 판단 × 위험 낮음 (Opus 5.5) | medium | high |
| 리뷰 (위험 낮음) | medium | high |
| 코디네이터 기본 (Sonnet 5.5) | medium | high |
| 코드 조사(넓음)·Phase C 회고·Quick Flow (Sonnet 5.5) | medium | high |
| 코디네이터 상향 (Opus 5.5) | medium | medium (오류가 반복되면 high) |
| 정형 × 위험 낮음 (Gemini 3.8 Flash) | medium | high (`gemini-3.8-flash-high`) |
| Gemini의 수준 표기 | 규칙에 없음 | 모델 ID 접미사(low·medium·high, 최상위 high), Orca 워커의 `--effort` 지원은 시작 확인에서 정함 |
| Codex 직접 사용 기본 (GPT-6.1 Sol) | medium | medium — 지우거나 low로 낮추지 않음을 명시 |
| 인계 스크립트 `--effort` | 기본값 medium | 필수, Sonnet은 high 미만이면 거부 |

## 수정 파일

| 파일 | 변경 |
|---|---|
| `docs/agents/model-routing-rules.md` | 구현 표에 칸별 effort, 리뷰 최소 high, 대체 모델 하한, 「effort 원칙」 하한 표, 코디네이터·그 밖의 역할 effort, 재승인 문구 |
| `docs/agents/orca-rules.md` | 코디네이터 Sonnet high, `worker-start` 하한 확인, 인계 명령의 effort |
| `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/harness/orca.md`, `templates/orca-epic-plan.md` | 코디네이터·effort 설명 |
| `docs/decisions/ADR-002-orca-orchestration.md` | 결정 2·4의 effort가 이번 하한으로 바뀌었다는 보완 표시(본문은 당시 기록으로 보존) |
| `.codex/config.toml` | 주석: 직접 사용 최소 medium, Orca 워커는 high 이상 명시 |
| `scripts/orca/session-rollover.mjs` | `--effort` 필수, `effortProblem` 하한 검사(Sonnet high, 그 밖 medium — 시험 모드 포함). 후임 명령은 정해진 부품으로만 만든다(`--agent-cmd` 제거). 미전송 탭을 이어 쓸 때는 기록의 모델·effort와 그 탭 시작 배너의 effort가 모두 기대와 같아야 어떤 전송이든 한다. 새로 띄운 탭도 배너 effort가 하한 아래면 닫는다(배너는 「Claude Code v…」 다음 두 줄, 모델 이름 뒤의 「with … effort」만) |
| `scripts/tests/orca-scripts.test.mjs` | 하한·배너 effort 시험 추가(전체 17개) |

## 실행한 검증

- `node --test scripts/tests/orca-scripts.test.mjs` 17/17
- 실제 Orca 인계 시험(`--dry-run`, Sonnet / high): 배너에서 effort를 읽어 하한 통과, 응답 `ROLLOVER-5555`
- 독립 리뷰(Codex GPT-6 Astra, high): medium 4·low 2 — `--agent-cmd`·`--dry-run` 우회, `CLAUDE.md` 잔재, 재승인 기준 문구, ADR-002 보완 표시, 시험 수 표기 → 전부 반영
- 닫힘 재검증: 5/6 닫힘 + 새 medium 3(따옴표·중복 옵션 속임, 미전송 탭 재사용 경로가 effort 검사를 건너뜀, 배너 판독이 배너 밖·줄바꿈에 약함) → 인자 분해·기록 대조로 고침
- 2차 닫힘 재검증: 직접 명령의 셸 이스케이프(PowerShell 백틱)·`--` 뒤 옵션, 재사용 탭의 재전송·Enter 경로가 배너 검사보다 앞섬, 배너 판독이 입력문 속 글자를 읽음 → 같은 식으로 메우지 않고 구조를 바꿈: `--agent-cmd` 제거(인자 분해도 함께 삭제), 재사용은 기록과 배너의 일치를 모든 제출보다 먼저 요구, 배너 영역 한정. 문서: `worker-start` effort 규칙의 Gemini 예외, 대체 모델 예시
- 실제 Orca 인계 시험을 구조 변경 뒤 다시 돌림(아래 실행 결과)
- `session-rollover.mjs`에 Sonnet / medium을 주면 종료 1과 하한 안내, `--effort`를 빼면 종료 1
- template mode `validate.sh`·`validate-quick.sh`, `git diff --check`, 바뀐 문서 상대 링크

## 근거

- Claude effort: Sonnet 5.5는 low~max 지원·기본 high(수준 재조정), Opus 5.5는 기본 medium. 지능이 중요한 작업은 최소 high 권장, effort를 낮추면 도구 호출과 확인이 줄어든다(Claude API 문서)
- Gemini 3.8 Flash: `agy models`(2026-10-02) — `gemini-3.8-flash-low|medium|high`만 있다
- GPT-6.1 Sol: Codex 기본 effort low(API medium) — [GPT-6.1 Sol 교체 기록](2026-09-30-gpt-6-1-sol.md)
