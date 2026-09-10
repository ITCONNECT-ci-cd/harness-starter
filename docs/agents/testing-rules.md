# docs/agents/testing-rules.md
#
# 테스트 작성과 실행에 대한 규칙입니다.
# ⚠️ 프로젝트의 테스트 프레임워크에 맞게 수정하세요.

## 테스트 필수 대상

- 새로 추가된 비즈니스 로직
- 변경된 기존 동작
- 버그 수정 (재발 방지 테스트)
- API 엔드포인트
- 사용자 입력 검증 로직

## 새 동작 테스트가 불필요한 경우

- 순수 UI 스타일링 변경
- 타입 정의만 변경
- 설정 파일만 변경
- 문서만 변경

위 목록은 관찰 가능한 동작이나 실행 계약이 바뀌지 않을 때의 기준이다. 런타임 설정·권한·빌드·배포·검증 동작을 바꾸면 해당 계약에 맞는 검증을 수행한다. Harness 규칙·스크립트 변경은 전체 validate를 실행한다. 구현 문구를 그대로 복제하는 테스트를 만들지 않는다.

## 테스트 작성 원칙

- 테스트 이름은 "무엇을 했을 때 무엇이 되어야 한다" 형식
- 하나의 테스트에 하나의 검증
- 외부 의존성은 mock 처리
- 테스트 데이터는 테스트 파일 내에 명시

## 테스트 격리 규칙 (병렬 충돌 방지)

테스트 간 공유 자원 충돌을 방지하기 위해 다음 규칙을 따릅니다:

- DB: 테스트별 트랜잭션 롤백 또는 테스트 전용 DB 사용. 공유 DB에 직접 쓰기 금지
- 포트: 테스트에서 서버를 띄울 때 `port: 0` 사용 (OS가 빈 포트 자동 할당)
- 파일 시스템: 임시 파일은 테스트별 고유 `tmp` 디렉토리 사용 (`mkdtemp` 패턴)
- 전역 상태: `beforeEach`에서 초기화, `afterEach`에서 정리. 테스트 간 상태 공유 금지
- 환경변수: 테스트에서 `process.env`를 직접 수정하지 않음. mock 또는 설정 주입 사용
- 타이머/시간: `vi.useFakeTimers()` 또는 `jest.useFakeTimers()` 사용 시 `afterEach`에서 반드시 복원

**현재 실행 실태**: validate 진입점(`validate.sh`·`validate.ps1`)은 Jest를 `npx jest --runInBand --ci`로 순차 실행합니다. **Vitest는 `npx vitest run`으로 호출하므로 기본 병렬 실행입니다.** 즉 Vitest 프로젝트에서는 위 격리 규칙이 실제 안전장치이며, 순차 실행이 대신 막아주지 않습니다.
순차 실행이 필요하면 `harness.validate.json`의 `commands.test` 또는 `HARNESS_TEST_CMD`로 `npx vitest run --no-file-parallelism`을 지정합니다.

## 4층 검증 체계 (Inner Loop → Outer Loop)

각 계층이 **고유한 가치**를 가지도록 설계. 모든 계층이 같은 것을 돌리면 중복 낭비이지만, 서로 다른 관점에서 검증하면 Defense in Depth가 된다.

| 시점 | 도구 | 범위 | 고유 가치 | 예상 시간 |
|---|---|---|---|---|
| Story 완료 (로컬) | `validate-quick` | 변경 파일 lint + typecheck + 관련 테스트 | 빠른 피드백 (inner loop) | < 60초 |
| Epic 완료 (로컬) | `validate` | 전체 typecheck/lint/test/build + **grep 기반 security/perf/blocking 체크** | 로컬 특화 패턴 검증 (CI에 없음) | 3~5분 |
| develop push (원격) | `.github/workflows/ci.yml` | 깨끗한 npm ci + 전체 검증 + **coverage + npm audit + docker build 검증** | 환경 독립 검증 + 보안 감사 | 5~8분 |
| main push (원격) | `.github/workflows/deploy.yml` | **사내 Docker 서버로 배포 + (옵션) pre-backup + post-smoke** | 프로덕션 배포 게이트 | 5~10분 |

### 중복 전략

- **네 계층이 lint/typecheck/test/build를 반복 실행**하는 것은 의도된 redundancy (Defense in Depth). 빠르고 싼 체크는 여러 번 돌려도 무방.
- **각 계층 고유 영역은 중복되지 않게**:
  - 로컬 validate만 하는 것: grep 기반 security/perf/blocking 체크 (CI에서는 불필요)
  - CI만 하는 것: coverage 수집, npm audit, Dockerfile 검증
  - Deploy만 하는 것: 실제 서버 적용
- Story 단위에서는 전체 테스트를 돌리지 않음 (아직 구현 안 된 Story의 테스트 실패 방지)
- BMAD dev-story의 Step 7·8·9와 DoD에서 요구하는 회귀 검증도 Story에서는 관련 테스트와 native validate-quick으로 충족한다. 전체 검증은 Epic 완료 시 수행한다.
- Windows의 BMAD Step 9는 `review` 상태를 기록하기 전에 quick 검증을 요구한다. 이후 `finalize-story.ps1`는 커밋할 최종 상태를 다시 검증한다. 현재 두 게이트는 모두 필수이며 자동으로 결과를 재사용하지 않는다. finalizer 직전에 별도 수동 quick을 추가해 세 번째로 실행하지 않는다. 구현 중 관련 테스트 실행은 별도다.
- 같은 변경 상태에서 통과한 검증은 새 변경·실패·미해결 우려가 없으면 반복하지 않는다. Phase B 통합 검증과 CI의 독립 환경 검증은 유지한다.
- Epic 단위에서 전체 테스트를 순차 실행하여 병렬 충돌 없이 통합 검증
- validate 실패 시 `--from=실패단계`로 해당 단계부터 재개 가능

## 검증 출력과 로그

- 기본 출력은 summary 모드: 단계별 성공/실패 + 소요시간만 표시
- 전체 출력: `VALIDATE_OUTPUT_MODE=verbose`로 설정
- 모든 실행의 원본 로그는 `state/validate/latest/*.log`에 단계별로 저장
- 실패 시 summary에 로그 경로 + 실패 테스트명 + 마지막 50줄이 포함됨
- 실패 디버깅: summary 출력의 로그 경로를 읽어서 원인 파악 (전체 로그를 콘솔에 쏟지 않음)

## 실행 명령

- Story 빠른 검증: bash/WSL/macOS/Linux는 `./scripts/validate-quick.sh`, Windows PowerShell은 `./scripts/validate-quick.ps1`
- Epic 전체 검증: bash/WSL/macOS/Linux는 `./scripts/validate.sh`, Windows PowerShell은 `./scripts/validate.ps1`
- 실패 단계부터 재개: bash/WSL/macOS/Linux는 `./scripts/validate.sh --from=test`, Windows PowerShell은 `./scripts/validate.ps1 --from=test`
- 전체 출력 모드: bash/WSL/macOS/Linux는 `VALIDATE_OUTPUT_MODE=verbose ./scripts/validate.sh`, Windows PowerShell은 `$env:VALIDATE_OUTPUT_MODE='verbose'; ./scripts/validate.ps1`
- 특정 파일: `npm run test -- --grep "파일명"`
- 커버리지: `npm run test:coverage`

## 검증 순서

1. 타입 체크 통과
2. lint 통과
3. 단위 테스트 통과 (순차 실행)
4. 회귀 테스트 통과
5. 빌드 성공
6. (해당 시) 통합 테스트 통과
