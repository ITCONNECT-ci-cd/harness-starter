---
title: "Claude Fable 5 반영 — 변경 파일 상세"
date: 2026-09-10
tags: [harness, claude, fable-5, model-routing]
---

# 26.09.10 Claude Fable 5 반영 — 변경 파일 상세

> 이 문서는 2026.09.10 작업 당시의 상세 기록입니다.
> [전체 변경 이력](README.md) · [변경 요약](2026-09-10-claude-fable5-harness.md) · [같은 날 Codex 쪽 변경](2026-09-10-harness-changed-files.md)

Codex 쪽 [Astra / High 모델 배정](2026-09-10-astra-high-model-routing.md)과 짝을 이루는 Claude 쪽 변경입니다. 근거는 Anthropic의 [Claude Fable 5 프롬프팅 가이드](https://platform.claude.com/docs/ko/build-with-claude/prompt-engineering/prompting-claude-fable-5)이며, 적용 대상은 Claude가 담당하는 Phase B(리뷰·수정)와 Phase C(회고·하네스 강화)입니다.

## 회의에서 설명할 핵심

**보고를 근거에 묶었다.** 완료를 보고하기 전에 각 주장을 실제 실행 결과에 대응시키고, 근거를 댈 수 없으면 미검증이라고 적는다. Phase A가 Story 여러 개를 무인으로 돌기 때문에 여기가 가장 취약한 지점이었다.

**요청 범위를 넘는 구현을 막았다.** 기존 규칙은 "story와 무관한 리팩터링 금지"까지였고, 가상의 미래 요구를 위한 추상화나 일어날 수 없는 경우의 방어 코드는 막지 못했다. 높은 effort에서 가장 자주 나타나는 패턴이다.

**Claude 쪽 모델·effort 기준을 만들었다.** 기존 모델 기준은 전부 `.codex/config.toml` 전용이라 Phase B·C에 기준이 없었다. 일반 작업은 Opus 5 / high, 어려운 분석은 Fable 5.1 / xhigh, 조사와 문서 작업은 Sonnet 5 / medium이다.

**과규범적 지시를 뺐다.** 가이드가 "짧은 간결성 지시가 각 패턴을 나열하는 것만큼 효과적"이라고 밝혀, 완료 보고의 항목 열거와 3중 중복된 검증 명령 안내를 정리했다.

## 변경 전후

| 구분 | 변경 전 | 변경 후 |
|---|---|---|
| 완료 보고 | 포함할 항목을 열거 | 결과 우선 + 각 주장을 도구 결과에 연결, 미검증은 명시 |
| 보고 형식 | "간결하게 설명한다" 한 줄 | 결과 우선·선별·용어 재도입 기준을 절로 분리 |
| 턴 종료 | 규정 없음 | 계획·질문·약속으로 끝내지 않음, 비대화형 실행 기준 추가 |
| 구현 범위 | story 무관 리팩터링 금지 | 과잉 설계·일회성 헬퍼·불가능한 경우의 방어 코드까지 금지 |
| Claude 모델·effort | 기준 없음 (Codex 전용) | 역할별 모델·effort 표 (Phase B·C 기준) |
| 보안 리뷰 거부 | 규정 없음 | 재시도 금지, 미검증 기록, 폴백 확인 |
| 사고 과정·토큰 노출 | 규정 없음 | 하네스 유지보수 금지 사항으로 명문화 |
| 검증 진입점 | 일부 문서가 bash 경로 단정 | 전 문서 OS/셸 중립 |
| blocking check 승격 | `validate.sh`에만 추가 | `validate.sh`·`validate.ps1` 양쪽 |
| Vitest 순차 실행 | "순차 실행합니다"로 기술 | 실제로는 병렬임을 명시하고 지정 방법 안내 |

역할별 프로필 파일은 만들지 않았습니다. 실행 중인 세션의 모델을 자동으로 바꾸는 기능도 아닙니다. 세션 모델은 `/model`로 사람이 고르고, 하위 에이전트 모델은 생성 시 인자로 지정합니다.

## 이번에 바꾼 12개 파일 + 신규 2개

경로는 `harness-test` 저장소 기준입니다.

| 파일 | 역할과 변경 내용 |
|---|---|
| `docs/agents/agent-execution-rules.md` | 근거 기반 완료 보고, 「보고와 소통」 절 신설, 약속으로 턴 종료 금지, 비대화형 실행 기준, 「하네스 유지보수 금지 사항」 절 신설, Claude 모델·effort 연결 |
| `docs/agents/coding-rules.md` | 「구현 범위」 절 신설 — 과잉 설계·일회성 헬퍼·불가능한 경우의 방어 코드·불필요한 하위 호환 shim 금지 |
| `docs/agents/model-routing-rules.md` | 「Claude Code 측 모델·effort」 절 신설 — 역할별 모델·effort 표, 기본값이 `xhigh`라는 사실, Fable 5.1 거부 처리 연결 |
| `docs/agents/security-rules.md` | 「보안 작업 중 모델 거부 처리」 절 신설 — 재시도 금지, 범위 축소 재요청, 미검증 기록, 폴백 확인 |
| `docs/agents/testing-rules.md` | Vitest 병렬 실행 실태 정정과 순차 실행 지정 방법, 4층 표·본문의 검증 도구명 OS 중립화 |
| `docs/agents/workflow-rules.md` | blocking check 승격 대상을 `validate.sh`·`validate.ps1` 양쪽으로, 공통 강제 위치와 승격 문구 통일 |
| `docs/agents/feedback-rules.md` | 운영 규칙 헤더의 승격 대상을 양쪽 진입점으로 |
| `REVIEW.md` | §2 에러 처리에 경계 한정 추가, §7 불필요한 복잡성에 판단 기준 추가, 판정 기준의 검증 진입점 OS 중립화 |
| `CLAUDE.md` | Build/Test 절의 3중 중복 7줄을 참조 한 줄로 축약, 상황별 규칙 표에 모델 배정 행 추가, 역할 2의 검증 진입점 OS 중립화 |
| `AGENTS.md` | Phase B 시작 루틴과 Validation 절의 검증·smoke 진입점 OS 중립화 |
| `README.md` | 문서 표에 Claude effort 배정 행, 최근 변경 항목, Phase A·B 프롬프트에 목적 슬롯, Phase A·B·C 완료 보고 지시 정리 |
| `docs/changelog/README.md` | 변경 이력 목록에 이번 기록 추가 |
| `docs/changelog/2026-09-10-claude-fable5-harness.md` | **신규** — 변경 요약, 뺀 지침, 바꾸지 않은 것과 이유 |
| `docs/changelog/2026-09-10-claude-fable5-changed-files.md` | **신규** — 이 문서 |

## 가이드가 요구한 5개 항목의 처리

| 가이드 요구 | 처리 |
|---|---|
| effort 기본값 재설정 | `model-routing-rules.md`에 역할별 표 신설 |
| 장황함 억제 | 「보고와 소통」 절 + README 프롬프트 정리 |
| 진행 보고를 도구 결과에 묶기 | 「검증과 실패 처리」에 2개 규칙 추가 |
| 과규범적 스킬 완화 | BMAD 번들은 미수정. 기존 방식대로 `agent-execution-rules.md`의 BMAD 기준 표로 처리 |
| 추론 재현 지시 감사 | 전 저장소 검색 결과 위반 0건. 재발 방지 규칙만 추가 |

## 적용되는 것과 유지되는 것

- Claude 쪽 규칙 문서만 바꿨습니다. `.codex/` 아래 설정과 역할 프로필, Codex의 실행 경로는 건드리지 않았습니다.
- `.claude/skills/`와 `.agents/skills/`의 BMAD 번들은 수정하지 않았습니다. byte 동기화를 `harness-self-test`가 검증하고 `CLAUDE.md`가 임의 수정을 금지하므로, 스킬 완화는 `agent-execution-rules.md`의 BMAD 기준 표에 항목을 더하는 기존 방식을 유지합니다.
- 위임 기준은 그대로입니다. 가이드는 병렬 서브에이전트 확대를 권하지만, 현재의 보수적 기준은 파일 소유권 충돌과 검증 책임 일원화를 위해 의도적으로 선택된 제약입니다.
- Phase B의 3층 병렬 리뷰(Blind Hunter / Edge Case Hunter / Acceptance Auditor), feedback-rules 메모리 루프, 승격 정책(1회 기록 → 2회 규칙 → 3회 blocking check)은 변경 없이 유지합니다. 가이드의 "별도 컨텍스트 검증자"와 "메모리 시스템" 권고를 이미 구현하고 있습니다.
- 검증 스크립트 자체는 수정하지 않았습니다. Vitest 병렬 실행은 문서를 실제 동작에 맞춘 것이고, 스크립트 동작을 바꾼 것이 아닙니다.

## 검증과 한계

- `./scripts/validate.ps1`을 두 차례 실행해 각각 9/9 통과했습니다. 로그는 `state/validate/epic-20260910_111555/`와 `state/validate/epic-20260910_111852/`입니다.
- 이 저장소는 템플릿 상태라 install·typecheck·lint·test·regression·build 6단계는 실행 대상이 없어 SKIP됐습니다. 실제로 검증된 것은 security·performance·blocking 3단계입니다.
- 추론 재현 지시와 컨텍스트 예산 노출은 하네스 문서와 `.claude/skills/`, `.agents/skills/` 전체를 검색해 0건을 확인했습니다.
- 모델·effort 표의 값은 운영 결정입니다. 대표 작업에서의 품질·시간·비용 비교는 아직 하지 않았습니다. Fable 5.1 / Opus 5 / Sonnet 5 / Haiku 4.5의 실제 배정 효과는 사용 기록이 쌓인 뒤 판단합니다.
- Haiku 4.5가 effort 파라미터를 지원하지 않는다는 점은 API 레퍼런스로 확인했고, 실제 호출로 확인하지는 않았습니다.

## 적용 상태

| 대상 | 상태 |
|---|---|
| `harness-test` (원본) | 로컬 반영 완료. 커밋·푸시는 하지 않음 |
| 다른 프로젝트 | 미배포. Codex 쪽 변경과 함께 배포 시점을 정함 |

이번 변경은 `docs/agents/` 아래 규칙 문서와 루트 문서만 건드리므로, 설치 스크립트의 개별 파일 매니페스트를 수정할 필요가 없습니다. `docs/changelog/`는 설치 배포 대상에서 제외되어 있습니다.
