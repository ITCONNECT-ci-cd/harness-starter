# Orca 개발 규칙

Orca 코디네이터가 BMAD Epic을 Story 단위로 워커에게 맡겨 개발할 때의 기준이다. 코디네이터는 이 문서를, 워커는 `AGENTS.md`의 「Orca 워커 규칙」과 코디네이터가 보낸 계약을 따른다. 모델·effort는 [모델 배정 규칙](model-routing-rules.md), 승인 범위·실패 횟수·보고의 공통 기준은 [에이전트 실행 규칙](agent-execution-rules.md)을 적용한다.

목표는 요구사항 충족·보안·회귀 방지를 지키면서, 작업마다 필요한 만큼의 모델과 추론 수준을 써서 비용과 시간을 줄이는 것이다. 코디네이터가 Story별 모델 배정안을 제안하고 사용자가 승인한다. 배정 기준은 실측으로 검증된 최적값이 아니라 초기 운영 가설이며, `reviews/epic-<N>/orca-runs.md`에 쌓인 기록으로 Phase C에서 고친다. 절감 효과를 추측해서 보고하지 않는다.

## 1. 역할

| 역할 | 맡는 일 | 하지 않는 일 |
|---|---|---|
| 사용자 | 목표, 걱정되는 위험, 모델별 계정, push·merge 승인 범위를 주고 모델 배정안을 승인한다 | 워커 기동·감독 |
| 코디네이터 | 시작 확인, 계획과 모델 배정안 작성, 워커 기동, 질문 처리, 증거 확인, 통합(병합·상태 갱신·기록), 최종 판정 | 일상적인 조사·구현·수정, 승인 없는 배정 변경 |
| 구현 워커 | Story 하나의 story 파일 생성, TDD 구현, validate-quick, 자기 브랜치에 커밋 | push·merge, 다음 Story 시작 |
| 리뷰 워커 | 작성자와 다른 회사 모델로 `bmad-code-review` 실행 | 코드·story 파일·상태 파일 수정 |

- 코디네이터 세션은 Sonnet 5.5 / medium으로 연다. 위험 높음 Story가 Epic의 절반 이상이면 Opus 5.5 / medium으로 연다 (모델 배정 규칙의 「코디네이터」).
- 코디네이터는 다음 조건을 모두 만족하는 수정만 직접 한다: 위험 영역(인증·권한·결제·DB 마이그레이션·트랜잭션·동시성) 밖이고, 한 파일 안의 작은 수정(대략 20줄 이내)이며, 새 동작을 추가하지 않는다. 문서·설정·상태 파일 갱신, 기계적인 병합 충돌 해결, 오타 수준의 리뷰 지적이 여기에 해당한다. 직접 수정한 뒤에는 validate-quick을 실행한다.
- 그 밖의 구현은 워커에게 맡긴다. 워커가 하나뿐이라는 이유로 코디네이터가 구현을 떠맡지 않는다.
- 코디네이터를 중간에 바꿔야 하면, 설치된 Orca에 검증된 인계 기능이 있을 때만 쓴다. 없으면 현재 코디네이터를 안전한 경계에서 끝내고 README의 「이어서 하기」 프롬프트로 새 코디네이터를 시작한다.

## 2. 시작 확인

확인 결과는 `state/orca/env.json`에 저장해 재사용한다. 파일이 없거나 Orca·에이전트 CLI의 버전이 바뀌었을 때만 다시 확인한다.

1. **Orca**: `orca status --json`, `orca skills get orchestration`을 읽는다. 모델·effort·재사용 규칙이 필요하면 `--reference references/coordinator-loop.md`도 읽는다. 참조를 지원하지 않으면 `--full`을 한 번 읽는다. 설치된 버전의 가이드가 이 문서보다 우선하며, 지원되지 않는 명령이나 플래그를 추측해서 쓰지 않는다.
2. **워커 기동 옵션**: `worker-start`가 `--model`·`--effort`를 지원하는지 가이드와 `--help`로 확인한다. `--effort`는 `--model`과 함께, 그 모델이 지원하는 수준만 쓴다. `--terminal` 재사용과 두 override를 함께 쓰지 않는다.
3. **모델 ID**: 모델 배정 규칙의 네 논리 모델을 실제 등록 ID·에이전트·계정에 대응시킨다. Antigravity는 `agy models`로 확인한다. 같은 모델이라도 호출 경로가 다르면 계정·설정이 같다고 가정하지 않는다.
4. **저장소**:
   - 루트 `orca.yaml`이 없거나 `scripts.setup`이 현재 스택의 의존성 설치와 맞지 않으면 `templates/orca.yaml`을 바탕으로 만들고 커밋한다. 새 워크트리에는 설치된 패키지가 없어서 이 설정이 없으면 워커의 검증이 바로 실패한다.
   - `git config core.hooksPath`가 `.githooks`가 아니면 `scripts/setup/install-git-hooks.sh`(Windows는 `.ps1`)를 실행한다. git hook은 Claude가 아닌 워커의 커밋에도 걸리는 유일한 검사다.
   - BMAD 스킬(`bmad-create-story`, `bmad-dev-story`, `bmad-code-review`)과 기획 산출물(architecture, epics, `sprint-status.yaml`)이 있는지 확인한다. 이 문서에 맞추려고 BMAD를 업그레이드하거나 상태 파일 체계를 옮기지 않는다.
   - Windows PowerShell이면 `./scripts/doctor.ps1`과 `./scripts/phase-a/preflight.ps1 -Epic <N>`을 실행한다.

`env.json`에는 확인 시각, 도구 버전, 논리 모델별 실제 ID·에이전트·계정 별칭·지원 effort만 적는다. 토큰·비밀값·이메일은 적지 않는다.

## 3. Epic 계획

- 기존 PRD·architecture·epics·`sprint-status.yaml`을 재사용한다. 실행할 때마다 전체 문서와 저장소를 다시 읽거나 새 전체 계획을 만들지 않는다. 대상 Story와 직접 의존하는 Story의 문서·코드만 확인한다.
- Epic을 시작할 때 `templates/orca-epic-plan.md`로 `plans/epic-<N>-orca.md`를 만든다. 이미 있으면 바뀐 행만 고친다.
- 계획에는 BMAD story 파일에 없는 실행 정보만 적는다: 승인된 모델 배정안(§4), 의존 Story와 해제 조건, 수정 범위와 금지 범위, 예산. 수락 기준·작업 목록·참고 자료는 story 파일에 두고 복사하지 않는다.
- 제품 의도나 필수 설계가 정해지지 않았으면 그 Story와 의존 Story만 보류하고 필요한 결정을 사용자에게 묻는다. 독립 Story는 계속 진행한다. BMAD의 네이티브 상태 스키마를 배정 변경용으로 편집하지 않는다.

## 4. 모델 배정과 승인

- Epic 계획을 만들 때 Story마다 [모델 배정 규칙](model-routing-rules.md)의 선택 방법으로 위험도와 작업 형태를 판정하고, 구현 모델·effort, 리뷰 모델·effort, 대체 모델을 정한다. 사용량과 한도는 계산하지 않는다.
- 워커를 띄우기 전에 배정안을 모델 배정 규칙 6번 형식의 표로 보여 주고 사용자의 OK를 기다린다. 답이 없으면 승인으로 보지 않는다. 기다리는 동안에도 워커 없이 할 수 있는 준비(시작 확인, `orca.yaml` 점검)는 진행한다.
- 승인된 배정안을 `plans/epic-<N>-orca.md`에 승인 날짜와 함께 기록하고 커밋한다. 이후 워커는 배정안의 모델·effort로만 기동한다.
- 승인 후 배정안과 다르게 해도 되는 경우는 두 가지뿐이다. 한도·접근 오류나 같은 원인 3회 실패로 승인된 대체 모델로 바꿀 때, 위험도가 계획보다 높게 드러나 리뷰를 위험 높음 기준으로 올릴 때다. 이때는 바꾼 사실과 이유를 `orca-runs.md`와 최종 보고에 적는다. 그 밖의 변경(배정안에 없는 모델, 구현 effort 상향, 리뷰 생략·약화, Story 추가·분할)은 다시 승인받는다.
- `worker-start`에는 항상 `--agent`, `--model`, `--effort`를 명시한다. 생략하면 `.codex/config.toml`이나 Claude Code 기본값(xhigh)으로 실행된다.
- 기동한 뒤 `launch.requested`와 `launch.effective`를 대조해 둘 다 `orca-runs.md`에 적는다. `/model` 메시지를 보낸 것만으로 모델이 바뀌었다고 보지 않는다. 실제 적용값이 배정안과 다르면 그 워커에게 일을 맡기기 전에 원인을 확인한다.
- 새 유료 API나 자동 초과 과금을 켜지 않는다. 대체 모델까지 막히면 그 Story만 보류하고 독립 Story를 진행한다.
- 네 모델을 매 Story에 모두 쓰거나 같은 비율로 맞추지 않는다.

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

1. **준비**: 선행 Story가 해제 조건을 충족했는지 실제 커밋과 검증 결과로 확인한다. `sprint-status.yaml`의 표시만 믿지 않는다. `templates/orca-worker-contract.md` 형식으로 계약을 채운다.
2. **구현**: 구현 워커 1명이 `bmad-create-story`로 story 파일을 만들고, 그 경로를 `bmad-dev-story`에 넘겨 TDD로 구현한다. 계약의 `VALIDATE_BASE_REF`로 validate-quick을 통과시킨 뒤 자기 브랜치에 커밋한다. story 생성과 구현을 한 워커에 묶는 이유는 create-story가 조사한 맥락을 구현에서 그대로 쓰기 때문이다.
3. **리뷰**: 리뷰 워커 1명이 작성자와 다른 회사의 모델로 `bmad-code-review`를 실행한다. 읽기만 하므로 가능하면 `--setup skip`으로 기동한다. BMAD가 띄우는 내부 리뷰어 3개는 이 Story의 세션 예산에 넣는다. 서브에이전트를 띄울 수 없으면 세 관점을 순서대로 검토하고 독립성 한계를 보고한다.
4. **수정**: REJECTED 항목은 같은 구현 워커에게 후속 Dispatch로 맡긴다. 모델이나 effort를 바꿔야 할 때만 정산·정리 후 새로 기동한다. 수정이 지적 항목에 한정되면 리뷰 워커의 후속 Dispatch로 그 항목만 다시 확인하고, 동작이 크게 바뀌었으면 다시 리뷰한다.
5. **통합**: 코디네이터가 워커 브랜치를 `epic/<N>`에 `--no-ff`로 병합하고 다음을 남긴다.
   - 워커 워크트리의 `state/validate/latest/*.log`를 `reviews/epic-<N>/logs/<story-key>-*.log`로 복사
   - 리뷰 결과를 `reviews/epic-<N>/<story-key>-review.md`에 저장하고, defer 항목은 `_bmad-output/implementation-artifacts/deferred-work.md`에 추가
   - `sprint-status.yaml`의 Story 상태를 `done`으로 갱신
   - `reviews/epic-<N>/orca-runs.md`에 실행 기록 추가
   - 사용자가 push를 허용했으면 Story 브랜치와 `epic/<N>`을 push
6. **정리**: `worker_done`을 정산한 뒤 같은 터미널을 다음 Dispatch에 재사용하거나 `worker-release`한다. 워크트리는 로그를 옮긴 뒤 Orca가 지원하는 방법으로 정리한다.

`sprint-status.yaml`은 코디네이터만 고친다. Epic을 시작할 때 `epic-<N>`을 `in-progress`로 바꾼다. Story 상태는 구현 워커를 띄울 때 `in-progress`, 구현 워커가 성공을 보고하면 `review`, 리뷰 승인 후 `epic/<N>`에 병합하면 `done`으로 바꾼다.

Epic의 모든 Story가 통합되면 `epic/<N>`에서 전체 validate와 smoke를 실행한다. 통과하고 failed·skipped·보류 Story가 없을 때만 Epic 완료로 보고한다. `develop` 병합과 `epic-<N>` 키의 done 처리는 사용자가 승인한 경우에만 하며, 판정 기준은 `workflow-rules.md`를 따른다.

## 6. 병렬과 소유권

- 기본 동시 워커는 1명이다. 서로 독립된 작업이면 최대 2명까지 두며, 리뷰 워커도 이 수에 들어간다.
- 같은 Epic 안의 연쇄 Story는 순서대로 진행한다. create-story가 직전 Story의 결과와 리뷰 피드백을 읽기 때문이다. 위험도가 낮은 연쇄 Story는 해제 조건을 "선행 Story 커밋 + validate-quick 통과"로 두어, 선행 Story의 리뷰와 다음 Story의 구현을 겹칠 수 있다. 위험도가 높으면 선행 Story가 통합된 뒤 시작한다.
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
| Story당 추가 세션 | 6개 (구현 1 + 리뷰 1 + BMAD 내부 리뷰 3 + 예비 1). 같은 터미널의 후속 Dispatch는 세지 않음 |
| Story당 시간 | 90분. 연속 무진전 확인 기준 10분 |
| 같은 원인 재시도 | 워커 안에서 수정 시도 3회(TDD RED 제외) + 승인된 대체 모델로 재배정 1회 |

- 예산을 넘을 것 같으면 그 Story만 멈추고 진행 상태와 근거를 보고한다. 새 Run이나 작업 분할로 Story 예산과 재시도 횟수를 초기화하지 않는다.
- 실패는 명세 / 환경·도구 / 컨텍스트 / 추론 / 한도로 분류한다. 환경·권한 오류에 모델이나 effort를 올려 재시도하지 않는다. 재배정할 때는 실패 근거와 바뀐 부분을 넘기고 처음부터 다시 조사시키지 않는다.
- 재배정도 실패하면 `agent-execution-rules.md`의 실패 처리대로 `state/epic-<N>-progress.json`에 기록하고, 그 Story와 의존 Story를 보류한다.
- 한도·접근 오류가 나면 커밋·보고 직후 같은 안전한 경계에서 코드·계약·검증 상태를 보존하고 승인된 대체 모델로 넘긴다. 예산 상한에 도달하면 새 호출을 멈추고, 멈춤·정산이 확인되지 않으면 실제 상태와 증거를 보존해 보고한다.

## 9. 완료 판정

- 요구 ID → Story → 실제 diff → 검증 증거가 이어져야 한다. 테스트 통과나 워커 요약만으로 성공을 판정하지 않는다. 불명확한 계약이나 위험 지점은 실제 코드로 확인한다.
- 리뷰 결론은 [REVIEW.md](../../REVIEW.md) 기준을 따르고, 결함은 위치·근거·영향·필요 수정으로 기록한다. 모델이 다르다는 사실을 정확성 보장으로 보지 않는다.
- 위험 높음 Story는 역량이 확인된 작성자(Opus 5.5 또는 GPT-6 Sol)와 다른 회사의 독립 리뷰어가 필요하다. 배정안에 Epic 통합 리뷰(Opus 5.5 / high)가 승인돼 있으면 Epic 완료 보고 전에 위험 Story들의 통합된 변경을 리뷰한다. 코디네이터가 Sonnet 5.5일 때 최종 판단을 보완하기 위해서다.
- 린트·타입·테스트·빌드는 셸 스크립트로 확인한다. 명령 실행만을 위해 LLM 세션을 추가하지 않는다. 통과시키려고 테스트를 완화하지 않는다.
- 완료 조건: 필수 요구 충족, 허용되지 않은 회귀 없음, 보안·데이터 불변 조건 충족, 범위 밖 변경·불필요한 파일·의존성·추상화 없음, 필수 증거가 최종 커밋에 대응. 기존 실패·검증 불가·남은 위험은 구분해서 보고한다.

## 10. 기록과 보고

- `reviews/epic-<N>/orca-runs.md`에는 Story마다 승인된 모델·effort, 실제 적용값(`launch.effective`), 워커 브랜치와 커밋, 리뷰 모델과 결과(REJECTED 횟수), 재시도·대체 모델 전환과 이유, 시작·종료 시각을 적는다. 사용량과 비용은 계산하지 않는다.
- 최종 보고는 결과부터 쓴다: 완료·보류 Story, 커밋, 검증 로그 경로, Story별 승인·실제 모델과 effort, 배정안과 달라진 부분과 이유, 재시도, 남은 위험. 비교 근거 없이 비용 절감·품질 향상·시간 단축을 주장하지 않는다.
- 이어서 할 때는 `plans/epic-<N>-orca.md`, `orca-runs.md`, `state/epic-<N>-progress.json`, Git 상태를 대조해 멈춘 지점부터 진행한다. 승인된 배정안은 그대로 쓰고, 남은 Story의 배정을 바꿔야 하면 바꿀 행만 다시 승인받는다. 끝난 Story를 상태 확인 목적으로 다시 리뷰·검증하지 않고, 원인을 해결하지 않은 채 전체 계획을 다시 실행하지 않는다.
- push·merge·배포·운영 데이터 변경·새 과금·외부 발송은 사용자가 준 승인 범위 안에서만 한다. 승인되지 않은 행동만 보류하고, 검토 가능한 코드·검증·계획은 먼저 완성한다.

## 근거

Orca 명령과 동작의 기준은 설치된 Orca의 `orca skills get orchestration` 결과다. 이 규칙의 결정 배경과 참고 자료는 [ADR-002](../decisions/ADR-002-orca-orchestration.md)에 있다.
