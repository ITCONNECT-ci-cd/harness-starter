# Orca 워커 계약: <story-key> <구현 | 리뷰>

<!--
코디네이터가 채워서 task-create 또는 worker-start의 --spec으로 보낸다 (docs/agents/orca-rules.md).
전체 대화·저장소·코디네이터 규칙을 복사하지 않는다. 아래 항목과 자료 위치만 넘긴다.
워커는 관련 코드·호출부·테스트를 직접 읽는다. 토큰을 줄이려고 보안·계약·필수 맥락을 빼지 않는다.
-->

[작업]
- work_id: <story-key> / 역할: <구현 | 리뷰>
- 목표: <이 Story가 끝나면 무엇이 가능해지는지 한 줄>
- 원본 요구: <epics.md의 Story 항목 또는 story 파일 경로, 요구 ID>
- 기준 커밋: <epic/<N>의 커밋 해시>
- 리뷰 대상 커밋: <리뷰 워커만. 구현 워커의 커밋 해시>

[범위]
- 읽을 자료: <architecture.md의 관련 절, 직접 의존 Story 파일, 관련 코드·테스트 경로>
- 수정 가능: <파일·디렉터리. 리뷰 워커는 없음>
- 수정 금지: <범위 밖 모듈>, sprint-status.yaml, deferred-work.md, 공용 설정
- 공유 상태: <DB·외부 서비스·환경변수 사용 여부와 소유자>

[계약]
- 선행 Story 증거: <커밋 해시, 검증 결과>
- 지켜야 할 API·타입·권한·데이터 불변 조건: <목록>

[인수]
- 수락 기준: story 파일의 Acceptance Criteria (여기에 복사하지 않는다)
- 특히 확인할 정상·예외·회귀 동작: <목록>
- 검증: `VALIDATE_BASE_REF=<기준 커밋> ./scripts/validate-quick.sh`
  (Windows: `$env:VALIDATE_BASE_REF='<기준 커밋>'; ./scripts/validate-quick.ps1`)
- 리뷰 요구: <일반 | 위험 영역> / 리뷰 모델: <작성자와 다른 회사 모델>

[실행]
- 모델·effort: <실제 모델 ID> / <effort>
- 방식: <구현: bmad-create-story 후 bmad-dev-story | 리뷰: 리뷰 대상 커밋을 detached로 받아 bmad-code-review (기준 커밋 대비 branch diff, spec은 story 파일)>
- 예산: 시간 <분>, 같은 원인 수정 3회, BMAD 내부 리뷰어 <3 | 해당 없음>

[차단]
- 계약에 없는 제품 결정이나 권한이 필요하면 Orca ask로 원인, 필요한 결정, 선택지를 보낸다.

[결과]
- worker_done은 정확히 한 번. 끝냈으면 --outcome succeeded, 미완료면 --outcome failed
- 보고: 커밋 해시, 검증 결과와 로그 경로(state/validate/latest/), 남은 위험, 사용량(모르면 unknown)
- 리뷰 워커: REVIEW.md 형식의 판정과 findings(decision-needed / patch / defer)를 보고 파일로 넘긴다
