# docs/agents/feedback-rules.md
#
# 과거 Epic에서 반복된 실수 패턴을 정리한 활성 교훈 파일입니다.
# 이 파일은 Phase C 회고에서 재작성됩니다 (쌓는 파일이 아님).
#
# 운영 규칙:
#   - 최대 10개 active rule만 유지 (초과 시 가장 오래된 것 retire)
#   - 각 규칙은 source incident id를 가짐
#   - 최근 2 Epic 동안 재발 없으면 retired로 이동
#   - 기계적으로 판별 가능한 패턴은 validate 진입점 양쪽(validate.sh·validate.ps1)으로 승격 후 여기서 제거

## Active Rules

### 1. Windows PowerShell entrypoint must be native (codex-windows-native-pwsh)
- source: 2026-04-17-codex-windows-sandbox
- 발견: Codex Desktop Windows에서 `.ps1`가 Git Bash 래퍼로 동작하면서 validate/git/node 단계가 연쇄 실패
- 규칙: Windows용 `validate.ps1`, `validate-quick.ps1`, `smoke.ps1`는 Bash를 숨겨 호출하지 말고 native PowerShell로 구현한다. Git Bash/WSL은 선택 호환 계층이지 필수 실행 경로가 아니다.
- 승격 상태: `.github/workflows/harness-self-test.yml`에서 핵심 `.ps1` entrypoint의 `Invoke-HarnessBashScript` 의존을 차단

### 2. Codex Windows git must use harness wrapper first (codex-windows-git-wrapper)
- source: 2026-04-17-codex-windows-sandbox
- 발견: Codex Desktop Windows에서 `git fetch/push`가 schannel, credential helper, 기본 Windows env 누락으로 실패
- 규칙: Phase A 자동화와 문서화된 workflow는 raw `git fetch/push`보다 `scripts/lib/git-utils.ps1` 기반 wrapper를 우선 사용한다. wrapper는 Windows 기본 env 복구, OpenSSL fallback, credential-store fallback, secret redaction을 제공해야 한다.
- 승격 상태: active

### 3. Hook fallback requires native validation first (codex-windows-hook-fallback)
- source: 2026-04-17-codex-windows-sandbox
- 발견: Bash 기반 git hook은 Codex Windows sandbox에서 실행되지 않을 수 있음
- 규칙: Windows/Codex에서 `git commit --no-verify` fallback은 native validate/check가 이미 통과한 경우에만 허용한다. hook 실패를 검증 생략으로 해석하지 않는다.
- 승격 상태: active

### 4. Raw JS runtime checks are not validation gates (codex-windows-raw-node-false-negative)
- source: 2026-04-17-codex-windows-sandbox
- 발견: raw `node -e`, `npm`, `npx`, `bun` 실행이 Codex Windows 기본 env 누락으로 실패했으나 `validate-quick.ps1`는 env 복구 후 통과
- 규칙: Windows/Codex에서 raw JS 런타임 sanity check 실패만으로 story 구현을 중단하지 않는다. 반드시 현재 OS/셸에 맞는 하네스 검증 entrypoint 결과로 판정한다.
- 승격 상태: active

### 5. GitHub preflight uses gh on Codex Windows (codex-windows-gh-preflight)
- source: 2026-04-17-codex-windows-github
- 발견: raw `git fetch origin develop` 또는 GitHub HTTPS 접근이 Codex Windows 기본 env 누락 상태에서 `getaddrinfo() thread failed to start`로 실패할 수 있다. 같은 세션에서 env 복구 후 `gh api repos/<repo>/git/ref/heads/develop`는 통과했다.
- 규칙: Windows/Codex에서 GitHub 원격 사전 조건은 raw `git fetch`로 판정하지 않는다. `./scripts/phase-a/preflight.ps1 -Epic <N>` 또는 `scripts/lib/git-utils.ps1`의 `gh api` 경로를 사용한다. 이 경로에서 토큰 없음/권한 부족이 확인될 때만 사용자에게 새 PAT를 요청한다.
- 승격 상태: active

<!-- 예시 형식:
### 1. 테스트 누락 (missing-tests)
- source: epic-1-story-3
- 발견: Phase B 리뷰에서 2회 반복
- 규칙: 비즈니스 로직 변경 시 반드시 관련 테스트 추가
- 승격 상태: active (validate.sh 승격 검토 중)

### 2. N+1 쿼리 (n-plus-one-query)
- source: epic-1-story-5
- 발견: Phase B 리뷰에서 3회 반복
- 규칙: ORM 사용 시 include/eager loading 필수
- 승격 상태: validate.sh에 자동 감지 추가됨 → retired
-->

### 6. Full-run-only test failures are isolation failures until proven otherwise (test-isolation-full-run-only)
- source: 2026-09-10-test-isolation-full-run-only
- 발견: 서로 다른 스택 두 곳에서 같은 형태로 관측. 프런트엔드 Vitest 프로젝트에서 컴포넌트 테스트 1건이 전체 병렬 실행에서만 실패하고 단독 실행은 전부 통과했다. 백엔드 pytest 프로젝트에서는 환경변수 미설정 시 fail-closed 동작을 단언하는 테스트가 전체 실행에서 실패했는데, 다른 테스트가 같은 환경변수를 `os.environ`에 심은 순서 의존이었다. 두 경우 모두 처음에는 타임아웃·성능 문제로 오진해 대기 시간 상향을 시도할 뻔했다.
- 규칙: 전체 실행에서만 실패하는 테스트는 먼저 **단독 실행**으로 격리 문제 여부를 판별한다. 단독 통과 + 전체 실패면 격리 문제이며, 타임아웃·재시도 상향으로 넘기지 않는다(실제 결함을 덮는다). 재현하지 못하면 시도한 방법과 횟수를 기록하고 원인 미확정으로 남기며, 재현되지 않은 수정을 원인으로 보고하지 않는다. 절차는 `testing-rules.md`의 「간헐 실패와 전체 실행 전용 실패」를 따른다.
- 승격 상태: active. 테스트 파일 내 환경변수 직접 대입(`os.environ[...] =`, `process.env.X =`)은 기계적으로 검출 가능하므로 재발 시 validate blocking check 후보.

## Retired Rules

없음
