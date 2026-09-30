# Epic <N> Orca 실행 계획

<!--
코디네이터가 Epic 시작 시 plans/epic-<N>-orca.md로 만든다 (docs/agents/orca-rules.md §3~4).
BMAD story 파일에 없는 실행 정보만 적는다. 수락 기준·작업 목록·참고 자료는 story 파일에 두고 복사하지 않는다.
모델 배정안은 사용자 승인을 받은 뒤에만 워커를 띄운다. 바뀐 행만 고치고, 바뀌지 않은 계획을 다시 만들지 않는다.
-->

- Epic 목표: <누구를 위한 어떤 결과물인지>
- 걱정되는 위험: <사용자가 알려 준 위험>
- 통합 브랜치: epic/<N> (기준: develop <커밋 해시>)
- 승인 범위: Story 브랜치와 epic/<N> push <허용 | 허용하지 않음>, develop 병합 <요청 시에만>
- 예산: 기본값(orca-rules.md §8) <또는 사용자가 바꾼 값>
- 코디네이터: <Sonnet 5.5 / medium | Opus 5.5 / medium>

## 모델 배정안

선택 방법은 `docs/agents/model-routing-rules.md`를 따른다.

| Story | 위험도 | 형태 | 구현 모델 / effort | 리뷰 모델 / effort | 대체 모델 | 이유 |
|---|---|---|---|---|---|---|
| <1-1-key> | 보통 | 정형 | Gemini 3.8 Flash / medium | Sonnet 5.5 / medium | Sonnet 5.5 / medium | <한 줄> |
| <1-2-key> | 높음 | 일반 | Opus 5.5 / high | GPT-6 Sol / high | GPT-6 Sol / high | <한 줄> |
| Epic 통합 리뷰 | — | — | — | Opus 5.5 / high | — | 위험 높음 Story가 있을 때만 |

승인: <YYYY-MM-DD, 사용자 OK. 사용자가 고친 내용이 있으면 적기>

## 실행 정보

| Story | 의존 Story와 해제 조건 | 수정 범위 | 수정 금지 |
|---|---|---|---|
| <1-1-key> | 없음 | <경로> | <경로> |
| <1-2-key> | 1-1 통합 완료 | <경로> | <경로> |

해제 조건 표기: `커밋 + quick 통과`(위험도가 낮은 연쇄 Story) 또는 `통합 완료`(선행 Story가 리뷰 승인 후 epic/<N>에 병합됨).

## 승인 후 변경

| 시각 | Story | 변경 | 이유 | 구분 |
|---|---|---|---|---|
| <시각> | <story-key> | GPT-6 Sol / medium → Sonnet 5.5 / medium | <한도 오류 등> | 사전 승인(대체 모델) |

구분: `사전 승인`(대체 모델 전환, 리뷰 상향)은 기록만 하고 진행한다. 그 밖의 변경은 `재승인`을 받은 뒤 적는다.

## 공유 상태 소유

- sprint-status.yaml, deferred-work.md: 코디네이터
- <DB·외부 서비스·공용 설정>: <소유자>

## 결정 대기

- <제품 의도·필수 설계가 정해지지 않아 보류한 Story와 필요한 결정>
