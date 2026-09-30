# Epic <N> Orca 실행 계획

<!--
코디네이터가 Epic 시작 시 plans/epic-<N>-orca.md로 만든다 (docs/agents/orca-rules.md §3).
BMAD story 파일에 없는 실행 정보만 적는다. 수락 기준·작업 목록·참고 자료는 story 파일에 두고 복사하지 않는다.
바뀐 행만 고치고, 바뀌지 않은 계획을 다시 만들지 않는다.
-->

- Epic 목표: <누구를 위한 어떤 결과물인지>
- 걱정되는 위험: <사용자가 알려 준 위험>
- 통합 브랜치: epic/<N> (기준: develop <커밋 해시>)
- 승인 범위: Story 브랜치 push <허용 | 허용하지 않음>, develop 병합 <요청 시에만>
- 예산: 기본값(orca-rules.md §8) <또는 사용자가 바꾼 값>

## Story별 실행 정보

| Story | 의존 Story와 해제 조건 | 수정 범위 | 수정 금지 | 위험도 | 모델 후보 (우선) · effort | 리뷰 |
|---|---|---|---|---|---|---|
| <1-1-key> | 없음 | <경로> | <경로> | 낮음 | Sonnet 5.5, GPT-6 Sol (Sonnet 5.5) · medium | 일반, GPT-6 Sol |
| <1-2-key> | 1-1 커밋 + quick 통과 | <경로> | <경로> | 높음 (인증) | Opus 5.5, GPT-6 Sol (GPT-6 Sol) · high | 위험, Opus 5.5 |

해제 조건 표기: `커밋 + quick 통과`(위험도가 낮은 연쇄 Story) 또는 `통합 완료`(선행 Story가 리뷰 승인 후 epic/<N>에 병합됨).

## 공유 상태 소유

- sprint-status.yaml, deferred-work.md: 코디네이터
- <DB·외부 서비스·공용 설정>: <소유자>

## 결정 대기

- <제품 의도·필수 설계가 정해지지 않아 보류한 Story와 필요한 결정>
