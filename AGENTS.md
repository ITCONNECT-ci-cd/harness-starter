<!--
AGENTS.md — Codex와 Claude Code 모두가 세션 시작 시 읽는 저장소 공식 운영 규칙입니다.
Codex Desktop은 이 파일을 자동 로드합니다.
Claude Code는 CLAUDE.md에서 이 파일을 @import합니다.
핵심 규칙만 담고, 상세 규칙은 docs/agents/로 분리합니다.
-->

# AGENTS.md

## 작업 범위와 지침 적용

- 작업 시작 시 `docs/agents/agent-execution-rules.md`를 읽고 적용한다. 사용자 요청·승인 범위, 스킬 충돌, 질문·위임·검증 범위의 공통 기준이다.
- 시스템·도구 권한과 데이터 보호 규칙을 준수하면서, 명시적 사용자 요청과 이미 승인된 범위를 스킬의 기본 진행 방식보다 우선한다.
- 아래 Phase A 루틴은 Epic/Story 구현 요청에 적용한다. Git 조회·문서 검토·Harness 유지보수에는 관련 규칙만 적용하며, 없는 제품 기획 문서나 Epic을 생성하도록 요구하지 않는다.

## 역할 분담

| Phase | 도구 | 역할 | BMAD 스킬 |
|---|---|---|---|
| Phase A | Codex Desktop | story 생성 + 구현 (Epic 단위) | bmad-create-story, bmad-dev-story |
| Phase B | Claude Code | 코드 리뷰 + 수정 + 테스트 보강 (Epic 단위) | bmad-code-review |
| Phase C | Claude Code | Epic 회고 + Harness 강화 | incident, regression, feedback-rules |

## Phase A: Codex Desktop 시작 루틴

1. 이 파일(AGENTS.md)의 규칙 확인
2. `_bmad-output/planning-artifacts/architecture.md` 읽기
3. `_bmad-output/implementation-artifacts/sprint-status.yaml` 확인
4. `docs/agents/` 아래 관련 규칙 참고
   - **필수**: `docs/agents/feedback-rules.md` (과거 반복 실수 패턴) 반드시 읽기
5. 대상 Epic의 story를 순서대로 처리:
   - Windows/Codex에서는 먼저 `./scripts/doctor.ps1`와 `./scripts/phase-a/preflight.ps1 -Epic <N>` 실행
   - Windows/Codex에서 raw `node`, `npm`, `npx`, `bun` 실행 실패만으로 중단 금지. 중단 기준은 현재 OS/셸에 맞는 `validate-quick` 실패임
   - `bmad-create-story` 스킬로 story 파일 생성
   - `bmad-dev-story` 스킬로 구현 (TDD: red-green-refactor)
   - 현재 OS/셸에 맞는 검증 진입점 실행
     - bash/WSL/macOS/Linux: `./scripts/validate-quick.sh`
     - Windows PowerShell: `./scripts/validate-quick.ps1`
   - 통과 시 **commit + push 필수**
   - Windows PowerShell/Codex: `./scripts/phase-a/finalize-story.ps1 -StoryName <story-name>`
   - bash/WSL/macOS/Linux: `git add -A && git commit -m "feat(story-name): 설명" && git push`
   - validate-quick 실패 시 수정 후 재검증. 같은 원인으로 수정 후 3회 실패하면 기록 후 skip하고 독립적인 Story만 진행 (`agent-execution-rules.md` 참조, TDD RED 제외)
6. Epic의 모든 story 완료 후 현재 OS/셸에 맞는 전체 검증 실행
   - bash/WSL/macOS/Linux: `./scripts/validate.sh`
   - Windows PowerShell: `./scripts/validate.ps1`
   - 실패 시 현재 OS의 `validate.ps1` 또는 `validate.sh`에 `--from=실패단계`로 재개
   - failed/skipped 또는 의존성으로 보류된 Story가 남으면 Epic 완료로 보고하지 않음
7. Codex 모델·reasoning 기본값은 `.codex/config.toml`에서 관리 (`docs/agents/agent-execution-rules.md`의 적용 범위 참조)

## Phase B: Claude Code 시작 루틴

1. `CLAUDE.md`의 지침 확인 (이 파일은 @import됨)
2. `_bmad-output/implementation-artifacts/sprint-status.yaml` 확인
3. 완료된 story 브랜치를 `bmad-code-review` 스킬로 리뷰
4. REJECTED 항목 직접 수정 + 테스트 보강
5. `./scripts/validate.sh` + `./scripts/smoke.sh` 최종 검증

## Phase C: Epic 회고 시작 루틴

Phase C는 출시 전 배포 준비가 아니라 Epic 회고와 Harness 강화 단계입니다. `docs/agents/workflow-rules.md`의 Phase C 절차에 따라 리뷰/검증 실패 패턴을 incident, regression, feedback-rules 또는 validate blocking check로 반영합니다.

회고를 반영한 뒤 **프로젝트 이해 문서를 코드와 맞춥니다**(Phase C 8단계). 지도가 낡으면 다음 Epic에서 에이전트가 잘못된 가정으로 구현합니다. `docs/PROJECT_MAP.md`가 없으면 project-map 스킬로 생성하고 `CLAUDE.md`·`AGENTS.md`에 배선하며, 있으면 바뀐 장만 갱신합니다.

## Repo map

| 경로 | 역할 |
|---|---|
| `_bmad-output/planning-artifacts/` | PRD, architecture, epics, stories (공식 제품 문서) |
| `_bmad-output/implementation-artifacts/` | sprint-status, story 파일, 구현 산출물 |
| `.agents/skills/` | Codex용 BMAD 스킬 (create-story, dev-story 등) — `.claude/skills/`와 byte 동기 유지 (harness-self-test가 검증) |
| `.claude/skills/` | Claude Code용 BMAD 스킬 (code-review 등) |
| `docs/PROJECT_MAP.md` | 코드에서 도출한 구조 지도(Phase C 8단계 산출물). **장 단위로 Read** — §9 함정(수정 전 필독) · §4 아키텍처 · §5~6 모듈 지도 |
| `docs/*.html` | 사람용 문서. 일상적인 코드 맥락 수집에서는 읽지 않음. 요청된 문서 검토·생성·갱신·검증에 필요한 범위만 읽음 |
| `docs/agents/` | 에이전트 운영 규칙 (architecture, coding, testing, security, performance, deploy, workflow, backup, seo, feedback) |
| `.codex/config.toml` | Codex 프로젝트 모델·reasoning 기본값 |
| `docs/checklists/` | 수동 체크리스트 (페이지 수정 후, 배포 전) |
| `docs/decisions/` | 아키텍처 결정 기록 (ADR) |
| `scripts/` | 검증 (validate, validate-quick, smoke), 빌드, 스모크 테스트 스크립트 |
| `scripts/lib/` | 검증 공용 헬퍼 (validate-utils.sh) |
| `feedback/` | 실수 기록(incidents) + 템플릿 |
| `state/` | 작업 진행 상태 파일 + learning-loop.json + validate 로그 |
| `reviews/` | 코드 리뷰 결과 저장 |
| `src/` or `apps/` | 소스 코드 |
| `tests/` | 테스트 코드 |

## 참조 파일

- `docs/agents/agent-execution-rules.md`
- `docs/agents/architecture-rules.md`
- `docs/agents/coding-rules.md`
- `docs/agents/testing-rules.md`
- `docs/agents/security-rules.md`
- `docs/agents/performance-rules.md`
- `docs/agents/deploy-rules.md`
- `docs/agents/docker-rules.md`
- `docs/agents/migration-rules.md`
- `docs/agents/workflow-rules.md`
- `docs/agents/feedback-rules.md`
- `docs/agents/backup-rules.md`
- `docs/agents/seo-rules.md`

## Docker & DB 작업 의무 규칙

Docker 컨테이너 또는 DB 마이그레이션 작업 시작 전 **반드시**:

1. **환경(개발/운영) 의도를 한국어로 명시적으로 선언** 후 작업. 사용자 지시 표준 문구:
   - `"<프로젝트명> 개발 환경으로 docker 구성해"` → `--env development`
   - `"<프로젝트명> 운영 환경으로 docker 구성해"` → `--env production`
   이후 `./scripts/docker-guard.sh --env <development|production>` 실행
2. 마이그레이션은 `./scripts/db-migrate.sh --cmd "<원본 명령>"` 래퍼로만 실행 (직접 `prisma migrate deploy` 금지)
3. `docker compose down -v` / `--volumes` 절대 금지 (DB 데이터 영구 유실). Claude Code 세션에서는 PreToolUse hook이 자동 차단
4. 같은 접두사의 컨테이너가 이미 있으면 새로 만들지 말고 기존 compose 수정 (`docs/agents/docker-rules.md §3`)
5. compose 파일 최상단에 `name:` + `x-environment:` 라벨 필수 (`x-environment` 값은 `production` 또는 `development`)

## Tooling rules

- CLI로 수행 가능한 작업은 기본적으로 CLI를 우선 사용
- 소스 제어와 PR은 `git`, `gh`, 검증과 반복 작업은 저장소 `scripts/*`, JavaScript/TypeScript 패키지와 테스트 실행은 `npm`, `npx`, `node`, Python 작업은 `python`, `pip`, `uv`, HTTP 확인은 `curl` 또는 `http`, 브라우저/E2E는 `npx playwright`, 컨테이너 작업은 `docker`, `docker compose`, Kubernetes 작업은 `kubectl`, `helm`을 우선 사용
- 동일 작업을 내장 도구와 CLI 둘 다로 수행할 수 있으면 CLI를 선택
- 프로젝트에 공식 래퍼 스크립트나 표준 명령이 있으면 ad-hoc 명령보다 그것을 우선 사용
- Windows/Codex에서 GitHub 원격 상태를 확인할 때는 raw `git fetch`보다 `gh api` 기반 `./scripts/phase-a/preflight.ps1`를 우선 사용
- Windows/Codex에서 실제 push/fetch가 필요할 때는 `scripts/lib/git-utils.ps1` 기반 wrapper를 raw `git fetch/push`보다 우선 사용
- Windows/Codex에서는 raw JS 런타임 sanity check보다 `./scripts/validate-quick.ps1`와 `./scripts/validate.ps1` 결과를 신뢰
- CLI가 설치되어 있지 않거나 인증, 권한, 플랫폼 제약으로 실행할 수 없을 때만 대체 도구를 사용

## Validation (완료 기준)

- Story 완료 시: 현재 OS/셸에 맞는 quick validate 실행 (`validate-quick.sh` 또는 `validate-quick.ps1`)
- Epic 완료 시: 현재 OS/셸에 맞는 전체 validate 실행 (`validate.sh` 또는 `validate.ps1`)
- validate 실패 시: bash/WSL/macOS/Linux는 `./scripts/validate.sh --from=실패단계`, Windows PowerShell은 `./scripts/validate.ps1 --from=실패단계`로 재개
- 실패 시 로그 확인: `state/validate/latest/*.log` (단계별 로그 파일)
- 기본 출력은 summary 모드 (단계별 성공/실패 + 소요시간만 표시)
- 전체 출력이 필요하면: `VALIDATE_OUTPUT_MODE=verbose ./scripts/validate.sh`
- critical path가 있으면 `./scripts/smoke.sh` 추가 실행
- 검증이 실패하면 완료로 간주하지 않음

## Coding rules (핵심만, 상세는 docs/agents/coding-rules.md)

- 아키텍처 경계를 준수 (docs/agents/architecture-rules.md 참고)
- 변경된 동작에 대해 테스트 추가 또는 업데이트
- 새 패턴 도입 시 docs/decisions/에 이유 기록
- 의존성 추가 시 정당한 이유 필요

## Change rules

- 변경 범위를 사용자가 요청한 작업으로 제한. Phase A에서는 현재 Story로 제한
- story와 관련 없는 리팩터링 금지
- 관련 문서를 같은 변경에서 업데이트
- 커밋 메시지 형식: `type(scope): description`
- type: feat, fix, refactor, test, docs, chore
- Phase A에서는 validate-quick 통과 후 **commit + push 필수** (push 없이 다음 story 진행 금지)
