# 모델 배정 규칙

이 하네스가 쓰는 모델은 아래 네 개뿐이다. 모델과 effort의 기준은 이 문서 한 곳이며, 다른 운영 문서나 스크립트에 기본 모델을 따로 두지 않는다. 코디네이터는 이 문서의 선택 방법으로 Story별 배정안을 만들어 사용자 승인을 받은 뒤 워커를 띄운다(무인 진행이면 적용하고 기록한다 — [Orca 개발 규칙](orca-rules.md) §4.2). 사용량과 한도는 기본적으로 계산하지 않는다(선택 기능: 같은 문서 §8.1 사용량 가드). 표의 값은 운영 가설이며 `reviews/epic-<N>/orca-runs.md`의 기록으로 Phase C에서 고친다.

## 네 모델

| 모델 | 호출 경로 | 맡기는 일 | 맡기지 않는 일 |
|---|---|---|---|
| Gemini 3.8 Flash | Antigravity, Gemini CLI | 명세가 분명한 작은 구현·테스트, 코드 조사, 로그 분석 | 위험 높음 Story 작성, 리뷰, 코디네이터 |
| Sonnet 5.5 | Claude Code | 코디네이터, 일반 기능 구현, 일반 리뷰, 문서 작업 | 위험 높음 Story 작성 |
| GPT-6.1 Sol | Codex | 여러 파일 연계 구현, 리팩터링, 통합, 위험 변경 작성·리뷰 | 코디네이터 |
| Opus 5.5 | Claude Code | 설계 판단, 원인 분석, 위험 변경 작성·리뷰, BMAD 기획 | 정형 작업 (비용 대비 이득이 작음) |

- 이 네 모델 외의 모델을 배정하지 않는다. 이전 모델인 GPT-6 Sol은 Codex 목록에 남아 있어도 배정하지 않는다.
- GPT-6.1 Sol의 Codex 등록 ID는 `gpt-6.1-sol`이다(2026-09-30 Codex 모델 목록에서 확인). 설치된 Codex의 모델 목록에 없으면 Codex CLI를 업데이트한다.
- Gemini CLI와 Antigravity는 같은 모델을 부르는 경로이지 추가 모델이 아니다. 같은 모델이라도 경로·계정이 다르면 설정이 같다고 가정하지 않는다. Orca의 워커별 `--model` 지정은 에이전트마다 지원 여부가 다르므로(공개 가이드 기준 Antigravity는 지원), Flash를 워커로 부를 경로는 시작 확인에서 정한다.
- 논리 이름은 실행할 때 확인한 실제 등록 ID로 바꿔 쓰고 `state/orca/env.json`에 기록한다. 확인하지 않은 ID를 추측해서 쓰지 않는다.

## 선택 방법

코디네이터는 Epic의 Story 설명과 architecture를 읽고 Story마다 아래 1~5번을 정한다. 결과는 6번 형식으로 사용자에게 보여 주고 승인받는다.

### 1. 위험도

| 위험도 | 기준 |
|---|---|
| 높음 | 인증·권한·결제·개인정보·DB 마이그레이션·트랜잭션·동시성을 건드리거나, 실패하면 데이터 손실이나 보안 사고로 이어지는 변경 |
| 보통 | 위에 해당하지 않는 일반 기능 |
| 낮음 | 문서·설정·테스트 보강·표시 전용 UI처럼 실패 영향이 작고 되돌리기 쉬운 변경 |

파일 수가 아니라 명세 불확실성·결합도·실패 영향으로 판정한다. 의존성 버전 변경은 영향 범위를 확인해 판정한다. 판단이 갈리면 높은 쪽을 고른다.

### 2. 작업 형태

| 형태 | 기준 |
|---|---|
| 정형 | 명세와 수정 파일이 분명하고 기존 패턴을 따르는 작업 (CRUD 추가, 테스트 작성, 작은 버그) |
| 일반 | 한두 모듈 안의 새 기능 |
| 연계 | 여러 파일·모듈을 순서대로 바꾸는 작업, 리팩터링, 통합 |
| 설계 판단 | 명세가 불확실하거나 설계 결정을 포함하는 작업, 원인 불명 버그 |

### 3. 구현 모델과 effort

effort는 위험도로 정한다. 낮음은 medium, 보통은 high, 높음은 xhigh다. 모델은 아래 표로 고른다.

| 형태 \ 위험도 | 낮음 (medium) | 보통 (high) | 높음 (xhigh) |
|---|---|---|---|
| 정형 | Gemini 3.8 Flash | Gemini 3.8 Flash | GPT-6.1 Sol |
| 일반 | Sonnet 5.5 | Sonnet 5.5 | Opus 5.5 |
| 연계 | GPT-6.1 Sol | GPT-6.1 Sol | GPT-6.1 Sol |
| 설계 판단 | Opus 5.5 | Opus 5.5 | Opus 5.5 |

### 4. 리뷰 모델과 effort

리뷰는 작성자와 다른 회사의 모델이 하고, effort는 구현과 같이 Story의 위험도를 따른다. Anthropic(Sonnet 5.5, Opus 5.5), OpenAI(GPT-6.1 Sol), Google(Gemini 3.8 Flash)을 서로 다른 회사로 본다. Flash는 리뷰하지 않는다.

| 작성 모델 | 위험 낮음·보통 | 위험 높음 |
|---|---|---|
| Gemini 3.8 Flash | Sonnet 5.5 | 해당 없음 (Flash는 위험 높음을 작성하지 않음) |
| Sonnet 5.5 | GPT-6.1 Sol | 해당 없음 (Sonnet은 위험 높음을 작성하지 않음) |
| GPT-6.1 Sol | Sonnet 5.5 | Opus 5.5 |
| Opus 5.5 | GPT-6.1 Sol | GPT-6.1 Sol |

Epic에 위험 높음 Story가 있으면 배정안에 "Epic 통합 리뷰" 행(Opus 5.5 / xhigh)을 넣어 제안한다. 승인되면 Epic 완료 보고 전에 위험 Story들의 통합된 변경을 한 번 더 리뷰한다. 모델이 다르다는 사실을 정확성 보장으로 보지 않는다.

### 5. 대체 모델

구현 모델을 쓸 수 없을 때(한도·접근 오류, 같은 원인 3회 실패 후 재배정) 바꿔 쓸 모델이다. 배정안에 함께 적어 승인받는다. effort는 원래와 같이 위험도를 따른다.

| 구현 모델 | 대체 모델 |
|---|---|
| Gemini 3.8 Flash | Sonnet 5.5 |
| Sonnet 5.5 | GPT-6.1 Sol |
| GPT-6.1 Sol (위험 낮음·보통) | Sonnet 5.5 |
| GPT-6.1 Sol (위험 높음) | Opus 5.5 |
| Opus 5.5 | GPT-6.1 Sol |

대체 모델로 바뀌어 작성 회사가 달라지면 리뷰 모델도 4번 표로 다시 고른다.

### 6. 사용자 승인

워커를 띄우기 전에 배정안을 아래 형식으로 보여 주고 사용자의 OK를 기다린다. 답이 없으면 승인으로 보지 않는다. 사용자가 고치면 고친 대로 쓴다.

| Story | 위험도 | 형태 | 구현 모델 / effort | 리뷰 모델 / effort | 대체 모델 | 이유 |
|---|---|---|---|---|---|---|
| 1-1 로그인 | 높음 | 일반 | Opus 5.5 / xhigh | GPT-6.1 Sol / xhigh | GPT-6.1 Sol / xhigh | 인증 토큰 처리 |
| 1-2 목록 화면 | 보통 | 정형 | Gemini 3.8 Flash / high | Sonnet 5.5 / high | Sonnet 5.5 / high | 기존 목록 패턴 반복 |
| Epic 통합 리뷰 | — | — | — | Opus 5.5 / xhigh | — | 위험 높음 Story 1건 |

- 승인된 배정안은 `plans/epic-<N>-orca.md`에 승인 날짜와 함께 기록하고 커밋한다.
- 승인 후 기록만 하고 진행해도 되는 변경: 승인된 대체 모델로의 전환, 위험도가 계획보다 높게 드러났을 때 리뷰를 위험 높음 기준으로 올리는 것. 바꾼 사실과 이유는 `orca-runs.md`와 최종 보고에 적는다.
- 다시 승인받아야 하는 변경: 배정안에 없는 모델, effort를 위험도 기준보다 올리거나 내리는 것, 리뷰 생략이나 약화, Story 추가·분할.
- 무인 진행(시작 프롬프트에서 고른 경우)이면 OK를 기다리지 않고 배정안을 적용하고, Story 분할은 부모 행을 물려받아 기록하고 진행한다. 나머지 재승인 대상은 하지 않고 그 Story를 보류한다. 기준은 [Orca 개발 규칙](orca-rules.md) §4.2이고, 사람은 `owner-digest.md`를 읽고 뒤집는다.

## effort 원칙

- Story 작업의 effort는 위험도로 정한다: 낮음 medium, 보통 high, 높음 xhigh. 구현·리뷰·대체 모델 모두 같다. low는 Flash의 조사 작업에만 쓴다.
- 모델이 그 수준을 지원하지 않으면 지원하는 가장 가까운 수준을 배정안에 적어 승인받는다. 지원 수준은 시작 확인에서 `state/orca/env.json`에 기록한 값을 따른다.
- max와 경쟁 풀이(같은 범위를 여러 모델이 동시에 구현)는 자동으로 쓰지 않는다. 같은 원인으로 실패한 근거가 있으면 사용자 승인을 받아 쓸 수 있다.
- Codex의 ultra는 추론에 더해 작업을 하위 에이전트에게 자동으로 나눠 맡기는 수준이다. 워커는 다른 에이전트를 띄우지 않으므로 Orca 워커에는 쓰지 않는다.
- 도구마다 기본 effort가 다르다. Claude Code는 xhigh, Codex의 GPT-6.1 Sol은 low다(API 기본값 medium과 다름). 워커와 직접 여는 세션은 effort를 항상 명시하고, 지정하지 않았다면 그 도구의 기본값으로 실행된 것으로 기록한다.
- 같은 effort 이름이라도 모델마다 토큰 예산이 다르다. 지원되지 않는 effort를 전달하지 않고, 실제로 적용된 값을 기록한다.
- 권한·자격증명·환경 누락으로 실패하면 모델이나 effort를 올려 재시도하지 않는다. 모델을 바꿔도 테스트·데이터 보호·독립 리뷰 기준은 낮추지 않는다.

## 코디네이터

| 선택 | 모델 / effort | 언제 |
|---|---|---|
| 기본 | Sonnet 5.5 / medium (Claude Code) | 대부분의 Epic |
| 상향 | Opus 5.5 / medium (Claude Code) | 위험 높음 Story가 Epic의 절반 이상이거나, 기록상 코디네이터의 판정·계약 작성 오류가 반복될 때 |

- 코디네이터의 일은 대부분 짧은 보고 읽기, 명령 실행, 계약 작성이다. 가장 어려운 판단인 모델 배정은 사용자가 승인하고, 위험 Story에는 강한 모델의 독립 리뷰가 따로 붙는다. 그래서 기본은 최상위 모델이 아니어도 된다.
- 코디네이터는 Epic 내내 켜져 있어 호출 횟수가 가장 많은 역할이다. Opus 5.5는 판단이 어려운 Epic에만 쓴다.
- Claude Code에서 돌면 `.claude/hooks`의 위험 명령 차단과 docker·마이그레이션 가드가 코디네이터에도 걸린다. 코디네이터는 merge와 push를 하는 유일한 역할이다.
- GPT-6.1 Sol은 연계·위험 구현과 Sonnet·Opus 작성분의 리뷰를 맡아 코디네이터까지 맡으면 한 계정에 일이 몰리고, Codex 세션에는 위 hook이 걸리지 않는다. Gemini 3.8 Flash는 최종 판정 역할에 쓰지 않는다.

## 그 밖의 역할

| 역할 | 모델 / effort | 비고 |
|---|---|---|
| BMAD 기획·설계 (사람과 대화) | Opus 5.5 / medium, 어려운 결정은 high | Claude Code에서 `/model`과 effort를 직접 고른다 |
| 원인 불명 장애·심층 분석 | Opus 5.5 / high | 읽기 전용 조사로 맡기고 편집은 구현 워커가 한다 |
| 코드 조사·로그 분석 | Gemini 3.8 Flash / low, 범위가 넓으면 Sonnet 5.5 / medium | validate 요약 출력으로 충분하면 따로 맡기지 않는다 |
| Phase C 회고 | Sonnet 5.5 / medium, 패턴 판단이 어려우면 Opus 5.5 / high | |
| Quick Flow 단독 작업 | Sonnet 5.5 / medium | |

## 설정 위치

| 대상 | 모델을 정하는 곳 |
|---|---|
| Orca 워커 | `worker-start --model <ID> --effort <수준>`으로 매번 명시 |
| Codex를 직접 열 때 | `.codex/config.toml` (GPT-6.1 Sol / medium) |
| Claude Code를 직접 열 때 | `/model`과 effort를 사람이 지정 (프로젝트 설정 파일 없음) |

- 프로젝트 설정 파일을 고쳤다고 이미 실행 중인 세션의 모델이 바뀌었다고 보고하지 않는다. 요청한 값과 실제 적용된 값(`launch.effective` 등)을 구분해 기록한다.
- 모델 접근 권한이 없으면 승인된 배정안 밖에서 다른 모델을 고르지 않는다.
- Codex 하위 에이전트용 역할 프로필은 두지 않는다. 작업 분배는 Orca 코디네이터가 하고, 워커는 BMAD 워크플로가 요구하는 내부 리뷰 외에는 하위 에이전트를 띄우지 않는다.

## 기록과 조정 제안

배정 결과는 사람이 따로 분석하지 않아도 되게 코디네이터가 기록하고 조정안을 낸다. 사람은 제안을 승인만 한다.

- 코디네이터는 Story마다 `orca-runs.md`에 승인·실제 모델과 effort, 리뷰 REJECTED 횟수, 수정 Dispatch 횟수, 대체 모델 전환, 소요 시간을 남긴다.
- Epic 완료 보고(시험 운영이면 멈출 때의 보고)에 표의 칸(작업 형태 × 위험도)별 요약과 아래 기준에 걸린 칸의 조정 제안을 붙인다. 모델의 무게 순서는 Gemini 3.8 Flash, Sonnet 5.5, GPT-6.1 Sol, Opus 5.5다.
  - 올림 제안: 같은 칸에서 첫 리뷰 REJECTED나 대체 모델 전환이 그 칸 Story의 절반 이상이면, 그 칸의 구현 모델을 한 단계 무거운 모델로 바꾸는 안을 낸다.
  - 내림 제안: 같은 칸에서 Story 3개 이상이 모두 첫 리뷰에 APPROVED이고 시간 예산의 절반 안에 끝났으면, 한 단계 가벼운 모델로 바꾸는 안을 낸다. 위험 높음 칸은 GPT-6.1 Sol과 Opus 5.5 사이에서만 바꾼다.
  - Story가 2개 이하인 칸은 요약만 하고 제안하지 않는다. effort는 위험도 기준을 유지한다.
- 진행 중인 Epic에서는 승인된 제안을 남은 Story의 배정안 행에만 반영한다. 이 문서의 표는 Phase C 회고에서 제안과 기록을 검토해 고친다.
- 기록이 쌓이기 전에는 이 배분이 품질·속도·비용을 개선한다고 보장하지 않는다.

근거: [Orca orchestration 가이드](https://github.com/stablyai/orca/blob/main/skill-guides/orchestration.md), [Claude effort](https://platform.claude.com/docs/en/build-with-claude/effort), [Codex 설정](https://learn.chatgpt.com/docs/config-file/config-advanced), [Codex 모델 목록](https://github.com/openai/codex/blob/main/codex-rs/models-manager/models.json)(GPT-6.1 Sol의 ID, Codex 기본 effort low, ultra 정의). 역할별 배정은 이 프로젝트의 운영 결정이다.
