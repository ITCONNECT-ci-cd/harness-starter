# CLAUDE.md

## 기본 동작

- 저장소 규칙은 항상 `AGENTS.md`를 우선 참고
- 도구 사용 원칙은 `AGENTS.md`를 따른다. CLI로 가능한 작업은 CLI를 우선 사용
- 상세 규칙은 `docs/agents/` 아래 문서 참조 (아래 "상황별 규칙" 표 — 필요할 때 Read)
- BMAD 산출물은 `_bmad-output/` 아래에서 참조
- 제품 Story 작업 중 BMAD 스킬을 임의 수정하지 않음. 사용자가 요청한 Harness/스킬 유지보수에서는 필요한 부분만 수정하고 `.claude/skills/`와 `.agents/skills/`의 byte 동기화를 검증한다.
- 스킬 실행 전 `docs/agents/agent-execution-rules.md`를 적용한다. 승인된 작업을 다시 묻는 기본 메뉴와 전체 테스트 요구는 해당 문서의 Harness 기준을 따른다.
- Orca 워커로 실행되면 `AGENTS.md`의 「Orca 워커 규칙」과 코디네이터가 보낸 계약을 아래 역할 설명보다 우선한다.
- 모델과 effort는 `docs/agents/model-routing-rules.md`를 따른다. Claude Code 기본 effort는 xhigh이므로 세션을 열 때 effort를 명시한다.
- **프로젝트 이해 문서(`docs/PROJECT_MAP.md` 등)는 project-map 스킬로만 만든다.**
  `bmad-document-project`·`bmad-generate-project-context`는 호출하지 않는다 — 트리거가 겹치지만
  산출물 체계가 달라, 둘 다 돌면 문서가 이원화된다. 생성·갱신 시점은 Phase C 8단계를 따른다.

## 역할 1: BMAD 기획/설계

BMAD agent를 실행할 때의 규칙:

- 모델은 Opus 5.5 / medium, 어려운 결정은 high
- 각 워크플로우는 새 세션에서 실행
- 산출물은 `_bmad-output/planning-artifacts/`에 저장
- 기획 단계에서 구현 코드를 작성하지 않음
- bmad-help으로 다음 단계 안내 받기

## 역할 2: Orca 개발 (Phase A 구현 · Phase B 리뷰·통합)

Epic·Story 개발은 Orca 코디네이터가 Story마다 워커에게 맡긴다. Claude Code는 코디네이터(Sonnet 5.5 / high, 위험 높음 Story가 많은 Epic은 Opus 5.5 / medium — effort 하한은 `docs/agents/model-routing-rules.md` 「effort 원칙」)나 워커(Sonnet 5.5·Opus 5.5)로 실행된다.

- 코디네이터: `docs/agents/orca-rules.md`를 따른다. 워커를 띄우기 전에 Story별 모델 배정안을 사용자에게 승인받고, 조정·통합·최종 판정을 맡는다. 작은 수정 외의 구현은 워커에게 맡긴다.
- 구현 워커: `AGENTS.md`의 「Orca 워커 규칙」과 계약을 따른다. `bmad-build-auto`로 구현한다(ADR-004). 편집하면 Hooks가 lint를 자동 실행하고, 커밋 전에 현재 OS/셸에 맞는 validate-quick으로 확인한다.
- 리뷰 워커: `bmad-code-review`로 4층 병렬 리뷰(spec이 있을 때 acceptance-auditor 포함)를 실행하고 `REVIEW.md`의 기준과 `docs/agents/architecture-rules.md`의 경계 규칙을 확인한다. 변경된 파일은 직접 Read/Grep으로 확인한다 (텍스트 diff만 보지 않음). 코드는 고치지 않고 결과를 보고한다.
- Epic 통합 검증(validate + smoke), `develop` 병합, `sprint-status.yaml` 갱신은 코디네이터가 한다 (회사 표준: develop → CI → main → 자동 배포). `develop` 병합은 사용자가 승인한 경우에만 한다.
- 이 통합/배포 흐름은 Phase C가 아님. Phase C는 아래 회고 단계임

## 역할 3: Epic 회고 + Harness 강화 (Phase C)

Epic 통합이 끝난 뒤 반복 실수와 검증 실패를 학습할 때의 규칙:

- `reviews/epic-N/`의 리뷰 결과, 수집한 validate 로그, Orca 실행 기록(`orca-runs.md`) 분석
- `state/epic-N-progress.json`의 failed/skipped story 확인
- 반복된 REJECTED 패턴과 validate 실패 패턴을 incident로 기록
- 다음 Epic에서 자동으로 잡을 패턴은 regression test 또는 `docs/agents/feedback-rules.md`에 반영
- 기계적으로 판별 가능한 치명 패턴만 validate blocking check로 승격
- 모델별 성공·재작업 기록으로 `docs/agents/model-routing-rules.md`의 배정을 조정할 근거가 있는지 확인
- Phase C를 출시 전 최종 검증이나 배포 준비로 해석하지 않음

## 역할 4: 가벼운 작업 (Quick Flow)

BMAD 풀코스 없이 간단한 작업을 할 때:

- `bmad-build` 스킬 사용 (clarify → plan → implement → review → present). 사람이 곁에서 승인하는 대화형 흐름이라 Orca 워커에는 쓰지 않는다(워커는 `bmad-build-auto`). 6.11 이전 번들에서는 `bmad-quick-dev`가 같은 역할이다.
- 구버전 BMAD 번들에서는 `bmad-agent-quick-flow-solo-dev`(Barry)도 있음 —
  설치된 BMAD 버전의 스킬 목록을 먼저 확인하고 존재하는 스킬만 호출

## Build, Test & Quality

- Dev server: `npm run dev`
- Build: `npm run build`
- Test: `npm run test`
- Lint: `npm run lint`
- Type check: `npm run typecheck`
- 검증 진입점, `--from` 재개, 로그 경로, 출력 모드, `harness.validate.json` 계약은 `AGENTS.md`의 Validation과 `docs/agents/testing-rules.md`의 실행 명령을 따른다 (둘 다 매 세션 @import됨)

## 참조 파일 (매 세션 로드)

핵심 계약과 활성 교훈만 @import한다 — 나머지를 전부 @import하면 매 세션
수만 토큰이 고정 소모되므로, 상황별 규칙은 아래 표에 따라 필요할 때 Read로 로드한다.

@AGENTS.md
@REVIEW.md
@docs/agents/architecture-rules.md
@docs/agents/coding-rules.md
@docs/agents/testing-rules.md
@docs/agents/feedback-rules.md

## 상황별 규칙 (해당 작업 시작 시 Read)

| 작업 | 문서 |
|---|---|
| Orca 코디네이터로 개발 진행, 워커 계약 작성 | `docs/agents/orca-rules.md` |
| Phase A·B(Orca)·C 절차 상세, 브랜치·커밋·검증 계약 | `docs/agents/workflow-rules.md` |
| 모델·effort 배정 | `docs/agents/model-routing-rules.md` |
| 프로젝트 이해 문서 생성·갱신, project-map 준비 | `docs/agents/project-map-rules.md` |
| 보안 구현·리뷰 심화 | `docs/agents/security-rules.md` |
| 성능 최적화·리뷰 심화 | `docs/agents/performance-rules.md` |
| 배포 작업 | `docs/agents/deploy-rules.md` |
| Docker 컨테이너 작업 | `docs/agents/docker-rules.md` |
| DB 마이그레이션 | `docs/agents/migration-rules.md` |
| 백업 시스템 구성 | `docs/agents/backup-rules.md` |
| SEO 작업 | `docs/agents/seo-rules.md` |
