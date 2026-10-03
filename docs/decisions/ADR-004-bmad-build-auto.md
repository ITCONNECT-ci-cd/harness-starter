# ADR-004: 구현 워커는 bmad-build-auto를 쓴다

## 상태
Accepted

## 날짜
2026-10-03

## 맥락
- 하네스는 구현 워커에게 `bmad-create-story`와 `bmad-dev-story`를 순서대로 실행시켰다.
- BMAD v6.11.0(2026-08-10)이 이 두 스킬을 deprecated로 바꾸고 `v6-shims/`로 옮겼다. 제거 시점은 "v7 cut"이다.
- BMAD v6.12.0(2026-09-04, 이 글을 쓸 때의 최신 안정판) 설치기는 shim을 새 설치에 기본으로 넣지 않는다. CHANGELOG: "Deprecated shims are opt-in on fresh installs. Pass `--shims` to keep them."(PR #2728). 이 저장소의 `_bmad/_config/manifest.yaml`도 `installShims: false`이고, `.agents/skills/`에 두 스킬이 없어서 `preflight.ps1`이 실패했다. 로컬 `_bmad/bmm/v6-shims/README.md`는 "they ship by default"라고 적지만, 이는 CHANGELOG보다 오래된 문장이다.
- 업스트림의 Phase 4 표준 흐름은 `bmad-sprint-planning → bmad-build → bmad-code-review`다. Story 파일을 미리 만드는 단계는 없다. `bmad-build`가 Epic Story를 받아 `spec-<slug>.md`를 직접 만든다.
- `bmad-build`는 사람 승인 체크포인트에서 멈추고 `sprint-status.yaml`을 직접 고치고 스스로 커밋한다. 무인 변형이 `bmad-build-auto`다.
- 이 하네스를 처음 만든 쪽도 Build/Build Auto 절을 "번들에 없는 기능"이라서 뺐다. 설계상 선택이 아니라 번들 제약이었다. 근거는 harness-starter 저장소의 `docs/decisions/ADR-002-orca-orchestration.md` 29행이다. 그 ADR은 설치 대상이 아니라 이 저장소에는 없다.

## 결정
1. 구현 워커는 `bmad-build-auto`를 실행한다. `bmad-create-story`, `bmad-dev-story`, `bmad-quick-dev`, `bmad-dev-auto`는 쓰지 않는다.
2. 리뷰 워커는 `bmad-code-review`를 그대로 쓴다. 작성자와 다른 회사 모델의 독립 리뷰는 유지한다. 업스트림도 이 스킬을 Build 내장 리뷰 뒤의 "선택 추가 점검"으로 둔다.
3. 기획의 `bmad-sprint-planning`은 그대로 쓴다. Epic 상태 파일 `sprint-status.yaml`의 소유자는 코디네이터다. `bmad-build-auto`는 이 파일을 건드리지 않아서 기존 규칙과 맞는다.
4. 대화형 `bmad-build`는 사람이 곁에 있는 Quick Flow에서만 쓴다. 워커에게 쓰지 않는다.
5. 하네스 규칙은 BMAD 스킬 파일을 고치지 않고 `_bmad/custom/bmad-build-auto.toml`의 `persistent_facts`로 넣는다. 스킬 파일은 업데이트 때 덮어쓰이기 때문이다. 이 파일 이름은 CHANGELOG(v6.12.0)가 안내한 커스터마이즈 이름이다. `persistent_facts`는 배경 지식이라 스킬의 절차 문장과 부딪히면 절차가 이길 수 있다. 그래서 반드시 지킬 것은 설정과 스크립트로도 막는다(7번, `finalize-story.ps1`).
   - 구버전 `bmad-dev-story`가 강제하던 TDD는 `bmad-build-auto`에 없다. 같은 파일의 fact로 유지한다.
6. BMAD는 6.11 이상 6.x를 쓴다. `uv`가 필요하다. `bmad-build-auto`는 `uv`가 없으면 멈춘다.
7. Epic 컨텍스트 파일 `epic-<N>-context.md`는 코디네이터가 Epic 시작 때 한 번 만들어 `epic/<N>`에 커밋한다. 워커는 만들거나 고치지 않는다. `bmad-build-auto`는 이 파일을 "기획 문서보다 수정 시각이 새것"일 때만 유효한 캐시로 본다. 새 워크트리는 checkout 순서 때문에 이 조건이 깨질 수 있어서, `orca.yaml`의 `scripts.setup`이 `scripts/orca/touch-epic-context.mjs`로 수정 시각을 올린다.

## 고려한 대안
1. **shim 설치(`--shims`)로 기존 두 스킬을 유지**
   - 장점: 하네스 문서를 거의 안 고친다.
   - 단점: v7에서 제거될 스킬 위에 하네스를 짓게 된다. 업스트림이 "Only use this when explicitly invoked by name"이라 표시한 스킬이다.
2. **대화형 `bmad-build`를 워커에게 사용**
   - 장점: 업스트림 기본 경로다.
   - 단점: 계획 승인 체크포인트가 있어 비대화형 워커와 맞지 않는다. `sprint-status.yaml`을 직접 고쳐서 "워커는 공유 상태 파일을 고치지 않는다" 규칙과 부딪힌다.
3. **업스트림 오케스트레이터 `bmad-loop` 도입**
   - 장점: 무인 루프를 이미 구현했다.
   - 단점: "early open beta", pre-1.0이다. Windows는 WSL이 필요하다. 이 하네스의 Orca 코디네이터와 역할이 겹친다.

## 결과
- `bmad-build-auto`는 서브에이전트가 필수다. 서브에이전트를 못 쓰면 `blocked`(`no subagents`)로 끝난다. 이 경우 Story를 failed로 보고하고 코디네이터가 서브에이전트를 쓸 수 있는 승인된 대체 모델로 재배정한다.
- Story당 세션이 늘어난다. 구현 워커 안에서 서브에이전트가 구현 1개와 리뷰 4개(blind-hunter, edge-case-hunter, verification-gap, intent-alignment)를 띄운다. 리뷰 워커 안에서 `bmad-code-review`가 4개(blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor)를 띄운다. spec 없이 돌리면 3개다. 업스트림도 이 중복을 알려진 문제로 둔다(issue #2760). 하네스는 다른 회사 독립 리뷰를 약화하지 않는다. 한 번에 통과하면 Story당 추가 세션은 12개다. `bmad-build-auto`는 안에서 수정 루프를 최대 5회 돌아 최악에는 구현 6회와 리뷰어 24개까지 늘 수 있다. 실제 비용은 `orca-runs.md`로 측정해 조정한다.
- Story 파일이 spec 파일로 바뀐다. 이름은 Story 키로 시작하는 slug이고 정확한 이름은 스킬이 정하므로 코디네이터는 워커 보고에서 경로를 받는다. 수락 기준의 원본은 `epics.md`이고 spec이 이를 구체화한다.
- `bmad-build-auto`가 일찍 멈추면(더러운 작업 트리, `unclear intent`, `epic context missing`) spec이 아니라 `bmad-build-auto-result-*.md`를 남긴다. `blocked` spec은 영구적이다. 재시도 전에 워크트리를 정리해야 한다(`orca-rules.md` §5).
- `bmad-build-auto`가 직접 커밋한다. 하네스의 `finalize-story.ps1 -NoPush`는 "커밋할 변경 없음"을 정상 처리하므로 `validate-quick` 재확인 관문으로 남는다.
- v7이 나오면 `bmad-sprint-planning`과 `bmad-create-epics-and-stories`가 `bmad-ticket`으로 대체되고 `sprint-status.yaml`이 폐지될 예정이다(`main` 브랜치, 미릴리스). 이 하네스는 v6.x에서 고정한다. v7로 올릴 때는 `bmad migrate method`와 이 ADR을 다시 평가한다. v7 출시일은 확인하지 못했다.
- 이 ADR의 범위 밖: 워커가 의존성을 추가하지 못하게 하는 `AGENTS.md` 규칙은 Story 1.1(`package.json`, lockfile 생성)과 부딪힌다. `epics.md`의 S-2가 이미 "결정 필요"로 올려 둔 쟁점이다. 이 ADR은 바꾸지 않았다.
- 확인하지 못한 것:
  - Codex(GPT-6.1 Sol)와 Gemini 3.8 Flash 워커가 서브에이전트를 쓸 수 있는지.
  - 이 설치에서 `bmad-build-auto`를 끝까지 실행한 결과. 렌더와 오버라이드 주입만 확인했다.
  - `epic-<N>-context.md` 수정 시각 보정이 실제 Orca 워크트리 생성 순서에서 동작하는지. 단위 시험만 했다.
  - 업스트림의 v7 계획, 이슈 번호(#2760 등), `bmad-loop` 상태. 웹 조사로 얻었고 이 세션에서 직접 다시 확인하지 않았다. 릴리스 날짜, CHANGELOG 문구, PR #2728은 `gh api`로 직접 확인했다.
  - 첫 Epic 시험 운영(Story 1~2개)에서 확인한다.

## 근거
- [v6.11.0 릴리스 노트](https://github.com/bmad-code-org/BMAD-METHOD/releases/tag/v6.11.0): "`bmad-quick-dev` → `bmad-build`, `bmad-dev-auto` → `bmad-build-auto`, the `bmad-create-story` → `bmad-dev-story` pair is deprecated, and Phase 4 is a single chain".
- [CHANGELOG (v6.12.0)](https://github.com/bmad-code-org/BMAD-METHOD/blob/v6.12.0/CHANGELOG.md): shim은 새 설치에서 opt-in, create-story/dev-story는 "retained in full and still run when invoked by name. Removal rides the v7 cut", 커스터마이즈 파일 이름 안내. [PR #2728](https://github.com/bmad-code-org/BMAD-METHOD/pull/2728).
- [v6-shims README (v6.12.0)](https://github.com/bmad-code-org/BMAD-METHOD/blob/v6.12.0/src/bmm-skills/v6-shims/README.md): "Removal rides the v7 cut — never a 6.x minor."
- [PR #2637](https://github.com/bmad-code-org/BMAD-METHOD/pull/2637), [PR #2641](https://github.com/bmad-code-org/BMAD-METHOD/pull/2641), [issue #2419](https://github.com/bmad-code-org/BMAD-METHOD/issues/2419).
- [autonomous-development-loops (v6.12.0)](https://github.com/bmad-code-org/BMAD-METHOD/blob/v6.12.0/docs/build/autonomous-development-loops.md), [bmad-loop](https://github.com/bmad-code-org/bmad-loop).
- 로컬에서 직접 읽은 파일: `.agents/skills/bmad-build-auto/`(workflow.md, step-01~04), `.agents/skills/bmad-build/`, `_bmad/_config/bmad-help.csv`, `_bmad/bmm/v6-shims/README.md`.
