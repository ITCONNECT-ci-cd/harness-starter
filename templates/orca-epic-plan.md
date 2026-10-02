# Epic <N> Orca 실행 계획

<!--
코디네이터가 Epic 시작 시 plans/epic-<N>-orca.md로 만든다 (docs/agents/orca-rules.md §3~4).
BMAD story 파일에 없는 실행 정보만 적는다. 수락 기준·작업 목록·참고 자료는 story 파일에 두고 복사하지 않는다.
모델 배정안은 사용자 승인을 받은 뒤에만 워커를 띄운다(무인 진행이면 적용하고 owner-digest에 남긴다). 바뀐 행만 고치고, 바뀌지 않은 계획을 다시 만들지 않는다.
-->

- Epic 목표: <누구를 위한 어떤 결과물인지>
- 걱정되는 위험: <사용자가 알려 준 위험>
- 통합 브랜치: epic/<N> (기준: develop <커밋 해시>)
- 진행 범위: <전체 Story | 처음 N개 Story만 하고 결과와 조정 제안을 보고한 뒤 멈춤>
- 승인 범위: Story 브랜치와 epic/<N> push <허용 | 허용하지 않음>, develop 병합 <요청 시에만>
- 예산: 기본값(orca-rules.md §8) <또는 사용자가 바꾼 값>
- 코디네이터: <Sonnet 5.5 / high | Opus 5.5 / medium> (등록 ID: <확인한 ID>)
- 진행 방식: <승인 대기 | 무인 — 결정은 reviews/epic-<N>/owner-digest.md> (orca-rules.md §4)
- 코디네이터 인계: Story <3>개마다, 체인 상한 <ceil(Story 수 / 주기) + 2>, Orca Run <run id> (orca-rules.md §11)
- 사용량 가드: <꺼짐 | 켜짐 — ~/.orchestrator/limits.json> (orca-rules.md §8.1)

## 모델 배정안

선택 방법은 `docs/agents/model-routing-rules.md`를 따른다. effort는 위험도(낮음 medium, 보통 high, 높음 xhigh)에 모델·역할별 하한을 적용한다: Sonnet 5.5·GPT-6.1 Sol·모든 리뷰는 최소 high, 설계 판단 Opus 5.5는 최소 high.

| Story | 위험도 | 형태 | 구현 모델 / effort | 리뷰 모델 / effort | 대체 모델 | 이유 |
|---|---|---|---|---|---|---|
| <1-1-key> | 보통 | 정형 | Gemini 3.8 Flash / high | Sonnet 5.5 / high | Sonnet 5.5 / high | <한 줄> |
| <1-2-key> | 높음 | 일반 | Opus 5.5 / xhigh | GPT-6.1 Sol / xhigh | GPT-6.1 Sol / xhigh | <한 줄> |
| Epic 통합 리뷰 | — | — | — | Opus 5.5 / xhigh | — | 위험 높음 Story가 있을 때만 |

승인: <YYYY-MM-DD, 사용자 OK. 사용자가 고친 내용이 있으면 적기 | YYYY-MM-DD 무인 적용 — 사람 확인 대기(owner-digest)>

## 실행 정보

| Story | 의존 Story와 해제 조건 | 수정 범위 | 수정 금지 |
|---|---|---|---|
| <1-1-key> | 없음 | <경로> | <경로> |
| <1-2-key> | 1-1 통합 완료 | <경로> | <경로> |

해제 조건 표기: `커밋 + quick 통과`(위험도가 낮은 연쇄 Story) 또는 `통합 완료`(선행 Story가 리뷰 승인 후 epic/<N>에 병합됨).

## 승인 후 변경

| 시각 | Story | 변경 | 이유 | 구분 |
|---|---|---|---|---|
| <시각> | <story-key> | GPT-6.1 Sol / high → Sonnet 5.5 / high | <한도 오류 등> | 사전 승인(대체 모델) |

구분: `사전 승인`(대체 모델 전환, 리뷰 상향)은 기록만 하고 진행한다. 그 밖의 변경은 `재승인`을 받은 뒤 적는다. 무인 진행에서는 `무인`(Story 분할 — 부모 행 상속)도 기록하고 진행하며, 같은 내용을 owner-digest에 올린다.

## 공유 상태 소유

- sprint-status.yaml, deferred-work.md: 코디네이터
- <DB·외부 서비스·공용 설정>: <소유자>

## 결정 대기

- <제품 의도·필수 설계가 정해지지 않아 보류한 Story와 필요한 결정>
