# Orca 개발 규칙

Orca 코디네이터가 BMAD Epic을 Story 단위로 워커에게 맡겨 개발할 때의 기준이다. 코디네이터는 이 문서를, 워커는 `AGENTS.md`의 「Orca 워커 규칙」과 코디네이터가 보낸 계약을 따른다. 모델·effort는 [모델 배정 규칙](model-routing-rules.md), 승인 범위·실패 횟수·보고의 공통 기준은 [에이전트 실행 규칙](agent-execution-rules.md)을 적용한다.

목표는 요구사항 충족·보안·회귀 방지를 지키면서, 작업마다 필요한 만큼의 모델과 추론 수준을 써서 비용과 시간을 줄이는 것이다. 코디네이터가 Story별 모델 배정안을 제안하고 사용자가 승인한다. 배정 기준은 실측으로 검증된 최적값이 아니라 초기 운영 가설이며, `reviews/epic-<N>/orca-runs.md`에 쌓인 기록으로 Phase C에서 고친다. 절감 효과를 추측해서 보고하지 않는다.

## 1. 역할

| 역할 | 맡는 일 | 하지 않는 일 |
|---|---|---|
| 사용자 | 목표, 걱정되는 위험, 모델별 계정, push·merge 승인 범위를 주고 모델 배정안을 승인한다 | 워커 기동·감독 |
| 코디네이터 | 시작 확인, 계획과 모델 배정안 작성, 워커 기동, 질문 처리, 증거 확인, 통합(병합·상태 갱신·기록), 최종 판정 | 일상적인 조사·구현·수정, 승인 없는 배정 변경 |
| 구현 워커 | Story 하나를 `bmad-build-auto`로 spec 생성·TDD 구현·내장 리뷰, validate-quick, 자기 브랜치에 커밋 | push·merge, 다음 Story 시작 |
| 리뷰 워커 | 작성자와 다른 회사 모델로 `bmad-code-review` 실행 | 코드·spec 파일·상태 파일 수정 |

- 코디네이터 세션은 Sonnet 5.5 / high로 연다. 위험 높음 Story가 Epic의 절반 이상이면 Opus 5.5 / medium으로 연다 (모델 배정 규칙의 「코디네이터」).
- 코디네이터는 다음 조건을 모두 만족하는 수정만 직접 한다: 위험 영역(인증·권한·결제·DB 마이그레이션·트랜잭션·동시성) 밖이고, 한 파일 안의 작은 수정(대략 20줄 이내)이며, 새 동작을 추가하지 않는다. 문서·설정·상태 파일 갱신, 기계적인 병합 충돌 해결, 오타 수준의 리뷰 지적이 여기에 해당한다. 직접 수정한 뒤에는 validate-quick을 실행한다.
- 그 밖의 구현은 워커에게 맡긴다. 워커가 하나뿐이라는 이유로 코디네이터가 구현을 떠맡지 않는다.
- 코디네이터는 Epic 내내 한 세션으로 돌지 않는다. Story 몇 개마다 안전한 경계에서 새 세션에 인계한다(§11). Orca 밖이거나 인계 스크립트를 쓸 수 없으면 안전한 경계에서 끝내고 README의 「이어서 하기」 프롬프트로 새 코디네이터를 시작한다.

## 2. 시작 확인

확인 결과는 `state/orca/env.json`에 저장해 재사용한다. 파일이 없거나 Orca·에이전트 CLI의 버전이 바뀌었을 때만 다시 확인한다.

1. **Orca**: `orca status --json`, `orca skills get orchestration`을 읽는다. 모델·effort·재사용 규칙이 필요하면 `--reference references/coordinator-loop.md`도 읽는다. 참조를 지원하지 않으면 `--full`을 한 번 읽는다. 설치된 버전의 가이드가 이 문서보다 우선하며, 지원되지 않는 명령이나 플래그를 추측해서 쓰지 않는다.
2. **워커 기동 옵션**: `worker-start`가 `--model`·`--effort`를 지원하는지 가이드와 `--help`로 확인한다. `--effort`는 `--model`과 함께, 그 모델이 지원하는 수준만 쓴다. `--terminal` 재사용과 두 override를 함께 쓰지 않는다.
3. **모델 ID**: 모델 배정 규칙의 네 논리 모델을 실제 등록 ID·에이전트·계정에 대응시킨다. Antigravity는 `agy models`로 확인한다. Codex는 모델 목록(`/model`, 설치된 버전이 지원하면 `codex debug models`)에 `gpt-6.1-sol`과 지원 effort가 있는지 확인하고, 없으면 Codex CLI를 업데이트한다. 같은 모델이라도 호출 경로가 다르면 계정·설정이 같다고 가정하지 않는다.
4. **저장소**:
   - 루트 `orca.yaml`이 없거나 `scripts.setup`이 현재 스택의 의존성 설치와 맞지 않으면 `templates/orca.yaml`을 바탕으로 만들고 커밋한다. 새 워크트리에는 설치된 패키지가 없어서 이 설정이 없으면 워커의 검증이 바로 실패한다.
   - `git config core.hooksPath`가 `.githooks`가 아니면 `scripts/setup/install-git-hooks.sh`(Windows는 `.ps1`)를 실행한다. git hook은 Claude가 아닌 워커의 커밋에도 걸리는 유일한 검사다.
   - BMAD 스킬(`bmad-build-auto`, `bmad-code-review`, `bmad-sprint-planning`), `uv`, 하네스 오버라이드 `_bmad/custom/bmad-build-auto.toml`, 기획 산출물(architecture, epics, `sprint-status.yaml`)이 있는지 확인한다. BMAD는 6.11 이상 6.x여야 한다(ADR-004). 6.10 이하이거나 v7이면 멈추고 사용자에게 알린다. 이 문서에 맞추려고 BMAD를 직접 업그레이드하거나 상태 파일 체계를 옮기지 않는다.
   - Windows PowerShell이면 `./scripts/doctor.ps1`과 `./scripts/phase-a/preflight.ps1 -Epic <N>`을 실행한다.
5. **서브에이전트**: `bmad-build-auto`는 서브에이전트가 필수이고 못 쓰면 `blocked`로 끝난다. 구현 모델로 쓸 에이전트(Claude Code·Codex·Antigravity)마다 서브에이전트를 띄울 수 있는지 확인하고 결과를 `env.json`에 적는다. 확인하지 못했거나 못 띄우면 그 에이전트를 구현 워커 후보에서 빼고 배정안에 이유를 적는다. 추측하지 않는다.

`env.json`에는 확인 시각, 도구 버전, 논리 모델별 실제 ID·에이전트·계정 별칭·지원 effort만 적는다. 토큰·비밀값·이메일은 적지 않는다.

## 3. Epic 계획

- 기존 PRD·architecture·epics·`sprint-status.yaml`을 재사용한다. 실행할 때마다 전체 문서와 저장소를 다시 읽거나 새 전체 계획을 만들지 않는다. 대상 Story와 직접 의존하는 Story의 문서·코드만 확인한다.
- Epic을 시작할 때 `templates/orca-epic-plan.md`로 `plans/epic-<N>-orca.md`를 만든다. 이미 있으면 바뀐 행만 고친다.
- 계획에는 `epics.md`와 spec 파일에 없는 실행 정보만 적는다: 승인된 모델 배정안(§4), 의존 Story와 해제 조건, 수정 범위와 금지 범위, 예산. 수락 기준·작업 목록·참고 자료는 `epics.md`와 spec 파일(`spec-<story-key>*.md`)에 두고 복사하지 않는다.
- Epic을 시작할 때 `epic-<N>-context.md`를 한 번 만든다. `.agents/skills/bmad-build-auto/compile-epic-context.md`를 서브에이전트의 프롬프트로 실행한다. 인자는 Epic 번호, epics 파일 경로, `_bmad-output/planning-artifacts`, 출력 경로 `_bmad-output/implementation-artifacts/epic-<N>-context.md`다. 서브에이전트를 쓸 수 없으면 코디네이터가 그 문서를 읽고 직접 만든다. 파일이 비어 있지 않고 `# Epic <N> Context:`로 시작하는지 확인한 뒤 `epic/<N>`에 커밋한다. 워커마다 `epics.md` 전체를 읽고 요약하는 비용과, 병렬 워커가 같은 파일을 각자 만들어 병합이 충돌하는 문제를 막기 위해서다. `epics.md`나 architecture를 고쳤으면 다시 만든다.
- 제품 의도나 필수 설계가 정해지지 않았으면 그 Story와 의존 Story만 보류하고 필요한 결정을 사용자에게 묻는다. 독립 Story는 계속 진행한다. BMAD의 네이티브 상태 스키마를 배정 변경용으로 편집하지 않는다.

## 4. 모델 배정과 승인

진행 방식은 두 가지다. 시작 프롬프트의 「진행 방식」이 정하며, 적지 않으면 승인 대기다.

| 진행 방식 | 언제 | 사람이 하는 일 |
|---|---|---|
| 승인 대기 (기본) | 사람이 곁에 있고, 배정을 직접 고르고 싶을 때 | 배정안·재승인 대상 변경을 그때그때 OK |
| 무인 | 사람이 자리를 비우는 긴 Epic, 밤사이 진행 | 끝난 뒤 `owner-digest.md`를 읽고 뒤집을 것만 알려 줌 |

### 4.1 승인 대기 (기본)

- Epic 계획을 만들 때 Story마다 [모델 배정 규칙](model-routing-rules.md)의 선택 방법으로 위험도와 작업 형태를 판정하고, 구현 모델·effort, 리뷰 모델·effort, 대체 모델을 정한다. 사용량은 계산하지 않는다(사용자가 사용량 가드를 켰으면 §8.1을 따른다).
- 워커를 띄우기 전에 배정안을 모델 배정 규칙 6번 형식의 표로 보여 주고 사용자의 OK를 기다린다. 답이 없으면 승인으로 보지 않는다. 기다리는 동안에도 워커 없이 할 수 있는 준비(시작 확인, `orca.yaml` 점검)는 진행한다.
- 승인된 배정안을 `plans/epic-<N>-orca.md`에 승인 날짜와 함께 기록하고 커밋한다. 이후 워커는 배정안의 모델·effort로만 기동한다.
- 승인 후 배정안과 다르게 해도 되는 경우는 두 가지뿐이다. 한도·접근 오류(서브에이전트를 못 쓰는 `no subagents` 포함)나 같은 원인 3회 실패로 승인된 대체 모델로 바꿀 때, 위험도가 계획보다 높게 드러나 리뷰를 위험 높음 기준으로 올릴 때다. 이때는 바꾼 사실과 이유를 `orca-runs.md`와 최종 보고에 적는다. 그 밖의 변경(배정안에 없는 모델, effort를 「위험도 + 모델·역할별 하한」 기준(모델 배정 규칙 「effort 원칙」)보다 올리거나 내리는 것 — 하한 아래로는 승인으로도 내리지 않는다, 리뷰 생략·약화, Story 추가·분할)은 다시 승인받는다.
- `worker-start`에는 항상 `--agent`, `--model`, `--effort`를 명시한다. 생략하면 `.codex/config.toml`이나 Claude Code 기본값(xhigh)으로 실행된다. 예외: Gemini(Antigravity)는 수준이 모델 ID에 붙으므로(`--model gemini-3.8-flash-high`) `--effort`를 따로 줄지는 시작 확인에서 정한 대로 한다(모델 배정 규칙 「설정 위치」) — 어느 쪽이든 수준은 모델 ID로 하한을 지킨다. effort가 모델 배정 규칙 「effort 원칙」의 하한(Sonnet 5.5·GPT-6.1 Sol·리뷰는 high)보다 낮으면 띄우지 않고 배정안을 고친다.
- 기동한 뒤 `launch.requested`와 `launch.effective`를 대조해 둘 다 `orca-runs.md`에 적는다. `/model` 메시지를 보낸 것만으로 모델이 바뀌었다고 보지 않는다. 실제 적용값이 배정안과 다르면 그 워커에게 일을 맡기기 전에 원인을 확인한다.
- 새 유료 API나 자동 초과 과금을 켜지 않는다. 대체 모델까지 막히면 그 Story만 보류하고 독립 Story를 진행한다.
- 네 모델을 매 Story에 모두 쓰거나 같은 비율로 맞추지 않는다.

### 4.2 무인 진행 (선택)

사람이 답할 수 없는 동안 질문으로 멈추지 않고, 사람이 나중에 읽고 뒤집을 수 있게 기록하며 진행한다. 위험을 줄이는 장치(다른 회사 리뷰, 검증, 승인 범위)는 그대로 두고, **기다림만** 기록으로 바꾼다.

- **질문으로 턴을 끝내지 않는다.** 선택지가 생기면 이 문서·계획·architecture로 추천안을 골라 적용하고 `reviews/epic-<N>/owner-digest.md`(`templates/orca-owner-digest.md`)에 「결정 — 적용한 안 — 근거 — 뒤집으면」 한 줄을 남긴다. 사람에게 묻는 도구(AskUserQuestion 등)를 쓰지 않는다. 코디네이터 세션은 `templates/orca-unattended-system-prompt.md`를 시스템 프롬프트로 붙여 연다(§11 스크립트의 `--unattended`가 붙인다).
- **권한 확인 창**: 무인이어도 Claude Code가 도구 사용 허락을 물으면 답할 사람이 없어 멈춘다. 사용자가 둘 중 하나를 고른다 — ① Claude Code 설정의 허용 목록(`permissions.allow`)에 코디네이터가 쓰는 명령(git, orca, node scripts, 검증 스크립트)을 넣어 둔다(권장) ② 인계 스크립트에 `--skip-permissions`를 줘 권한 확인을 생략한다. ②에서도 `.claude/hooks`의 위험 명령 차단은 돌지만, push·merge·외부 발송이 승인 범위 안인지는 hook이 검사하지 않고 이 규칙으로만 지킨다.
- **배정안**: §4.1과 같은 방법으로 만들고 OK를 기다리지 않고 적용한다. `plans/epic-<N>-orca.md`의 승인 줄에 `무인 적용 <날짜> — 사람 확인 대기`라 적고 digest에 거부권 행을 올린다.
- **승인 후 변경**: 아래만 기록하고 진행한다. 바꾼 사실은 계획의 「승인 후 변경」 표와 digest에 적는다.
  - §4.1에서 이미 사전 승인인 것: 승인된 대체 모델로의 전환, 위험도가 높게 드러났을 때 리뷰를 위험 높음 기준으로 올리는 것
  - Story 분할: 나눈 조각은 부모 행의 모델·effort·리뷰·대체 모델을 물려받는다. 위험도는 올릴 수만 있고(올리면 모델 배정 규칙 표대로 다시 고른다), 내리지 않는다.
  - 위 밖의 변경(배정안·규칙 표에 없는 모델, effort를 「위험도 + 모델·역할별 하한」 기준보다 내리는 것, 리뷰 생략·약화, 범위를 넓히는 Story 추가)은 하지 않는다. 필요하면 그 Story만 보류하고 digest의 「막힌 Story」에 적는다.
- **제품 결정·되돌리기 비싼 결정**: 안전한 기본값이 있으면 그것으로 진행한다(모르는 값은 비워 두고 표시, 가격을 모르는 호출은 막기, 명세가 둘로 읽히면 보수적인 쪽). 없으면 그 Story와 의존 Story만 보류하고 독립 Story를 계속한다. 남은 Story가 모두 막혔을 때만 멈춘다.
- **수락 기준은 코디네이터가 바꾸지 않는다.** 맞출 수 없으면 줄이지 말고 그 Story를 보류한다.
- **워커의 `ask`**: 계약·계획·architecture로 답할 수 있으면 해당 위치를 가리켜 답한다. 제품 결정이면 위 규칙대로 기본값으로 답하거나 그 Story를 보류한다.
- **승인 범위는 그대로다.** push·merge·배포·운영 데이터 변경·새 과금·외부 발송은 무인이어도 시작 프롬프트의 승인 범위 안에서만 한다.
- **멈춤**: 남은 Story가 모두 막혔을 때, 사용량 가드나 멈춤 파일이 멈추라고 할 때(§8.1), 인계 체인 상한에 닿았을 때(§11), Epic이 끝났을 때. 멈출 때는 계획·기록·digest를 커밋한 뒤, 보고를 digest의 미확인 항목 수와 경로로 시작한다.

## 5. Story 흐름

코디네이터는 메인 체크아웃에서 Epic 통합 브랜치 `epic/<N>`을 쓴다. 처음이면 `develop`에서 만든다. 워커 워크트리는 이 브랜치에서 갈라지므로, 워커가 봐야 할 파일(이전 Story 결과, 계획)은 기동 전에 `epic/<N>`에 커밋돼 있어야 한다.

```sh
# 명령 형식 예시. --worktree·--setup 값과 worker-start --spec 사용 여부는 설치 버전 가이드로 확인한다.
orca orchestration run-create --objective "Epic <N>: <목표>" --json
orca orchestration task-create --spec "<채운 계약>" --task-title "<story-key> 구현" --json
orca orchestration worker-start --task <task-id> --worktree <새 워크트리 모드> --name <story-key> \
  --agent <확인된 에이전트> --model <확인된 모델 ID> --effort <지원 수준> --setup inherit --json
orca orchestration check --wait --types worker_done,escalation,question --timeout-ms 540000 --json
```

1. **준비**: 선행 Story가 해제 조건을 충족했는지 실제 커밋과 검증 결과로 확인한다. `sprint-status.yaml`의 표시만 믿지 않는다. `templates/orca-worker-contract.md` 형식으로 계약을 채운다. 리뷰 계약에는 구현 워커가 보고한 spec 파일의 실제 경로를 넣는다.
   - 스택이나 lockfile을 처음 만드는 Story(모노레포 초기화 등)는 계약에 "`.gitignore`를 가장 먼저 만든다. `node_modules`·빌드 결과는 커밋하지 않는다"를 적는다. `bmad-build-auto`는 추적되지 않은 파일까지 diff 파일에 넣어 리뷰어 4개가 읽고, 시작과 끝에 깨끗한 작업 트리를 요구한다. lockfile이 크면 리뷰 diff도 커지므로 결과를 보고 판단한다.
2. **구현**: 구현 워커 1명이 `bmad-build-auto`를 실행한다. 호출 프롬프트에는 story 키와 `epics.md` 경로만 넣는다. 검증 명령은 `_bmad/custom/bmad-build-auto.toml`이 spec의 `## Verification`에 넣게 한다. 이 스킬이 spec 파일을 만들고, 서브에이전트로 구현하고, 내장 리뷰 4층(blind-hunter, edge-case-hunter, verification-gap, intent-alignment)과 수정을 거쳐 자기 브랜치에 커밋한다. spec 파일 이름은 story 키로 시작하는 slug이고 정확한 경로는 워커의 `worker_done` 보고로 받는다. 코디네이터는 경로를 짐작하지 않는다. 워커는 끝난 뒤 spec의 `status`가 `done`인지 확인하고 `finalize-story`로 한 번 더 검증한다. `blocked`이면 blocking condition 원문과 spec 경로와 함께 failed로 보고한다. 일찍 멈추면(더러운 작업 트리, `unclear intent`, `epic context missing` 등) spec이 아니라 `bmad-build-auto-result-*.md`가 남는다. `no subagents`이면 접근 오류와 같은 종류로 보고 서브에이전트를 쓸 수 있는 승인된 대체 모델로 재배정한다(§4.1의 사전 승인 범위, 같은 원인 재시도에는 세지 않는다). 대체 모델도 서브에이전트를 쓸 수 없으면 그 Story를 보류한다. 재시도하거나 재배정하기 전에 코디네이터가 구현 워크트리를 정리한다. 새 워크트리에서 시작하는 것이 가장 안전하다. 같은 워크트리를 쓰려면 기준 커밋으로 되돌려 부분 구현 코드를 버리고 blocked spec과 `bmad-build-auto-result-*.md`를 지운다. 이유: `blocked` spec은 영구적이어서 그 경로를 넘기면 즉시 멈추고, 경로 없이 다시 호출하면 `-2` 접미사의 새 spec이 생기고, 부분 구현이나 결과 파일이 남은 작업 트리는 시작 검사에서 다시 멈춘다.
3. **리뷰**: 리뷰 워커 1명이 작성자와 다른 회사의 모델로 `bmad-code-review`를 실행한다. 읽기만 하므로 가능하면 `--setup skip`으로 기동한다. 저장소 번들 `.agents/skills/bmad-code-review`를 쓴다(전역 설치본은 층 구성이 다르다). BMAD가 띄우는 내부 리뷰어는 blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor 4개이고(spec 없이 돌리면 3개), 이 Story의 세션 예산에 넣는다. 서브에이전트를 띄울 수 없으면 네 관점을 순서대로 검토하고 독립성 한계를 보고한다.
4. **수정**: REJECTED 항목은 같은 구현 워커에게 후속 Dispatch로 맡긴다. 모델이나 effort를 바꿔야 할 때만 정산·정리 후 새로 기동한다. 수정이 지적 항목에 한정되면 리뷰 워커의 후속 Dispatch로 그 항목만 다시 확인하고, 동작이 크게 바뀌었으면 다시 리뷰한다.
5. **통합**: 코디네이터가 워커 브랜치를 `epic/<N>`에 `--no-ff`로 병합하고 다음을 남긴다.
   - 워커 워크트리의 `state/validate/latest/*.log`를 `reviews/epic-<N>/logs/<story-key>-*.log`로 복사
   - 리뷰 결과를 `reviews/epic-<N>/<story-key>-review.md`에 저장하고, 리뷰 워커의 defer 항목과 spec 파일 frontmatter의 `deferred` 항목을 `_bmad-output/implementation-artifacts/deferred-work.md`에 추가
   - `sprint-status.yaml`의 Story 상태를 `done`으로 갱신
   - `reviews/epic-<N>/orca-runs.md`에 실행 기록 추가
   - 사용자가 push를 허용했으면 Story 브랜치와 `epic/<N>`을 push
6. **정리**: `worker_done`을 정산한 뒤 같은 터미널을 다음 Dispatch에 재사용하거나 `worker-release`한다. 워크트리는 로그를 옮긴 뒤 Orca가 지원하는 방법으로 정리한다.
7. **경계 확인**: 다음 Story를 띄우기 전에 멈춤 파일과 사용량 가드(켰으면)를 확인하고(§8.1), 인계 주기가 찼으면 새 Story를 띄우지 않고 인계한다(§11).

`sprint-status.yaml`은 코디네이터만 고친다. `bmad-build-auto`는 이 파일을 건드리지 않는다. Epic을 시작할 때 `epic-<N>`을 `in-progress`로 바꾼다. Story 상태는 구현 워커를 띄울 때 `in-progress`, 구현 워커가 성공을 보고하면 `review`, 리뷰 승인 후 `epic/<N>`에 병합하면 `done`으로 바꾼다.

시작 프롬프트의 진행 범위가 "처음 N개 Story"처럼 일부로 정해져 있으면 그 Story들을 통합한 뒤 멈추고 §10 형식으로 보고한다(시험 운영). Epic의 모든 Story가 통합되면 `epic/<N>`에서 전체 validate와 smoke를 실행한다. 통과하고 failed·skipped·보류 Story가 없을 때만 Epic 완료로 보고한다. `develop` 병합과 `epic-<N>` 키의 done 처리는 사용자가 승인한 경우에만 하며, 판정 기준은 `workflow-rules.md`를 따른다.

## 6. 병렬과 소유권

- 기본 동시 워커는 1명이다. 서로 독립된 작업이면 최대 2명까지 두며, 리뷰 워커도 이 수에 들어간다.
- 같은 Epic 안의 연쇄 Story는 순서대로 진행한다. `bmad-build-auto`가 같은 Epic에서 `status: done`인 직전 spec의 Code Map·Design Notes·Spec Change Log를 읽기 때문이다. 위험도가 낮은 연쇄 Story는 해제 조건을 "선행 Story 커밋 + validate-quick 통과"로 두어, 선행 Story의 리뷰와 다음 Story의 구현을 겹칠 수 있다. 위험도가 높으면 선행 Story가 통합된 뒤 시작한다.
- 병렬 작성자는 별도 워크트리와 겹치지 않는 수정 범위를 갖는다. `sprint-status.yaml`, 공용 설정, DB·외부 서비스 같은 공유 상태는 코디네이터가 소유한다.
- 워커 워크트리에서 필요한 명세와 기준 커밋이 실제로 보이는지 확인한다. 사용자의 기존 변경을 지우거나 임의로 커밋·stash하지 않는다.
- 워커 수를 채우려고 작업을 만들지 않는다. 비율을 맞추려고 구현 중간에 모델을 바꾸거나 같은 범위를 경쟁 구현시키지 않는다.
- API·타입·권한·데이터 계약이 바뀌면 영향받는 Story를 멈추고 계획·계약·검증을 갱신한다. 바뀌지 않은 계획은 다시 만들지 않는다.

## 7. 감독과 복구

- 대기 시간은 코디네이터 셸 도구의 최대 실행 시간보다 조금 짧게 둔다. Claude Code는 Bash 도구 timeout을 600000으로 주고 `--timeout-ms 540000`을, 한도를 모르면 300000을 쓴다. 빈 대기마다 코디네이터 추론이 한 번씩 들므로 짧은 대기를 반복하지 않는다.
- 빈 대기가 세 번 이어지면 `worker-list`로 실제 진전을 확인한다. 10분 넘게 진전이 없으면 원인을 확인한다. timeout·연결 끊김·생존 불명확을 종료로 보고 재기동하거나 같은 범위를 중복 작성시키지 않는다. 소유가 확인된 워커만 지원되는 방법으로 멈춘다.
- Delivery의 메시지를 모두 처리하고 실제 증거를 확인한 뒤 ack한다. 유효한 `worker_done` 정산을 수동 completed로 덮지 않는다. 워커의 성공 보고와 최종 인수는 다르다.
- 기동 실패는 설치 버전 가이드의 복구 참조(recovery-and-cleanup)부터 확인한다. `release_pending`·`release_unknown`은 영수증의 복구 절차를 따르고, 터미널 강제 종료나 `reset --all`로 대신하지 않는다.
- 워커 질문은 Orca `ask`로 받는다. 계약에 답이 있으면 해당 항목을 가리켜 답하고, 제품 결정이면 사용자에게 선택지와 함께 묻는다.

## 8. 예산·재시도·중단

사용자가 따로 정하지 않으면 아래 값을 쓴다. 초기값이며 `orca-runs.md` 기록으로 조정한다.

| 항목 | 기본값 |
|---|---|
| 동시 워커 | 1명. 독립 작업이면 최대 2명 (리뷰 워커 포함) |
| Story당 추가 세션 | 12개 (구현 1 + build-auto 서브에이전트 5[구현 1·내장 리뷰 4] + 리뷰 1 + code-review 내부 리뷰어 4 + 예비 1). 한 번에 통과한 경우의 값이다. 같은 터미널의 후속 Dispatch는 세지 않음. 초기 가설이며 첫 Epic의 `orca-runs.md`로 측정해 조정한다 |
| Story당 시간 | 90분. 연속 무진전 확인 기준 10분 |
| 같은 원인 재시도 | 워커 안에서 수정 시도 3회(TDD RED 제외) + 승인된 대체 모델로 재배정 1회 |

- `bmad-build-auto`는 안에서 수정 루프를 최대 5회까지 돈다. 이 루프는 스킬이 정한 한도라 워커의 「같은 원인 3회」에 세지 않고, 스킬이 `blocked`로 끝난 것이 실패 1회다. 루프를 다 쓰면 구현 서브에이전트 6회와 내장 리뷰어 24개까지 늘 수 있으므로 위 세션 수는 최악의 값이 아니다. 이때는 Story당 시간 예산(90분)이 먼저 막는다.
- 예산을 넘을 것 같으면 그 Story만 멈추고 진행 상태와 근거를 보고한다. 새 Run이나 작업 분할로 Story 예산과 재시도 횟수를 초기화하지 않는다.
- 실패는 명세 / 환경·도구 / 컨텍스트 / 추론 / 한도로 분류한다. 환경·권한 오류에 모델이나 effort를 올려 재시도하지 않는다. 재배정할 때는 실패 근거와 바뀐 부분을 넘기고 처음부터 다시 조사시키지 않는다.
- 재배정도 실패하면 `agent-execution-rules.md`의 실패 처리대로 `state/epic-<N>-progress.json`에 기록하고, 그 Story와 의존 Story를 보류한다.
- 한도·접근 오류가 나면 커밋·보고 직후 같은 안전한 경계에서 코드·계약·검증 상태를 보존하고 승인된 대체 모델로 넘긴다. 예산 상한에 도달하면 새 호출을 멈추고, 멈춤·정산이 확인되지 않으면 실제 상태와 증거를 보존해 보고한다.

### 8.1 사용량 가드 (선택)

기본은 꺼져 있다 — 사용량을 계산하지 않고 한도 오류가 나면 대체 모델로 넘긴다. 하루에 쓸 양을 나눠 쓰고 싶거나, 한도가 바닥나기 전에 멈추고 싶으면 사용자가 켠다. 한도는 계정 단위라 프로젝트가 아니라 사용자 폴더에 둔다.

- **켜기**: `templates/orchestrator-limits.json`을 `~/.orchestrator/limits.json`으로 복사해 숫자를 고친다. 키를 빼면 그 가드만 꺼진다. Claude 값을 읽으려면 한 번 `node scripts/orca/install-statusline-tee.mjs`로 statusline에 기록 장치를 건다(되돌리기 `--uninstall`, 원래 statusline은 그대로 돈다).
- **읽기**: `node scripts/orca/claude-usage.mjs`(종료 0 off·ok / 3 stop / 2 unknown), `node scripts/orca/codex-usage.mjs`(작은 탐침 호출 1회, 종료 0 off·ok·light·exhausted / 2 unknown). Gemini는 사용량을 읽을 곳이 없어 가드가 없다.
- **언제 재나**: Epic 시작, 새 워커를 띄우기 전(새 Story·재배정), 인계 전(§11 스크립트가 직접 잰다).
- **판정에 따라**:
  - Claude `stop`: 어떤 새 워커도(다음 Story, 리뷰, 수정) 띄우지 않는다. 이미 돌고 있는 워커는 `worker_done`까지 받아 정산한다. 리뷰 승인까지 끝난 Story만 통합하고, 구현 커밋은 있지만 리뷰를 받지 않은 Story는 브랜치와 상태(`review`)를 그대로 보존한다. 계획·기록·진행 파일(무인이면 digest)에 「Claude 사용량 멈춤 — n% ≥ 한도 m%, 재개 지점(Story와 단계)」을 적어 커밋한 뒤 인계하지 않고 보고로 끝낸다. 사용자가 한도를 올리거나 초기화 뒤 「이어서 하기」로 재개한다.
  - Codex `light`: 새로 시작하는 Story 중 구현 모델이 GPT-6.1 Sol인 것을 승인된 대체 모델로 바꿔 띄운다(사전 승인된 대체 모델 전환 — 기록). 작성 회사가 바뀌므로 리뷰 모델은 [모델 배정 규칙](model-routing-rules.md) 4번 표에서 **실제 작성 모델 기준으로 다시 고른다**(작성과 리뷰가 같은 회사가 되지 않게). 다시 고른 리뷰 모델이 GPT-6.1 Sol이면 `light`에서는 그대로 쓴다. 진행 중인 Story의 구현 워커는 바꾸지 않는다.
  - Codex `exhausted`: Codex를 부르지 않는다. 구현은 대체 모델로 바꾸되, 바뀐 작성 모델의 리뷰가 4번 표에서 GPT-6.1 Sol이거나 원래 GPT-6.1 Sol이 리뷰할 Story는 다른 회사 리뷰를 잃으므로 보류하고 기록한다(리뷰 약화는 승인 대상이다). 초기화 뒤 재개한다.
  - `unknown`: 직전 판정을 잇는다. Claude는 스크립트가 마지막 판정(`~/.orchestrator/claude-verdict-last.json`)을 이어 직전이 stop이면 stop을 낸다. Codex는 코디네이터가 `orca-runs.md`에 적은 직전 판정을 쓴다. 처음부터 unknown이면 가드가 없는 것처럼 진행하고 기록한다.
  - 한도 파일이 깨졌으면(JSON·값 오류) Claude 판정은 stop이다 — 가드를 켜려 한 것이니 고칠 때까지 멈춘다. `off`: 가드가 꺼져 있다 — 아무것도 바꾸지 않는다.
- **멈춤 파일**: `~/.orchestrator/STOP`(모든 코디네이터) 또는 `STOP-<저장소 이름>`(그 저장소만)이 있으면 지금 Story의 통합까지 끝내고 인계하지 않고 멈춘다. 한도 파일과 상관없이 동작한다. 사용자가 파일을 지우고 「이어서 하기」로 재개한다.
- 사용량 값은 계정 전체 값이다. 같은 계정을 다른 PC·세션에서 쓰면 그 사용분도 들어간다. 한 PC에서 여러 Claude 계정을 번갈아 쓰면 마지막으로 statusline을 그린 세션의 계정 값이 남는다.

## 9. 완료 판정

- 요구 ID → Story → 실제 diff → 검증 증거가 이어져야 한다. 테스트 통과나 워커 요약만으로 성공을 판정하지 않는다. 불명확한 계약이나 위험 지점은 실제 코드로 확인한다.
- 리뷰 결론은 [REVIEW.md](../../REVIEW.md) 기준을 따르고, 결함은 위치·근거·영향·필요 수정으로 기록한다. 모델이 다르다는 사실을 정확성 보장으로 보지 않는다.
- 위험 높음 Story는 역량이 확인된 작성자(Opus 5.5 또는 GPT-6.1 Sol)와 다른 회사의 독립 리뷰어가 필요하다. 배정안에 Epic 통합 리뷰(Opus 5.5 / xhigh)가 승인돼 있으면 Epic 완료 보고 전에 위험 Story들의 통합된 변경을 리뷰한다. 코디네이터가 Sonnet 5.5일 때 최종 판단을 보완하기 위해서다.
- 린트·타입·테스트·빌드는 셸 스크립트로 확인한다. 명령 실행만을 위해 LLM 세션을 추가하지 않는다. 통과시키려고 테스트를 완화하지 않는다.
- 완료 조건: 필수 요구 충족, 허용되지 않은 회귀 없음, 보안·데이터 불변 조건 충족, 범위 밖 변경·불필요한 파일·의존성·추상화 없음, 필수 증거가 최종 커밋에 대응. 기존 실패·검증 불가·남은 위험은 구분해서 보고한다.

## 10. 기록과 보고

- `reviews/epic-<N>/orca-runs.md`에는 Story마다 승인된 모델·effort, 실제 적용값(`launch.effective`), 워커 브랜치와 커밋, 리뷰 모델과 결과(REJECTED 횟수), 재시도·대체 모델 전환과 이유, 시작·종료 시각을 적는다. 비용은 계산하지 않는다. 사용량 가드(§8.1)를 켰으면 그 판정과 그에 따라 바꾼 것만 적는다.
- 최종 보고는 결과부터 쓴다: 완료·보류 Story, 커밋, 검증 로그 경로, Story별 승인·실제 모델과 effort, 배정안과 달라진 부분과 이유, 재시도, 남은 위험. 마지막에 `orca-runs.md`의 칸별 요약과 조정 제안을 모델 배정 규칙의 「기록과 조정 제안」 기준으로 붙인다. 시험 운영으로 멈출 때도 같은 형식으로 보고한다. 비교 근거 없이 비용 절감·품질 향상·시간 단축을 주장하지 않는다.
- 이어서 할 때는 `plans/epic-<N>-orca.md`, `orca-runs.md`, `state/epic-<N>-progress.json`, Git 상태를 대조해 멈춘 지점부터 진행한다. 승인된 배정안은 그대로 쓰고, 남은 Story의 배정을 바꿔야 하면 바꿀 행만 다시 승인받는다. 끝난 Story를 상태 확인 목적으로 다시 리뷰·검증하지 않고, 원인을 해결하지 않은 채 전체 계획을 다시 실행하지 않는다.
- push·merge·배포·운영 데이터 변경·새 과금·외부 발송은 사용자가 준 승인 범위 안에서만 한다. 승인되지 않은 행동만 보류하고, 검토 가능한 코드·검증·계획은 먼저 완성한다.
- 무인 진행(§4.2)이면 최종 보고와 멈출 때의 보고를 `owner-digest.md`의 미확인 항목 수와 경로로 시작한다. 무인으로 정한 것은 그 파일이 사람에게 닿는 유일한 경로다.

## 11. 코디네이터 인계

코디네이터는 매 턴 그동안의 맥락을 다시 읽는다. Epic 내내 한 세션으로 돌면 비용이 계속 커지고(실측: 한 세션이 한 묶음의 마감에 209턴·약 630만 토큰) 앞 판단을 잘못 기억한다. 그래서 Story 몇 개마다 새 세션에 넘긴다. 사람이 「이어서 하기」를 치던 일을 `scripts/orca/session-rollover.mjs`가 대신한다.

- **언제**: 계획의 「인계 주기」(기본 Story 3개 통합마다)가 찼을 때, 안전한 경계에서만 한다.
  - 실행 중인 워커가 없다(모든 `worker_done`을 정산했고 터미널을 정리했다).
  - 마지막 Story가 `epic/<N>`에 통합·커밋됐고, 계획·`orca-runs.md`·진행 파일(무인이면 digest)이 갱신·커밋됐다.
  - Epic 통합 검증(validate + smoke)과 최종 보고는 인계하지 않고 그 세션이 끝낸다.
- **인계문**: `templates/orca-handoff.md`로 `state/orca/handoff/epic-<N>-<k>.md`를 쓴다. 60줄 이내. 파일에 이미 있는 것은 경로만 적고, 앞 세션의 판단과 진행 중 사정만 쓴다.
- **띄우기**: 코디네이터가 도는 Orca 체크아웃에서 실행한다(Orca에 등록되지 않은 경로는 탭을 만들 수 없다).

  ```sh
  node scripts/orca/session-rollover.mjs --worktree <코디네이터 체크아웃 절대 경로> \
    --brief-file state/orca/handoff/epic-<N>-<k>.md --title "<프로젝트> 코디네이터 Epic <N> #<k>" \
    --chain <n>/<max> --model <코디네이터 모델 ID> --effort <코디네이터 effort — Sonnet 5.5는 high, Opus 5.5는 medium> --run-id <Orca Run ID> [--unattended] [--skip-permissions]
  ```

  `--chain`은 필수다. `n`은 이 Epic의 몇 번째 인계인지(인계문에서 이어받아 +1), `max`는 Epic 시작 때 `ceil(Story 수 / 인계 주기) + 2`로 정해 계획에 적는다. `--unattended`는 무인 시스템 프롬프트를 붙이고, `--skip-permissions`는 권한 확인을 생략한다 — 둘은 따로 고른다(§4.2 「권한 확인 창」). 스크립트는 멈춤 파일과 사용량 가드를 탭을 만들기 전과 첫 전송 직전에 두 번 확인하고, Orca 터미널 목록을 읽지 못하면(열린 후임을 확인할 수 없으면) 인계하지 않는다. 모델은 이 세션과 같은 코디네이터 모델이다(§1). 스크립트는 후임의 배너 모델을 대조하고, 멈춤 파일과 사용량 가드(켰을 때)를 확인한 뒤 인계 줄을 보낸다.
- **종료 코드에 따라**: 0이면 3줄 보고(끝난 Story, 후임 탭 제목, 체인 n/max — 무인이면 digest 미확인 수)를 쓰고 턴을 끝낸다. 자기 탭은 닫지 않는다(마지막 보고가 화면에 남게 — 후임이 닫는다). 4(체인 상한)·10(멈춤 파일)·11(Claude 사용량)은 다시 시도하지 않고 보고로 끝낸다. 5는 이미 인계된 것이라 다시 띄우지 않는다. 그 밖(6·7·8·9)은 한 번만 다시 시도하고, 또 실패하면 보고로 끝낸다(탭을 여러 개 띄우지 않는다).
- **후임이 할 첫 일**: 인계문을 끝까지 읽고 → `orca orchestration run-use --id <Run ID>`로 같은 Run에 붙고 → 앞 탭을 `node scripts/orca/session-rollover.mjs --close-predecessor <handle>`로 닫되 이 명령은 **백그라운드로** 띄운다(앞 탭이 끝날 때까지 최대 30분 기다린다) → §10 「이어서 할 때」대로 진행한다. 끝난 Story를 다시 리뷰·검증하지 않는다.
- **진행 방식은 그대로 넘긴다.** 승인 대기면 후임도 재승인 대상 변경을 사람에게 묻고, 무인이면 `--unattended`로 띄워 §4.2를 잇는다.
- **Orca 밖**(`ORCA_TERMINAL_HANDLE`이 없다)이면 인계문만 쓰고 보고로 끝낸다 — 사람이 「이어서 하기」에 그 인계문 경로를 붙여 새 코디네이터를 연다.
- 시험은 `--dry-run --no-predecessor`로만 한다(탭을 열어 계산 문제를 보내고, 답 `ROLLOVER-5555`를 화면에서 확인한 뒤 닫는다).
- 기록은 `state/orca/rollover.jsonl`(Git 제외)에 스크립트가 남긴다.

## 근거

Orca 명령과 동작의 기준은 설치된 Orca의 `orca skills get orchestration` 결과다. 이 규칙의 결정 배경과 참고 자료는 [ADR-002](../decisions/ADR-002-orca-orchestration.md)에 있다.
