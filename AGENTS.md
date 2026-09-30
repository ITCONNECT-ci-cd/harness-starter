# AGENTS.md

## 작업 범위와 지침 적용

- 작업 시작 시 `docs/agents/agent-execution-rules.md`를 읽고 적용한다. 사용자 요청·승인 범위, 스킬 충돌, 질문·위임·검증 범위의 공통 기준이다.
- 시스템·도구 권한과 데이터 보호 규칙을 준수하면서, 명시적 사용자 요청과 이미 승인된 범위를 스킬의 기본 진행 방식보다 우선한다.
- 아래 Orca 개발 루틴은 Epic/Story 개발 요청에 적용한다. Git 조회·문서 검토·Harness 유지보수에는 관련 규칙만 적용하며, 없는 제품 기획 문서나 Epic을 생성하도록 요구하지 않는다.
- Orca 워커로 실행되면 「Orca 워커 규칙」과 코디네이터가 보낸 계약을 이 파일의 다른 루틴보다 우선한다.

## 역할 분담

| 단계 | 실행 | 역할 | BMAD 스킬 |
|---|---|---|---|
| 기획 | Claude Code (Opus 5.5) | PRD, architecture, epics, sprint-status 생성 | bmad-create-prd, bmad-create-architecture, bmad-create-epics-and-stories, bmad-sprint-planning |
| Phase A: 구현 | Orca 구현 워커 | Story 생성 + TDD 구현 + validate-quick + 로컬 커밋 | bmad-create-story, bmad-dev-story |
| Phase B: 리뷰·통합 | Orca 리뷰 워커 + 코디네이터 | 다른 회사 모델의 독립 리뷰, 수정, `epic/<N>` 통합, Epic 검증 | bmad-code-review |
| Phase C: 회고 | Claude Code | Epic 회고 + Harness 강화 | incident, regression, feedback-rules |

Phase A와 B는 한 Orca 실행 안에서 Story마다 이어서 돈다. 사용하는 모델은 Gemini 3.8 Flash, Sonnet 5.5, GPT-6.1 Sol, Opus 5.5 네 개이며 배정 기준은 `docs/agents/model-routing-rules.md`에 있다.

## Orca 개발: 코디네이터 시작 루틴

코디네이터 세션은 Sonnet 5.5 / medium으로 연다(위험 높음 Story가 절반 이상인 Epic은 Opus 5.5 / medium). 상세 절차는 `docs/agents/orca-rules.md`를 따른다.

1. 이 파일과 `docs/agents/orca-rules.md`를 읽는다.
   - **필수**: `docs/agents/feedback-rules.md` (과거 반복 실수 패턴) 반드시 읽기
2. 시작 확인: `state/orca/env.json`이 있으면 재사용하고, 없거나 도구 버전이 바뀌었으면 다시 확인한다 (orca-rules §2).
   - Windows PowerShell: `./scripts/doctor.ps1`와 `./scripts/phase-a/preflight.ps1 -Epic <N>`도 실행
3. `_bmad-output/planning-artifacts/architecture.md`, 대상 Epic의 Story 목록, `_bmad-output/implementation-artifacts/sprint-status.yaml`을 확인한다.
4. `develop`에서 `epic/<N>` 브랜치를 만들고(이미 있으면 사용) `plans/epic-<N>-orca.md`를 작성한다.
5. Story별 모델 배정안(구현·리뷰 모델과 effort, 대체 모델, 이유)을 `docs/agents/model-routing-rules.md`의 선택 방법으로 만들어 사용자에게 표로 보여 주고 OK를 받는다. 승인본을 계획 파일에 기록·커밋한 뒤에만 워커를 띄운다.
6. Story마다 구현 워커, 리뷰 워커, (필요하면) 수정, 통합 순서로 진행한다. 코디네이터는 조정과 통합을 맡고, 작은 수정 외의 구현은 워커에게 맡긴다. 시작 프롬프트의 진행 범위가 일부 Story면 거기까지 하고 보고한 뒤 멈춘다(시험 운영).
7. 모든 Story가 통합되면 `epic/<N>`에서 현재 OS/셸에 맞는 전체 검증을 실행한다.
   - bash/WSL/macOS/Linux: `./scripts/validate.sh` + `./scripts/smoke.sh`
   - Windows PowerShell: `./scripts/validate.ps1` + `./scripts/smoke.ps1`
   - 실패 시 수정 워커를 배정하고 현재 OS의 `validate.ps1` 또는 `validate.sh`에 `--from=실패단계`로 재개
   - failed/skipped 또는 의존성으로 보류된 Story가 남으면 Epic 완료로 보고하지 않음
8. `develop` 병합과 push는 사용자가 승인한 범위에서만 한다.
9. 완료 보고(시험 운영이면 멈출 때의 보고)에는 `orca-runs.md`의 모델 배정 요약과 조정 제안을 붙인다 (`docs/agents/model-routing-rules.md`의 「기록과 조정 제안」).

## Orca 워커 규칙

Orca 코디네이터가 띄운 워커로 실행될 때 적용한다. 코디네이터가 보낸 계약이 이 규칙보다 구체적이면 계약을 따른다.

공통:
- 계약의 work_id 하나만 처리한다. 다음 Story를 시작하거나 다른 워커·에이전트를 띄우지 않는다. 예외는 선택한 BMAD 워크플로가 요구하는 내부 리뷰 서브에이전트뿐이다.
- 비대화형 실행이다. BMAD 스킬의 확인 메뉴와 체크포인트는 승인된 것으로 보고 진행한다. 계약에 없는 제품 결정이나 권한이 필요할 때만 Orca `ask`로 원인·필요한 결정·선택지를 보낸다.
- 권한·sandbox·hook에 막힌 동작을 다른 명령이나 경로로 우회하지 않는다. 하네스 문서가 정한 대체 경로(`docs/agents/feedback-rules.md`의 Windows/Codex 규칙)가 없으면 그 동작을 멈추고 Orca `ask`로 원인과 필요한 권한을 보낸다.
- BMAD 스킬을 스킬로 호출할 수 없는 에이전트는 `.agents/skills/<스킬>/SKILL.md`와 `workflow.md`를 직접 읽고 따른다. 이 경우 보고에 "스킬 문서를 읽고 수행"이라고 적는다.
- `sprint-status.yaml`, `deferred-work.md` 같은 공유 상태 파일은 BMAD 단계가 요구해도 고치지 않는다. 바뀌어야 할 상태는 보고에 적는다.
- push·merge·배포를 하지 않는다. 의존성을 추가하거나 설치 명령을 바꾸지 않는다. 워크트리의 의존성 설치는 `orca.yaml`이 맡는다.
- 긴 로그와 코드는 파일에 두고 경로를 보고한다.
- `worker_done`은 계약의 Task·Dispatch로 정확히 한 번 보낸다. 끝냈으면 `--outcome succeeded`, 끝내지 못했으면 `--outcome failed`. 보고에는 커밋, 검증 결과와 로그 경로, 남은 위험을 적는다.

구현 워커:
- 계약의 story 키로 `bmad-create-story`를 실행하고(story 파일이 이미 있으면 건너뜀), 만든 story 파일 경로를 `bmad-dev-story`에 직접 넘긴다.
- 계약의 기준 커밋을 `VALIDATE_BASE_REF`로 지정해 validate-quick을 통과시킨 뒤 자기 브랜치에 Conventional Commits 형식으로 커밋한다.
  - bash/WSL/macOS/Linux: `VALIDATE_BASE_REF=<기준 커밋> ./scripts/validate-quick.sh` 통과 후 `git add` + `git commit`
  - Windows PowerShell/Codex: `$env:VALIDATE_BASE_REF='<기준 커밋>'; ./scripts/phase-a/finalize-story.ps1 -StoryName <story-key> -NoPush` (현재 브랜치에 커밋하고 push하지 않음)
- 같은 원인으로 수정 후 3번 실패하면(TDD RED 제외) 멈추고 failed로 보고한다.
- REJECTED 수정은 같은 워크트리에서 후속 Dispatch로 받는다. 고친 지적 항목은 story 파일의 Review Findings에 기록·체크해 함께 커밋한다.

리뷰 워커:
- 계약의 리뷰 대상 커밋을 `git checkout --detach <커밋>`으로 받아 읽기 전용으로 `bmad-code-review`를 실행한다. 비교 기준은 계약의 기준 커밋, spec은 story 파일이다.
- 코드, story 파일, 상태 파일을 고치지 않는다. BMAD 4단계가 파일에 기록하거나 수정 방식을 묻는 부분은 "고치지 않고 보고"로 처리하고, 같은 내용을 보고 파일로 넘긴다. decision-needed 항목은 선택지와 함께 보고한다.
- 판정은 `REVIEW.md` 형식(APPROVED 또는 REJECTED와 항목)을 따른다.

## Phase C: Epic 회고 시작 루틴

Phase C는 출시 전 배포 준비가 아니라 Epic 회고와 Harness 강화 단계입니다. `docs/agents/workflow-rules.md`의 Phase C 절차에 따라 리뷰/검증 실패 패턴과 Orca 실행 기록(`reviews/epic-N/orca-runs.md`)을 incident, regression, feedback-rules, validate blocking check 또는 모델 배정 조정으로 반영합니다.

회고를 반영한 뒤 **프로젝트 이해 문서를 코드와 맞춥니다**(Phase C 8단계). 지도가 낡으면 다음 Epic에서 에이전트가 잘못된 가정으로 구현합니다. `docs/PROJECT_MAP.md`가 없으면 project-map 스킬로 생성하고 `CLAUDE.md`·`AGENTS.md`에 배선하며, 있으면 바뀐 장만 갱신합니다.

## Repo map

| 경로 | 역할 |
|---|---|
| `_bmad-output/planning-artifacts/` | PRD, architecture, epics, stories (공식 제품 문서) |
| `_bmad-output/implementation-artifacts/` | sprint-status, story 파일, 구현 산출물 |
| `.agents/skills/` | Codex용 BMAD 스킬 (create-story, dev-story 등) — `.claude/skills/`와 byte 동기 유지 (harness-self-test가 검증) |
| `.claude/skills/` | Claude Code용 BMAD 스킬 (code-review 등) |
| `.codex/config.toml` | Codex를 직접 열 때의 모델 기본값 (GPT-6.1 Sol / medium) |
| `GEMINI.md` | Gemini 워커가 이 파일을 읽도록 연결 |
| `orca.yaml` | Orca 워크트리 준비 명령. 없으면 코디네이터가 `templates/orca.yaml`로 생성 |
| `docs/PROJECT_MAP.md` | 코드에서 도출한 구조 지도(Phase C 8단계 산출물). **장 단위로 Read** — §9 함정(수정 전 필독) · §4 아키텍처 · §5~6 모듈 지도 |
| `docs/*.html` | 사람용 문서. 일상적인 코드 맥락 수집에서는 읽지 않음. 요청된 문서 검토·생성·갱신·검증에 필요한 범위만 읽음 |
| `docs/agents/` | 에이전트 운영 규칙 (orca, model-routing, architecture, coding, testing, security, performance, deploy, workflow, backup, seo, feedback) |
| `docs/checklists/` | 수동 체크리스트 (페이지 수정 후, 배포 전) |
| `docs/decisions/` | 아키텍처 결정 기록 (ADR) |
| `scripts/` | 검증 (validate, validate-quick, smoke), Windows 보조 (doctor, phase-a), 설치 스크립트 |
| `scripts/lib/` | 검증 공용 헬퍼 (validate-utils.sh) |
| `feedback/` | 실수 기록(incidents) + 템플릿 |
| `plans/` | Orca Epic 실행 계획(`epic-<N>-orca.md`)과 복잡한 작업의 ExecPlan |
| `state/` | 진행 상태(`epic-N-progress.json`), Orca 환경 확인(`orca/env.json`), learning-loop.json, validate 로그 |
| `reviews/` | 리뷰 결과, Orca 실행 기록(`epic-N/orca-runs.md`), 수집한 검증 로그 |
| `src/` or `apps/` | 소스 코드 |
| `tests/` | 테스트 코드 |

## 참조 파일

- `docs/agents/agent-execution-rules.md`
- `docs/agents/orca-rules.md`
- `docs/agents/model-routing-rules.md`
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
3. `docker compose down -v` / `--volumes` 절대 금지 (DB 데이터 영구 유실). Claude Code 세션에서는 PreToolUse hook이 자동 차단하지만 다른 워커에는 hook이 없으므로 규칙으로 지킨다
4. 같은 접두사의 컨테이너가 이미 있으면 새로 만들지 말고 기존 compose 수정 (`docs/agents/docker-rules.md §3`)
5. compose 파일 최상단에 `name:` + `x-environment:` 라벨 필수 (`x-environment` 값은 `production` 또는 `development`)

## Tooling rules

- CLI로 수행 가능한 작업은 기본적으로 CLI를 우선 사용
- 소스 제어와 PR은 `git`, `gh`, 검증과 반복 작업은 저장소 `scripts/*`, JavaScript/TypeScript 패키지와 테스트 실행은 `npm`, `npx`, `node`, Python 작업은 `python`, `pip`, `uv`, HTTP 확인은 `curl` 또는 `http`, 브라우저/E2E는 `npx playwright`, 컨테이너 작업은 `docker`, `docker compose`, Kubernetes 작업은 `kubectl`, `helm`을 우선 사용
- 에이전트 오케스트레이션은 `orca` CLI를 사용한다. 설치된 버전의 `orca skills get orchestration`과 `--help`로 확인한 명령·플래그만 쓴다
- 동일 작업을 내장 도구와 CLI 둘 다로 수행할 수 있으면 CLI를 선택
- 프로젝트에 공식 래퍼 스크립트나 표준 명령이 있으면 ad-hoc 명령보다 그것을 우선 사용
- Windows/Codex에서 GitHub 원격 상태를 확인할 때는 raw `git fetch`보다 `gh api` 기반 `./scripts/phase-a/preflight.ps1`를 우선 사용
- Windows/Codex에서 실제 push/fetch가 필요할 때는 `scripts/lib/git-utils.ps1` 기반 wrapper를 raw `git fetch/push`보다 우선 사용
- Windows/Codex에서는 raw JS 런타임 sanity check보다 `./scripts/validate-quick.ps1`와 `./scripts/validate.ps1` 결과를 신뢰. raw `node`, `npm`, `npx`, `bun` 실행 실패만으로 작업을 중단하지 않는다
- CLI가 설치되어 있지 않거나 인증, 권한, 플랫폼 제약으로 실행할 수 없을 때만 대체 도구를 사용

## Validation (완료 기준)

- Story 완료 시: 현재 OS/셸에 맞는 quick validate 실행 (`validate-quick.sh` 또는 `validate-quick.ps1`)
- Epic 통합 완료 시: 현재 OS/셸에 맞는 전체 validate + smoke 실행 (`validate.sh` + `smoke.sh` 또는 `validate.ps1` + `smoke.ps1`)
- validate 실패 시: bash/WSL/macOS/Linux는 `./scripts/validate.sh --from=실패단계`, Windows PowerShell은 `./scripts/validate.ps1 --from=실패단계`로 재개
- 실패 시 로그 확인: `state/validate/latest/*.log` (단계별 로그 파일)
- 기본 출력은 summary 모드 (단계별 성공/실패 + 소요시간만 표시)
- 전체 출력이 필요하면: bash/WSL/macOS/Linux는 `VALIDATE_OUTPUT_MODE=verbose ./scripts/validate.sh`, Windows PowerShell은 `$env:VALIDATE_OUTPUT_MODE='verbose'; ./scripts/validate.ps1`
- 검증이 실패하면 완료로 간주하지 않음

## Coding rules (핵심만, 상세는 docs/agents/coding-rules.md)

- 아키텍처 경계를 준수 (docs/agents/architecture-rules.md 참고)
- 변경된 동작에 대해 테스트 추가 또는 업데이트
- 새 패턴 도입 시 docs/decisions/에 이유 기록
- 의존성 추가 시 정당한 이유 필요

## Change rules

- 변경 범위를 사용자가 요청한 작업으로 제한. Orca 워커는 계약의 Story와 수정 범위로 제한
- story와 관련 없는 리팩터링 금지
- 관련 문서를 같은 변경에서 업데이트
- 커밋 메시지 형식: `type(scope): description`
- type: feat, fix, refactor, test, docs, chore
- Orca 구현 워커는 validate-quick 통과 후 자기 브랜치에 **commit 필수**. push·merge는 코디네이터가 승인 범위 안에서 한다
