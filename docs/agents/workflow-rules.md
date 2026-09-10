# docs/agents/workflow-rules.md
#
# 이 프로젝트의 작업 흐름 규칙입니다.
# BMAD + Harness Engineering 통합 워크플로우를 정의합니다.

실행 범위·승인·스킬 충돌·실패 횟수·위임은 `agent-execution-rules.md`를 먼저 적용한다. 이 문서의 Phase 루프는 해당 Phase 작업이 요청됐을 때 실행한다.

## 도구별 역할 분담

| Phase | 도구 | 역할 | BMAD 스킬 |
|---|---|---|---|
| 기획/설계 | Claude Code | PRD, Architecture, Epics 생성 | bmad-create-prd, bmad-create-architecture, bmad-create-epics-and-stories |
| Phase A: 구현 | Codex Desktop | Story 생성 + 구현 (Epic 단위) | bmad-create-story, bmad-dev-story |
| Phase B: 품질 보장 | Claude Code | 코드 리뷰 + 수정 + 테스트 보강 (Epic 단위) | bmad-code-review |
| Phase C: 회고 | Claude Code | Epic 회고 + Harness 강화 | 리뷰/검증 결과 분석, feedback-rules, incident, regression |

## Phase A: Codex Desktop 흐름 (Epic 단위)

Epic 시작 전:
1. Windows PowerShell이면 `./scripts/doctor.ps1`로 Codex/Windows 런타임을 점검한다.
2. 현재 OS/셸에 맞는 preflight를 실행한다.
   - Windows PowerShell: `./scripts/phase-a/preflight.ps1 -Epic <N>`
   - bash/WSL/macOS/Linux: README의 Loop A 사전 조건 또는 `scripts/phase-a/preflight.sh`가 있는 경우 해당 스크립트
3. Windows/Codex에서 GitHub 원격 브랜치 존재 여부는 raw `git fetch origin develop`가 아니라 `gh api repos/<owner>/<repo>/git/ref/heads/develop` 경로로 확인한다.

BMAD Epic 산출물은 `_bmad-output/planning-artifacts/epics.md`를 기본으로 한다. 프로젝트가 Epic을 sharding한 경우 `_bmad-output/planning-artifacts/epics/` 아래 markdown 파일도 허용한다.

각 story마다 순서대로:
1. `bmad-create-story` 스킬로 story 파일 생성 (풀 컨텍스트 엔진)
2. `bmad-dev-story` 스킬로 구현 (TDD: red-green-refactor)
3. 현재 OS/셸에 맞는 quick validate 실행 (lint + typecheck + 변경 관련 테스트만)
   - Windows PowerShell: `./scripts/validate-quick.ps1`
   - bash/WSL/macOS/Linux: `./scripts/validate-quick.sh`
4. 통과 시 **commit + push 필수**. Windows PowerShell/Codex에서는 raw git 대신:
   `./scripts/phase-a/finalize-story.ps1 -StoryName <story-이름>`
   이 스크립트가 최종 3~4번을 처리하므로 호출 직전에 수동 quick을 추가하지 않는다. BMAD Step 9의 `review` 전 검증은 별도 필수 게이트이며, 현재 finalizer가 그 결과를 재사용하지는 않는다. 기존 사용자 변경이 있는 작업 트리에서 실행하지 않도록 `agent-execution-rules.md`의 분리 기준을 먼저 적용한다.
5. sprint-status.yaml 업데이트 (스킬이 자동 처리)
6. 실패 시 수정 후 재검증. 동일 원인으로 수정 후 3회 실패하면 기록 후 skip (TDD RED 제외)
7. 실패 Story에 의존하지 않는 다음 Story로 진행. 의존성을 확인할 수 없으면 해당 Story를 보류

**중요:** validate-quick 통과한 story는 반드시 commit과 push를 완료해야 다음 story로 진행할 수 있다. push 없이 다음 story 진행은 금지.

Epic의 모든 story 완료 후:
1. 현재 OS/셸에 맞는 전체 validate 실행
   - Windows PowerShell: `./scripts/validate.ps1`
   - bash/WSL/macOS/Linux: `./scripts/validate.sh`
2. 실패 시 수정 후 현재 OS/셸에 맞는 `--from=실패단계`로 재개
3. 전체 통과하고 failed/skipped/보류 Story가 없을 때 Phase B로 이동. 미완료 Story가 있으면 완료로 보고하지 않음

**--from 옵션:** 테스트에서 실패했으면 `--from=test`, 빌드에서 실패했으면 `--from=build`로 해당 단계부터 재실행. 처음부터 다시 돌리지 않음.

**검증 출력:** 기본 summary 모드로 단계별 성공/실패만 표시. 실패 시 `state/validate/latest/*.log`에서 해당 단계 로그를 확인. 전체 출력이 필요하면 bash는 `VALIDATE_OUTPUT_MODE=verbose`, PowerShell은 `$env:VALIDATE_OUTPUT_MODE='verbose'`를 설정.

**Project mode 검증 계약:** 스택 마커(`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `pom.xml` 등) 또는 실제 소스 루트가 있으면 validate는 project mode로 동작한다(`validate.ps1`·`validate.sh` 공통 계약). 이 모드에서 `typecheck`, `lint`, `test`, `build` 명령이 없으면 SKIP/PASS가 아니라 실패다. 예외는 `harness.validate.json`의 `required.<step>=false`로 명시한다.

**Windows/Codex 원칙:** `.ps1` entrypoint는 native PowerShell 경로다. Git Bash 또는 WSL을 내부 필수 의존성으로 삼지 않는다. Bash 기반 hook이 실패하면 native validate/check 통과 후에만 no-verify fallback을 사용한다.

**Windows/Codex JS 런타임 판정:** raw `node`, `npm`, `npx`, `bun` sanity check 실패만으로 Phase A를 중단하지 않는다. Codex Windows 프로세스는 기본 Windows env가 비어 있을 수 있고, harness entrypoint가 이를 복구한다. 작업 가능 여부는 `./scripts/validate-quick.ps1` 또는 `./scripts/validate.ps1` 실패로만 판정한다. `doctor.ps1`의 `node child_process` 경고는 worker/fork-heavy 도구 주의 신호이지 단독 중단 사유가 아니다.

**Windows/Codex GitHub 판정:** GitHub 읽기/사전 조건 확인은 `gh`를 사용한다. `scripts/lib/git-utils.ps1`는 Windows 기본 env를 복구하고, `GH_TOKEN`이 없으면 Git credential helper의 GitHub 토큰을 재사용한다. `fatal: unable to access ... getaddrinfo() thread failed to start`가 raw git 네트워크 호출에서 발생하면 원격 장애로 단정하지 말고 `./scripts/phase-a/preflight.ps1 -Epic <N>`로 재확인한다. 이 경로에서 토큰 없음/권한 부족이 확인될 때만 새 PAT를 요청한다.

Codex 모델·reasoning 기본값은 `.codex/config.toml` 한 곳에서 관리한다. Desktop 기존 작업의 사용자 선택과 CLI의 명시적 오버라이드를 존중한다. 적용 범위는 `agent-execution-rules.md`의 모델 기본값을 참조한다.

## Phase B: Claude Code 흐름 (Epic 단위)

Epic 전체를 대상으로:
1. sprint-status.yaml에서 완료된 story 확인
2. 각 story 브랜치의 코드를 `bmad-code-review` 스킬로 리뷰
3. REJECTED 항목 직접 수정 (Edit/Write, Hooks 자동 작동)
4. 누락 테스트 보강
5. 현재 OS/셸에 맞는 `validate` + `smoke` 최종 검증 (이미 Epic 단위 validate를 통과했으므로 재확인 성격)
6. 모든 story APPROVED 후 **develop** 브랜치에 merge
7. develop 푸시 시 GitHub CI 작동, 통과하면 develop → main으로 승격 (main push 시 자동 배포)
8. sprint-status.yaml의 각 Story를 review → done으로 업데이트한다. 기획의 해당 Epic Story 목록과 대조하여 모든 Story가 done이고 필수 리뷰·검증·승인된 통합이 끝났으며 failed/skipped/보류 항목이 없을 때만 `development_status[epic-N]`도 done으로 기록한다. 누락된 Story나 미완료 게이트가 있으면 Epic은 in-progress로 유지한다.

주의: Phase B의 validate/smoke와 develop → main 흐름은 승인 후 통합/배포 경로입니다. Phase C를 출시 전 배포 준비로 해석하지 않습니다.

## Phase C: Claude Code 회고 + Harness 강화 (Epic 완료 후)

Phase C는 출시 전 최종 검증이나 배포 준비가 아니라, 완료된 Epic에서 배운 실패 패턴을 다음 Epic 전에 하네스에 반영하는 회고 단계입니다.
출시 전 검증과 배포 준비는 CI/CD 또는 Release Gate 흐름에서 별도로 다룹니다.

Phase B 완료 후 실행:
1. `reviews/epic-N/` 아래 리뷰 결과 (*.md + logs/*-validate.log + *-codex.log) 분석
2. `state/epic-N-progress.json`에서 failed/skipped story 확인
3. 반복된 REJECTED 패턴과 validate 실패 패턴을 식별
4. `feedback/incidents/`에 incident YAML 생성 (incident-template.yaml 참고)
5. 각 incident에 대해 재현 테스트를 `tests/regression/`에 작성 (다음 Epic에서 자동 실행)
6. `state/learning-loop.json` 업데이트 (패턴별 발생 횟수)
7. 승격 정책에 따라 조치:
   - 1회: 기록만
   - 2회: `docs/agents/feedback-rules.md`에 활성 규칙 추가
   - 3회+ 또는 치명적 (기계적으로 판별 가능한 경우만): `scripts/validate.sh`와 `scripts/validate.ps1` **양쪽에** blocking check로 추가 (warning이 아닌 exit 1). 한쪽에만 넣으면 다른 OS에서 승격이 적용되지 않는다
   - 아키텍처 성격: `docs/agents/architecture-rules.md` 또는 `docs/decisions/`에 ADR
8. **프로젝트 이해 문서 갱신** — 다음 Epic에서 AI가 잘못된 가정으로 짓지 않도록 지도를 코드와 맞춥니다.
   회고(1~7)가 regression 테스트와 validate를 바꾸므로 **반드시 회고 뒤에** 실행합니다.
   문서 작성 방법은 project-map 스킬, 준비·산출물 계약은 `project-map-rules.md`를 따릅니다. 스킬을 찾을 수 없으면 준비 절차로 경로·출처를 확인하고 이 단계만 미완료로 보고합니다. 다른 승인된 회고·검증 작업은 계속합니다.

   산출물별로 판단합니다 (Epic 번호가 아니라 **파일 존재 여부**가 기준입니다):
   - `docs/PROJECT_MAP.md`가 **없으면**: 생성하고 `CLAUDE.md`·`AGENTS.md`에 장 단위 참조와
     `docs/*.html`의 일상 맥락 수집 제외와 요청된 문서 작업의 읽기 허용을 배선합니다 (보통 Epic 1 회고에서 1회).
   - **있으면**: 이번 Epic에서 바뀐 장만 갱신합니다. **§0의 갱신 트리거가 하나도 안 걸렸을 때만**
     건너뜁니다 — "모듈 추가·의존 방향 변경"은 트리거 중 하나일 뿐 단독 판정 기준이 아닙니다.
     (라우트 추가, 스키마·상태전이 변경, 워커·알림 파이프라인 변경도 트리거입니다.)
   - `docs/SPEC.html`이 **이미 있으면**: 화면·라우트·규칙 근거가 바뀌었는지 확인하고 바뀌었으면 재생성합니다.
     마지막 Epic이 아니어도 합니다.
   - **마지막 Epic이면**: `PROJECT_MAP.md` §10 규칙 색인을 기계 생성하고 `CLAUDE.md`에 §10 행을 추가합니다. §10 없이 마지막 Epic 회고를 완료로 보고하지 않습니다.
     `docs/SPEC.html` 신규 생성은 이미 요청·승인됐으면 진행하고, 아니면 생성 여부를 한 번 확인합니다. 추가 사람용 문서는 승인된 파일명·대상 독자·범위가 있을 때만 생성합니다. 거절된 선택 문서는 완료 조건에서 제외합니다.
     **판정**: `_bmad-output/implementation-artifacts/sprint-status.yaml`의 `development_status`에서 정규식 `^epic-[0-9]+$`에 맞는 Epic 키만 봅니다. `epic-N-retrospective`와 Story 키는 제외합니다.
     이번 Epic 키가 존재하고 `done`이며, 나머지 Epic이 모두 `done`이고, 기획의 Epic 목록과 일치할 때 마지막으로 판정합니다. 파일·키 누락, 알 수 없는 상태, 목록 불일치는 미확정으로 보고 필요한 정보만 확인합니다. 빈 목록을 마지막 Epic으로 간주하지 않습니다.
     모든 Story가 done인데 Epic 키만 in-progress라면 Phase B 8번의 기획 목록·리뷰·검증·통합 근거를 확인합니다. 모두 충족하면 누락된 Epic 상태 갱신을 기록한 뒤 다시 판정하고, 근거가 부족하면 미확정으로 남깁니다. §10 생성을 위해 상태만 임의로 done으로 바꾸지 않습니다.

   회고에서 나온 반복 실수 중 **원인이 코드베이스 구조인 것**은 `PROJECT_MAP.md` §9 함정으로,
   **작업 습관인 것**은 `docs/agents/feedback-rules.md`로 보냅니다 (중복 방지).

   검증: 커버리지(양방향 diff)·경로 실존·근거 생존을 스크립트로 확인해 0건을 봅니다.
   **재생성 스크립트는 리포에 남깁니다** — 안 남기면 다음 Epic에서 재현되지 않습니다.
9. **`.claude/hooks/`는 Claude Phase B에만 적용됨** — 공통 강제는 validate 진입점 양쪽(`validate.sh`·`validate.ps1`) 또는 CI 우선
10. **완료 기준**: harness 파일(validate, rules, hooks)을 수정했으면 반드시 현재 OS/셸에 맞는 검증을 재실행하여 harness 자체가 깨지지 않았는지 확인
   - Windows PowerShell: `./scripts/validate.ps1`
   - bash/WSL/macOS/Linux: `bash -n scripts/validate.sh && ./scripts/validate.sh`
   - 이해 문서를 갱신했으면 커버리지·경로 실존 검증도 함께 재실행
11. 검증 통과 후 커밋: `chore(harness): Epic N 회고 반영`
12. **브랜치 정리**: 이번 Epic의 story 브랜치와 merged된 임시 브랜치를 정리
    ```bash
    # 먼저 dry-run으로 대상 확인
    ./scripts/cleanup-branches.sh

    # 확인 후 실제 실행
    ./scripts/cleanup-branches.sh --apply
    ```
    - main과 develop 양쪽에 merged된 것만 삭제 대상
    - 보호 브랜치: `main`, `develop`, `release/*`, `hotfix/*`
    - **복구 보장**: 삭제 전에 `archive/<branch-name>/<YYYYMMDD>` 태그를 생성하고 원격에 push.
      commit 히스토리는 태그로 영구 보존됨. 복구하려면:
      `git checkout -b restored archive/<branch>/<date>`

feedback-rules.md 운영 규칙:
- 최대 10개 active rule만 유지
- 각 규칙은 source incident id를 가짐
- 최근 2 Epic 동안 재발 없으면 retired로 이동
- 기계적 판별 가능 패턴이 validate 진입점 양쪽으로 승격되면 여기서 제거

## Quick Flow (가벼운 작업)

BMAD 풀코스가 필요 없는 간단한 작업:
- Claude Code에서 `bmad-quick-dev` 스킬 사용
- 또는 `bmad-agent-quick-flow-solo-dev` (Barry) 호출
- spec → implement → review → present를 한 세션에서 처리

## 브랜치 규칙

회사 표준 흐름: `story/* → develop → main → 자동 배포`

- story별 브랜치: `story/<story-이름>`
- develop: 개발 통합 브랜치 (모든 story가 먼저 merge되는 곳)
- main: 배포 브랜치 (push 시 사내 Docker 서버로 자동 배포)
- Phase A에서는 story 브랜치에 커밋
- Phase B에서 APPROVED 후 **develop에 merge** (main 직접 push 금지)
- CI가 develop에서 통과하면 develop → main 승격 PR 생성
- main과 develop은 항상 검증 통과 상태 유지
- merge된 story 브랜치는 Phase C 회고 단계에서 `scripts/cleanup-branches.sh`로 정리됨 (archive tag로 복구 보존)

## 실패 처리

- Phase A validate-quick 실패: Codex가 수정 후 재시도 (3회까지)
- Phase A validate.sh (Epic 단위) 실패: `--from=실패단계`로 재개, 처음부터 다시 돌리지 않음
- Phase B 리뷰 거부: Claude Code가 직접 수정
- 같은 원인의 수정 후 3회 실패: `agent-execution-rules.md`에 따라 실패 근거를 남기고 해당 Story 및 의존 Story를 미완료로 표시. 독립 Story만 진행

## Hang/Timeout 가드

validate · smoke · PostToolUse hook의 모든 외부 명령은 hard cap timeout으로
보호됩니다. 어떤 외부 원인(npm registry hang, vitest watch 모드 진입, eslint
무한 루프 등)에도 무한 대기가 발생하지 않도록 설계되었습니다.

기본값과 환경변수:

| 단계 | 기본 timeout | 오버라이드 환경변수 |
|---|---|---|
| install | 1800s (30m) | `VALIDATE_INSTALL_TIMEOUT` |
| typecheck | 600s (10m) | `VALIDATE_TYPECHECK_TIMEOUT` |
| lint | 300s (5m) | `VALIDATE_LINT_TIMEOUT` |
| test / regression-test / related-tests | 1200s (20m) | `VALIDATE_TEST_TIMEOUT` |
| build | 1200s (20m) | `VALIDATE_BUILD_TIMEOUT` |
| 그 외 단계 | 600s (10m) | `VALIDATE_DEFAULT_TIMEOUT` |
| smoke 전체 | 600s (10m) | `HARNESS_SMOKE_TIMEOUT` |
| PostToolUse eslint hook | 60s | `HARNESS_HOOK_TIMEOUT` |

`0`을 설정하면 무제한(timeout 없음, 이전 동작). timeout 발동 시 종료 코드 124와
함께 로그에 `HARNESS TIMEOUT` 메시지가 추가됩니다.

명시적 명령 오버라이드:
- `HARNESS_INSTALL_CMD` / `HARNESS_TYPECHECK_CMD` / `HARNESS_LINT_CMD` / `HARNESS_BUILD_CMD` — 각 단계 명령
- `HARNESS_TEST_CMD` — validate의 04a test 단계
- `HARNESS_RELATED_TEST_CMD` — validate-quick의 03 related-tests 단계
- `HARNESS_REGRESSION_TEST_CMD` — validate의 04b regression 단계
- `HARNESS_SMOKE_CMD` — smoke 전체
- `harness.validate.json` — `mode`, `commands.{install,typecheck,lint,test,build,regression-test,related-tests}`, `required.<step>` 계약. **validate.ps1과 validate.sh 둘 다 인식** (우선순위: 환경변수 > config > 자동 감지)

PostToolUse hook은 `.claude/settings.json`의 `async` 속성을 토글해 행동을
바꿀 수 있습니다(기본 `false` = 즉시 피드백, `true` = 후행 알림). 60s cap이
이미 hang을 차단하므로 대부분 `false` 유지가 권장.
