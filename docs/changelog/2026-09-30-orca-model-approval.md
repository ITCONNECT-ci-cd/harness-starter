---
title: "Orca 모델 배정을 사용자 승인 방식으로 변경"
date: 2026-09-30
tags: [harness, orca, model-routing]
---

# 26.09.30 Orca 모델 배정 승인 방식

> [전체 변경 이력](README.md) · [같은 날 선행 기록: Orca 오케스트레이션 적용](2026-09-30-orca-orchestration.md) · [후속 기록: GPT-6.1 Sol 교체](2026-09-30-gpt-6-1-sol.md) · [모델 배정 규칙](../agents/model-routing-rules.md)

같은 날 적용한 Orca 흐름에서 모델 고르는 방식을 바꿨습니다. 코디네이터가 사용량·한도를 추적해 모델을 고르던 방식을 없애고, 시작할 때 Story별 모델 배정안을 보여 주고 사용자가 OK한 뒤에 워커를 띄웁니다.

## 회의에서 설명할 핵심

**모델은 사람이 승인합니다.** 코디네이터가 Story마다 위험도(높음·보통·낮음)와 작업 형태(정형·일반·연계·설계 판단)를 판정하고, 표에서 구현 모델·리뷰 모델·대체 모델과 effort를 골라 보여 줍니다. 사용자가 OK하거나 고친 배정안만 씁니다.

**한도 계산은 하지 않습니다.** Orca가 사용량을 명령어로 제공하지 않아 계산이 어렵고, 사람이 배정안을 승인하는 편이 단순합니다. 한도 오류가 나면 미리 승인된 대체 모델로 넘깁니다.

**승인 뒤 바꿀 수 있는 것은 두 가지뿐입니다.** 대체 모델로의 전환과, 위험도가 계획보다 높게 드러났을 때 리뷰를 강화하는 것만 기록하고 진행합니다. 그 밖의 변경(다른 모델, effort 상향, 리뷰 생략, Story 추가)은 다시 묻습니다.

**코디네이터 기본 모델을 정했습니다.** 기본은 Sonnet 5.5 / medium, 위험 높음 Story가 절반 이상인 Epic은 Opus 5.5 / medium입니다. 코디네이터의 일은 대부분 조정·확인이고 어려운 판단(배정)은 사람이 승인하므로 최상위 모델이 꼭 필요하지 않습니다. Claude Code에서 돌면 위험 명령 차단 hook이 merge·push를 하는 코디네이터에도 걸립니다.

## 변경 전후

| 구분 | 변경 전 (선행 기록) | 변경 후 |
|---|---|---|
| 모델 선택 | 역할표 + 사용자가 알려 준 남은 사용량이 많은 풀 | 위험도 × 작업 형태 표로 코디네이터가 제안, 사용자가 승인 |
| 한도 대응 | 남은 사용량 추정, 모르면 unknown | 계산하지 않음. 한도 오류 시 승인된 대체 모델 |
| 리뷰 모델 | 작성자와 다른 회사 모델 (역할표) | 작성 모델별 리뷰 표, Flash는 리뷰하지 않음 |
| 승인 뒤 변경 | 규정 없음 | 대체 모델 전환·리뷰 상향만 기록 후 진행, 나머지는 재승인 |
| 코디네이터 | Sonnet 5.5 또는 GPT-6 Sol (남은 사용량 기준) | Sonnet 5.5 / medium, 위험 위주 Epic은 Opus 5.5 / medium |
| 사용량 기록 | 워커 보고·orca-runs에 사용량(모르면 unknown) | 기록하지 않음. 모델·재작업·시간만 기록 |
| README 프롬프트 | 남은 사용량·추가 결제 입력 | 계정만 입력, 배정안 표를 보여 주고 OK를 기다리라는 지시 |

## 수정 파일

| 파일 | 변경 |
|---|---|
| `docs/agents/model-routing-rules.md` | 선택 방법(위험도, 작업 형태, 구현·리뷰·대체 모델 표, 승인 형식), effort 원칙, 코디네이터 선택과 이유로 재작성 |
| `docs/agents/orca-rules.md` | §4를 "모델 배정과 승인"으로 교체, 역할 표·코디네이터 모델·재시도·완료 판정·기록에서 사용량 기준 제거 |
| `AGENTS.md`, `CLAUDE.md` | 코디네이터 모델, 배정안 승인 단계, 워커 보고에서 사용량 제거 |
| `docs/agents/workflow-rules.md`, `docs/agents/agent-execution-rules.md` | 배정안 승인 단계, 재배정은 승인된 대체 모델로 |
| `templates/orca-epic-plan.md` | 모델 배정안 표, 승인 줄, 승인 후 변경 기록 표 |
| `templates/orca-worker-contract.md` | 승인된 모델·위험도 기준, 사용량 보고 제거 |
| `README.md` | 시작·이어서 하기 프롬프트에서 사용량·추가 결제 입력 제거, 배정안 승인 지시 추가 |
| `docs/harness/orca.md` | "모델은 어떻게 고르나", "코디네이터는 어떤 모델로 여나" 절 추가 |
| `docs/decisions/ADR-002-orca-orchestration.md` | 결정 2·4와 결과에 승인 방식과 코디네이터 기본값 반영 |
| `reviews/README.md` | orca-runs.md 기록 항목 |

## 실행한 검증

- template mode `validate.sh`·`validate-quick.sh` 통과, 두 스킬 트리 동기화 통과, `git diff --check` 통과. 이번 변경은 문서·템플릿만 바꿔 스크립트 문법 검사 대상은 없음
- 바뀐 문서의 상대 링크 존재 확인
- 규칙 문서와 템플릿에 남은 사용량·한도 추정 문구, 이전 코디네이터 기준("Sonnet 5.5 또는 GPT-6 Sol")이 역사 기록 밖에 남지 않았는지 확인
- 선택 표 교차 확인: 구현 표의 모든 모델·effort 조합에 대체 모델 행이 있고, 모든 리뷰 모델이 작성자와 다른 회사이며, 위험 높음 Story의 대체 모델이 Flash나 Sonnet이 되지 않음

## 남은 확인 항목

- 선택 표와 코디네이터 기본값은 초기값입니다. Story 2~3개 파일럿 뒤 `orca-runs.md`의 REJECTED·재작업·시간으로 조정합니다.
- 실제 Orca 실행과 모델 ID 확인은 선행 기록의 남은 항목과 같습니다.

## 추가 수정 (같은 날)

**effort를 위험도로 정합니다.** 낮음은 medium, 보통은 high, 높음은 xhigh입니다. 구현·리뷰·대체 모델에 모두 적용하고, Epic 통합 리뷰는 Opus 5.5 / xhigh입니다. 모델은 계속 작업 형태 × 위험도 표로 고릅니다. 위험도 기준에서 effort를 올리거나 내리려면 다시 승인받습니다. max와 경쟁 풀이는 실패 근거가 있을 때 승인을 받아서만 씁니다.

**README에 코디네이터(오케스트레이터) 모델 설명을 넣었습니다.** 기본 Sonnet 5.5 / medium, 위험 위주 Epic은 Opus 5.5 / medium, GPT-6 Sol과 Gemini 3.8 Flash를 쓰지 않는 이유, effort를 medium으로 직접 지정해야 하는 이유를 적었습니다.

**시험 운영과 배정 조정을 코디네이터가 맡습니다.** 시작 프롬프트에 진행 범위(전체 또는 처음 N개 Story)를 적으면 그만큼 진행하고 멈춥니다. 멈출 때와 Epic을 끝낼 때 `orca-runs.md`를 표의 칸별로 요약하고 조정 제안을 붙입니다. 같은 칸에서 반려나 대체 모델 전환이 절반 이상이면 한 단계 무거운 모델을, 3개 이상 Story가 모두 첫 리뷰에 통과하고 시간 예산의 절반 안에 끝나면 한 단계 가벼운 모델을 제안합니다. 사람은 제안을 승인만 합니다. 승인한 제안은 남은 Story의 배정안에 반영하고, 규칙 표는 Phase C에서 고칩니다.

| 파일 | 변경 |
|---|---|
| `docs/agents/model-routing-rules.md` | 위험도별 effort, 리뷰·대체 모델 표 단순화, 예시, effort 원칙, 「기록과 조정 제안」 절 |
| `docs/agents/orca-rules.md`, `AGENTS.md`, `docs/agents/workflow-rules.md` | 진행 범위(시험 운영), Epic 통합 리뷰 xhigh, 완료 보고의 조정 제안, 재승인 대상 |
| `templates/orca-epic-plan.md` | 진행 범위 항목, 예시 effort |
| `README.md` | 「코디네이터(오케스트레이터) 모델」 절, 진행 범위 줄, 조정 제안 보고 요청, 이어서 하기의 제안 승인 줄, Phase C 프롬프트 |
| `docs/harness/orca.md`, `README-brownfield.md`, `docs/decisions/ADR-002-orca-orchestration.md` | effort 규칙, 코디네이터 설명 위치, 시험 운영 안내 |

검증: template mode `validate.sh`·`validate-quick.sh` 통과, 스킬 트리 동기화, `git diff --check`, 바뀐 문서 11개 상대 링크 통과. 선택 표를 파싱해 교차 확인했다(모든 칸에 다른 회사 리뷰 모델과 대체 모델이 있고, 대체 뒤에도 유효한 리뷰 모델이 있으며, 위험 높음의 대체 모델은 GPT-6 Sol·Opus 5.5뿐). 문서·템플릿만 변경해 스크립트 문법 검사 대상은 없음.
