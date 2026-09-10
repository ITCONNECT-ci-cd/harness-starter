# Claude Fable 5 프롬프팅 가이드 반영 — 2026-09-10

Anthropic의 [Claude Fable 5 프롬프팅 가이드](https://platform.claude.com/docs/ko/build-with-claude/prompt-engineering/prompting-claude-fable-5)를 하네스에 반영했습니다. 같은 날 적용한 Codex 쪽 [Astra / High 모델 배정](2026-09-10-astra-high-model-routing.md)과 짝을 이루는 변경이며, Claude가 담당하는 Phase B·C가 대상입니다.

가이드가 요구하는 마이그레이션 항목은 다섯 가지입니다. effort 기본값 재설정, 장황함 억제, 진행 보고를 도구 결과에 묶기, 과규범적 스킬 완화, 추론 재현 지시 감사.

수정 파일 목록과 검증 근거는 [변경 파일 상세](2026-09-10-claude-fable5-changed-files.md)에 있습니다.

## 추가한 규칙

| 규칙 | 파일 | 이유 |
|---|---|---|
| 근거 기반 완료 보고 | `docs/agents/agent-execution-rules.md` 검증과 실패 처리 | Phase A가 Story 여러 개를 무인으로 돌기 때문에 조작된 상태 보고의 노출면이 여기다. 각 주장을 이번 세션의 도구 결과에 대응시키고, 근거 없는 항목은 미검증으로 표시한다 |
| 보고와 소통 | `docs/agents/agent-execution-rules.md` 새 절 | 도구 호출 수백 번 뒤의 최종 보고가 사용자의 첫 화면이다. 결과를 먼저 쓰고, 압축이 아니라 선별로 줄이고, 작업 중 만든 약어를 최종 보고에서 뺀다 |
| 약속으로 턴 종료 금지 + 비대화형 실행 기준 | `docs/agents/agent-execution-rules.md` 자율 진행과 질문 | `scripts/run-epic.sh`·CI 같은 무인 경로에서 "이제 …하겠다"로 끝나면 작업이 멈춘다 |
| 구현 범위 | `docs/agents/coding-rules.md` 새 절 | 기존 "story와 관련 없는 리팩터링 금지"는 범위는 막지만 과잉 설계(가상의 미래 요구를 위한 추상화, 일어날 수 없는 경우의 방어 코드, 일회성 헬퍼)는 막지 못했다. 높은 effort에서 가장 자주 나타나는 패턴이다 |
| Claude Code 측 모델·effort | `docs/agents/model-routing-rules.md` 새 절 | 기존 모델 기준이 전부 `.codex/config.toml` 전용이라 Phase B·C에 기준이 없었다. 일반 작업 Opus 5 / high, 어려운 분석 Fable 5.1 / xhigh, 조사·문서 Sonnet 5 / medium |
| 보안 작업 중 모델 거부 처리 | `docs/agents/security-rules.md` 새 절 | 방어 목적 보안 리뷰도 안전 분류기를 건드릴 수 있다. 거부된 항목을 통과로 처리하지 않는다 |
| 하네스 유지보수 금지 사항 | `docs/agents/agent-execution-rules.md` 새 절 | 현재 위반은 없다. 사고 과정 재현 지시(거부 유발)와 잔여 토큰 노출(작업 축소 유발)이 나중에 추가되는 것을 막는 회귀 방지 규칙이다 |

Claude용 역할 프로필 파일(`.claude/agents/`)은 만들지 않았습니다. 실행 설정이 두 벌이 되고, Claude 세션은 사람이 직접 시작하므로 자동 로딩의 이점이 없습니다. 세션 모델은 `/model`로 고르고 하위 에이전트 모델은 생성 시 지정합니다. Claude Code의 기본 effort가 `xhigh`이므로, 표의 `high`는 명시하지 않으면 적용되지 않는다는 점을 규칙에 함께 적었습니다.

## 뺀 규칙

가이드는 "짧은 간결성 지시가 각 패턴을 나열하는 것만큼 효과적"이며 이전 모델용의 과규범적 지시는 오히려 품질을 떨어뜨린다고 밝히고 있습니다. 이에 따라 아래를 정리했습니다.

- `README.md`의 Phase A·B·C 완료 보고 지시에서 항목 열거를 뺐습니다. Phase C는 7개 항목을 나열하고 있었습니다. 결과 우선 + 근거 연결 지시로 대체했습니다.
- `CLAUDE.md`의 Build/Test 절에서 검증 진입점·재개 옵션·로그 경로·출력 모드·`harness.validate.json` 계약 7줄을 뺐습니다. `AGENTS.md`의 Validation과 `docs/agents/testing-rules.md`의 실행 명령에 같은 내용이 있고 둘 다 매 세션 @import되므로 3중으로 로드되고 있었습니다. 참조 한 줄로 대체했습니다.
- `docs/agents/agent-execution-rules.md`의 "결과는 한국어로 …간결하게 설명한다" 한 줄은 새 「보고와 소통」 절로 옮겼습니다.

## 조정한 규칙

- `REVIEW.md` §2의 에러 처리 항목에 "경계(사용자 입력, 외부 호출)" 한정을 넣었습니다. 그대로 두면 리뷰어가 내부 코드까지 방어 코드를 요구하는 근거로 읽혀 새 구현 범위 규칙과 어긋납니다.
- `REVIEW.md` §7의 "불필요한 복잡성"에 구체적 판단 기준(요청 범위를 넘는 추상화, 일회성 헬퍼, 쓰이지 않는 하위 호환 shim)을 붙였습니다.

## 바꾸지 않은 것

- **BMAD 스킬 번들** — 가이드는 과규범적 스킬의 리팩터링을 권하지만, `.claude/skills/`와 `.agents/skills/`는 byte 동기화를 `harness-self-test`가 검증하고 `CLAUDE.md`가 임의 수정을 금지합니다. 완화는 `agent-execution-rules.md`의 「BMAD에 적용하는 Harness 기준」 표에 항목을 더하는 기존 방식이 맞습니다.
- **위임 기준** — 가이드는 병렬 서브에이전트 확대를 권하지만, 현재의 보수적 위임 기준은 파일 소유권 충돌과 검증 책임 일원화를 위해 의도적으로 선택된 제약입니다. 규칙을 뒤집기 전에 Phase B·C에서 순차 처리가 실제 병목인지 근거가 필요합니다.
- **중간 검증자 서브에이전트** — 가이드가 권하는 "별도 컨텍스트 검증자"는 Phase B의 3층 병렬 리뷰(Blind Hunter / Edge Case Hunter / Acceptance Auditor)로 이미 구현돼 있습니다. Story 단위 중간 검증은 Phase A(Codex 담당) 변경과 맞물리므로 이번 범위에서 제외했습니다.
- **메모리 시스템** — `feedback-rules.md`(active 10개 상한, source incident id, 2 Epic 무재발 시 retire) + `feedback/incidents/` + `state/learning-loop.json`이 가이드의 메모리 권고를 이미 구현하고 있습니다. 승격 정책은 가이드보다 앞서 있습니다.

## 함께 고친 것 — 검증 진입점의 OS 중립화

Fable 5 반영과 별개로 발견한 결함입니다. `feedback-rules.md` 1번 규칙이 "Windows용 entrypoint는 native PowerShell"을 요구하는데, 정작 아래 지점들이 bash 경로를 단정하고 있었습니다. 이 저장소의 주 셸이 Windows PowerShell이므로 Phase B·C에서 그대로 실행되면 실패합니다.

| 위치 | 이전 | 이후 |
|---|---|---|
| `AGENTS.md` Phase B 시작 루틴 5 | `./scripts/validate.sh` + `./scripts/smoke.sh` | OS/셸별 진입점 2줄로 분기 |
| `AGENTS.md` Validation 출력 모드·smoke | bash 형태만 | PowerShell 형태 병기 |
| `CLAUDE.md` 역할 2 오류 수정·완료 | `./scripts/validate.sh`, `+ smoke.sh` | OS/셸에 맞는 진입점 |
| `REVIEW.md` 판정 기준 | "validate.sh 통과 / 실패" | "현재 OS/셸에 맞는 전체 validate 통과 / 실패" |

승격 대상도 함께 고쳤습니다. `workflow-rules.md` Phase C 7단계는 blocking check를 `scripts/validate.sh`에만 추가하라고 지시하고 있었습니다. 한쪽 진입점에만 넣으면 다른 OS에서 승격이 적용되지 않아 회고의 결과가 절반만 반영됩니다. 같은 문장이 반복되는 `workflow-rules.md` 9번·feedback-rules 운영 규칙과 `docs/agents/feedback-rules.md` 헤더도 양쪽 진입점 기준으로 맞췄습니다.

`docs/agents/testing-rules.md`의 4층 검증 표와 `feedback-rules.md`의 예시 주석 블록에 남은 `validate.sh` 표기는 특정 실행 지시가 아니라 검증 단계를 가리키는 이름이라 그대로 뒀습니다.

## 정정한 사실 기술

`docs/agents/testing-rules.md`가 "validate.sh는 `--no-threads`(Vitest) 또는 `--runInBand`(Jest)로 순차 실행합니다"라고 적고 있었습니다. 확인해 보니 **Vitest는 두 진입점 모두 `npx vitest run`으로 호출하므로 기본 병렬 실행입니다.** Jest만 `--runInBand`로 순차 실행합니다.

그대로 두면 위험한 기술입니다. 바로 위에 있는 테스트 격리 규칙(포트 `0`, `mkdtemp`, 트랜잭션 롤백)이 "어차피 순차라 안 걸린다"로 읽히는데, Vitest 프로젝트에서는 그 격리 규칙이 유일한 안전장치입니다. 실제 동작을 적고, 순차 실행이 필요하면 `harness.validate.json`의 `commands.test` 또는 `HARNESS_TEST_CMD`로 `npx vitest run --no-file-parallelism`을 지정하도록 안내했습니다.

검증 스크립트 자체는 바꾸지 않았습니다. 문서를 실제 동작에 맞춘 것이고, 순차 실행으로 전환할지는 별도 판단입니다.

## 확인한 것

- **추론 재현 지시 감사** — `reasoning_extraction` 거부를 유발할 수 있는 "사고 과정을 응답에 재현·전사하라"는 지시를 하네스 문서와 `.claude/skills/`, `.agents/skills/` 전체에서 검색했고 한 건도 없습니다. 검색에 걸린 `reasoning` 문자열은 전부 "결정 근거를 문서에 기록하라"는 다른 의미였습니다.
- **컨텍스트 예산 노출** — hook·statusline·프롬프트 어디에도 잔여 토큰 수를 모델에게 보여주는 경로가 없습니다.

두 항목 모두 현재 조치가 필요 없어 「하네스 유지보수 금지 사항」으로만 못박았습니다.
