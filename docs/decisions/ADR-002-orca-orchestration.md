# ADR-002: Phase A·B를 Orca 오케스트레이션으로 교체하고 모델을 4개로 통일

- 날짜: 2026-09-30
- 상태: 적용
- 범위: Phase A·B 실행 흐름, 모델 기준, Codex 설정, 브랜치 흐름, 설치 매니페스트
- 대체: [ADR-001](ADR-001-astra-harness-instructions.md)의 결정 5(모델 기본값을 `.codex/config.toml`로 통일)와 Codex Desktop 기반 Phase A 흐름
- 일부 대체됨(2026-10-03): 구현 워커의 스킬 선택(`bmad-create-story`·`bmad-dev-story`)은 [ADR-004](ADR-004-bmad-build-auto.md)가 `bmad-build-auto`로 대체한다. 이 문서의 해당 기술은 결정 당시의 기록이다.

## 배경

사용자가 Orca(에이전트를 워크트리마다 띄우고 조정하는 오케스트레이터)와 네 모델(Gemini 3.8 Flash, Sonnet 5.5, GPT-6 Sol, Opus 5.5)로 개발하는 ORCA SDD Orchestrator 프롬프트(v5.0)를 하네스에 적용하도록 요청했다.

기존 하네스는 Codex Desktop이 Epic을 순서대로 구현하고(Phase A) Claude Code가 Epic 끝에 리뷰하는(Phase B) 두 도구 흐름이었다. 모델 기준은 `.codex/config.toml`(Astra), Codex 역할 프로필 5개(Astra, 5.6 Sol), Claude 표(Opus 5, Fable 5.1, Sonnet 5, Haiku 4.5)로 흩어져 있었다.

사전 평가에서 두 체계를 그대로 합치면 다음이 충돌했다: 모델 기준, commit·push 권한, `sprint-status.yaml` 동시 수정, 워크트리에 남는 검증 로그의 유실, Claude가 아닌 워커의 규칙 로딩, 런당 세션 상한과 BMAD 리뷰의 내부 리뷰어 3개, 60초 폴링, 코디네이터 직접 수정 전면 금지.

## 결정

> 2026-10-02 보완: 결정 2·4의 effort(위험도만으로 정함, 코디네이터 Sonnet 5.5 / medium)는 모델·역할별 하한으로 바뀌었다 — Sonnet 5.5·GPT-6.1 Sol·리뷰는 최소 high, 코디네이터 기본 Sonnet 5.5 / high. [변경 기록](../changelog/2026-10-02-effort-floors.md). 아래 본문은 2026-09-30 당시의 결정으로 보존한다.

1. **Phase A·B를 Orca 흐름으로 교체한다** (사용자 선택: 전면 교체). Story마다 구현 워커(create-story, dev-story, validate-quick, 로컬 커밋), 작성자와 다른 회사 모델의 읽기 전용 리뷰 워커(bmad-code-review), 같은 구현 워커의 수정, 코디네이터의 `epic/<N>` 통합 순서로 진행한다. Epic 끝에 validate + smoke를 한 번 실행한다.
2. **모델은 네 개로 통일한다** (사용자 선택: Orca 기준). 기준은 `docs/agents/model-routing-rules.md` 한 곳이다. Codex 역할 프로필 5개를 삭제하고 `.codex/config.toml`을 GPT-6.1 Sol / medium으로 바꾼다(처음에는 GPT-6 Sol이었고, 같은 날 GPT-6.1 Sol이 나와 교체했다. [변경 기록](../changelog/2026-09-30-gpt-6-1-sol.md)). Orca 워커는 `--model`과 `--effort`를 매번 명시한다. 코디네이터는 기본 Sonnet 5.5 / medium, 위험 높음 Story가 절반 이상인 Epic은 Opus 5.5 / medium으로 연다.
3. **프롬프트를 README에 통째로 넣지 않는다.** 규칙은 `docs/agents/orca-rules.md`(코디네이터)와 `AGENTS.md`의 「Orca 워커 규칙」(모든 워커)으로 옮기고, README에는 빈칸을 채우는 시작·이어서 하기·Epic 통합 프롬프트만 둔다. 워커는 채팅에 붙인 프롬프트를 보지 못하고 저장소 파일만 읽기 때문이다.
4. **프롬프트 내용 중 다음을 바꿨다.**
   - 한도 압력 계산(4장): 계산하지 않는다. Orca가 사용량을 CLI로 제공하지 않아 계산할 수 없고, 사용자가 한도 계산 대신 배정안 승인을 선택했다. 코디네이터가 위험도 × 작업 형태 표로 Story별 구현·리뷰·대체 모델을 정하고, effort는 위험도로 정해(낮음 medium, 보통 high, 높음 xhigh) 보여 준다. 사용자가 승인한 뒤 워커를 띄운다. 승인 후에는 대체 모델 전환과 리뷰 상향만 기록하고 진행하며, 그 밖의 변경은 다시 승인받는다.
   - 세션 상한: 런당 6회는 BMAD 리뷰 한 번(내부 리뷰어 3개 포함)으로 거의 소진되므로 Story당 6개로 바꾸고 내부 리뷰어를 명시적으로 계상한다.
   - 대기: 60초 대기는 빈 추론 턴을 늘리므로 코디네이터 셸 도구의 한도에 맞춰 늘린다(Claude Code는 540초).
   - 코디네이터 직접 수정: 위험 영역 밖, 한 파일, 대략 20줄 이내, 새 동작 없음이면 허용한다. 하네스의 "작은 수정은 직접" 원칙과 맞추고 불필요한 워커 기동을 줄인다.
   - 재시도: 하네스의 같은 원인 3회(워커 안)와 프롬프트의 1회(재배정)를 층으로 나눈다.
   - Build/Build Auto 관련 절: 이 하네스의 BMAD 번들에 없는 기능이라 제외하고, 설치된 create-story·dev-story·code-review 기준으로 다시 썼다.
5. **공유 상태는 코디네이터가 소유한다.** 워커는 `sprint-status.yaml`과 `deferred-work.md`를 고치지 않는다. 이 동작은 BMAD 스킬을 고치지 않고 `agent-execution-rules.md`의 BMAD 적용 기준 표로 덮어쓴다. 검증 로그는 코디네이터가 워커 워크트리에서 `reviews/epic-<N>/logs/`로 모은다.
6. **Epic 통합 브랜치 `epic/<N>`을 둔다** (`story/* → epic/* → develop → main`). 워커 워크트리가 이전 Story 결과에서 갈라지게 하면서, `develop`은 Epic 검증과 사용자 승인 뒤에만 바뀌게 하기 위해서다.
7. **legacy 자동화를 삭제한다.** `scripts/run-epic.sh`, `scripts/lib/codex-options.sh`, 그 테스트와 self-test 단계를 지운다. Windows PowerShell 검증 진입점과 `doctor.ps1`·`preflight.ps1`은 Windows에서 도는 Codex 워커와 코디네이터를 위해 유지하고, `finalize-story.ps1`에 `-NoPush`를 추가한다.
8. Gemini 워커가 규칙을 읽도록 `GEMINI.md`를 추가하고, 워크트리 의존성 설치를 위해 `templates/orca.yaml`을 둔다.

## 고려한 대안

1. **Orca 모드를 기존 흐름 옆에 추가**
   - 장점: Orca 없는 프로젝트도 쓸 수 있고 두 흐름을 파일럿으로 비교하기 쉽다.
   - 단점: 규칙과 모델 기준이 두 벌이 된다. 사용자가 전면 교체를 선택했다.
2. **원래 프롬프트를 README에 그대로 게시**
   - 장점: 원문이 보존된다.
   - 단점: 매번 263줄을 붙여야 하고, 워커에게 전달되지 않으며, 실행할 수 없는 절이 코디네이터 컨텍스트를 계속 차지한다.
3. **리뷰 승인된 Story를 바로 `develop`에 병합**
   - 장점: 브랜치가 단순하다.
   - 단점: `develop`이 Epic 전체 검증 전 상태를 갖게 된다.
4. **런당 6회·60분 상한 유지**
   - 장점: 원래 프롬프트와 같다.
   - 단점: Epic 하나를 여러 런으로 쪼개야 하고, "새 Run으로 상한을 초기화하지 않는다"는 규칙과 해석이 충돌한다.

## 결과와 제한

- 배정안 승인 전에는 워커가 뜨지 않으므로, Epic 시작은 사용자가 응답할 때까지 기다린다.
- Orca 없이 Phase A·B를 진행하는 경로는 없어졌다. 기획, Quick Flow(`bmad-quick-dev`), Phase C 회고는 단독 세션으로 계속 쓴다.
- 선택 표와 예산은 실측이 아닌 초기값이다. 코디네이터가 `orca-runs.md`를 칸별로 요약해 조정안을 내고 사용자가 승인한다. 진행 중인 Epic은 남은 Story의 배정안에, 규칙 표는 Phase C에서 반영한다.
- GPT-6.1 Sol의 등록 ID `gpt-6.1-sol`은 Codex 모델 목록에서 확인했다. 확인하지 못한 것: Gemini 3.8 Flash의 실제 등록 ID, Orca `worker-start`의 `--worktree`·`--setup` 값, Gemini 워커의 `GEMINI.md` 로드. 코디네이터가 시작 확인에서 설치 버전으로 확인한다.
- `.claude/hooks`의 위험 명령 차단과 편집 시 lint는 Claude 세션에만 적용된다. Codex·Gemini 워커는 validate, git hook, CI로 확인하므로 CI 자동 실행을 권장한다.
- 이미 설치된 프로젝트의 `.codex/agents/harness-*.toml`은 설치 스크립트가 지우지 않는다. 필요하면 직접 삭제한다.

## 근거

- 사용자 제공: ORCA SDD Orchestrator v5.0 프롬프트와 사전 평가 (2026-09-30)
- [Orca orchestration 가이드](https://github.com/stablyai/orca/blob/main/skill-guides/orchestration.md)와 참조 문서(coordinator-loop, worker-contract, recovery-and-cleanup): `--effort`는 `--model`과 함께만 쓰고 `--terminal` 재사용과 결합하지 않음, `launch.requested`/`launch.effective` 대조, `worker_done` 1회, `worker-release`는 워크트리를 지우지 않음
- [stablyai/orca#21746](https://github.com/stablyai/orca/issues/21746): 사용량·한도 창이 CLI·RPC로 제공되지 않음 (2026-09-30 확인 시 열린 상태)
- Orca 저장소의 `orca.yaml`: `scripts.setup`으로 워크트리 준비 명령 지정
- 프롬프트가 인용한 근거: [BMAD 계획 경로](https://docs.bmad-method.org/plan/choose-a-planning-path/), [Story 추적](https://docs.bmad-method.org/plan/break-work-into-stories-and-track-it/), [BMAD 리뷰](https://docs.bmad-method.org/build/review-a-change/), [Claude effort](https://platform.claude.com/docs/en/build-with-claude/effort), [Claude Code 비용](https://code.claude.com/docs/en/costs)
