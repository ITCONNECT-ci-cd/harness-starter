# 모델 배정 규칙

이 하네스가 쓰는 모델은 아래 네 개뿐이다. 모델과 effort의 기준은 이 문서 한 곳이며, 다른 운영 문서나 스크립트에 기본 모델을 따로 두지 않는다. 역할과 effort는 운영 가설이지 독점 담당이나 성능 순위가 아니다. `reviews/epic-<N>/orca-runs.md`에 쌓인 실측으로 Phase C에서 고친다.

## 네 모델

| 모델 | 호출 경로 | 우선 역할 | 기본 effort |
|---|---|---|---|
| Gemini 3.8 Flash | Antigravity, Gemini CLI | 명확한 코드·문서 조사, 로그 분석, 작은 버그, 정형 구현·테스트 | 조사 low, 구현 medium |
| Sonnet 5.5 | Claude Code | 코디네이터, 짧은 조정·계약 정리, 일반 FE/BE 구현·리뷰, 문서 작업 | medium |
| GPT-6 Sol | Codex | 코디네이터, 여러 파일 구현·테스트 연계, 순차 리팩터링·통합 | medium, 어려운 작업 high |
| Opus 5.5 | Claude Code | 어려운 설계·원인 분석, 보안·트랜잭션 판단, 위험 변경 리뷰, BMAD 기획 | 명세 확정 medium, 어려운 판단 high |

- 이 네 모델 외의 모델을 자동으로 배정하지 않는다.
- Gemini CLI와 Antigravity는 같은 모델을 부르는 경로이지 추가 모델이 아니다. 같은 모델이라도 경로·계정이 다르면 한도가 같다고 가정하지 않는다. Orca의 워커별 `--model` 지정은 에이전트마다 지원 여부가 다르므로(공개 가이드 기준 Antigravity는 지원), Flash를 워커로 부를 경로는 시작 확인에서 정한다.
- 논리 이름은 실행할 때 확인한 실제 등록 ID로 바꿔 쓰고 `state/orca/env.json`에 기록한다. 확인하지 않은 ID를 추측해서 쓰지 않는다.

## 역할별 기본 배정

| 역할 | 기본 모델 / effort | 비고 |
|---|---|---|
| BMAD 기획·설계 (사람과 대화) | Opus 5.5 / medium, 어려운 결정은 high | Claude Code에서 `/model`과 effort를 직접 고른다 |
| Orca 코디네이터 | Sonnet 5.5 또는 GPT-6 Sol / medium | 남은 사용량이 많은 쪽 |
| 구현: 명세가 분명한 정형 작업, 작은 버그 | Gemini 3.8 Flash 또는 Sonnet 5.5 / medium | 위험 영역 제외 |
| 구현: 일반 기능 | Sonnet 5.5 또는 GPT-6 Sol / medium | |
| 구현: 여러 파일 연계, 순차 리팩터링 | GPT-6 Sol / medium, 어려우면 high | 한 워커가 순서를 소유 |
| 구현: 위험 영역 | Opus 5.5 또는 GPT-6 Sol / high | 다른 회사 모델의 독립 리뷰 필수 |
| 리뷰 | 작성자와 다른 회사 모델. 일반은 Sonnet 5.5 또는 GPT-6 Sol / medium, 위험 영역은 Opus 5.5 / high | Flash는 최종 리뷰어로 쓰지 않는다 |
| 원인 불명 장애·심층 분석 | Opus 5.5 / high | 읽기 전용 조사로 맡기고 편집은 구현 워커가 한다 |
| 코드 조사·로그 분석 | Gemini 3.8 Flash / low, 범위가 넓으면 Sonnet 5.5 / medium | validate 요약 출력으로 충분하면 따로 맡기지 않는다 |
| Phase C 회고 | Sonnet 5.5 / medium, 패턴 판단이 어려우면 Opus 5.5 / high | |
| Quick Flow 단독 작업 | Sonnet 5.5 / medium | |

"다른 회사 모델"은 Anthropic(Sonnet 5.5, Opus 5.5), OpenAI(GPT-6 Sol), Google(Gemini 3.8 Flash) 가운데 작성자와 다른 쪽을 말한다. 모델이 다르다는 사실을 정확성 보장으로 보지 않는다.

## 위험 영역

- 인증·권한·결제·DB 마이그레이션·트랜잭션·동시성은 위험 대응 역량이 확인된 작성자와 독립 리뷰어를 쓴다. 초기 후보는 Opus 5.5와 GPT-6 Sol이며 실측으로 보완한다.
- Flash를 위험 영역의 단독 작성자나 최종 리뷰어로 배정하지 않는다.
- 위험도는 파일 수보다 명세 불확실성·결합도·실패 영향으로 판정한다. 의존성 버전 변경도 영향을 확인한다.

## effort 규칙

- high는 어려운 추론에만 쓴다. xhigh는 실패 근거가 있거나 그 작업군에서 이점이 확인됐을 때만 쓴다. max와 경쟁 풀이(같은 범위를 여러 모델이 동시에 구현)는 자동으로 쓰지 않는다.
- 같은 effort 이름이라도 모델마다 토큰 예산이 다르다. 지원되지 않는 effort를 전달하지 않고, 실제로 적용된 값을 기록한다.
- Claude Code의 기본 effort는 xhigh다. Claude 세션과 워커는 effort를 항상 명시한다. 지정하지 않았다면 기본값으로 실행된 것으로 기록한다.
- 모델을 내리기 전에 effort부터 조정한다. 작업이 끝나기는 하는데 필요 이상으로 오래 걸리면 effort를 낮춘다.
- 권한·자격증명·환경 누락으로 실패하면 모델이나 effort를 올려 재시도하지 않는다. 모델·effort를 낮춰도 테스트·데이터 보호·독립 리뷰 기준은 낮추지 않는다.

## 설정 위치

| 대상 | 모델을 정하는 곳 |
|---|---|
| Orca 워커 | `worker-start --model <ID> --effort <수준>`으로 매번 명시 |
| Codex를 직접 열 때 | `.codex/config.toml` (GPT-6 Sol / medium) |
| Claude Code를 직접 열 때 | `/model`과 effort를 사람이 지정 (프로젝트 설정 파일 없음) |

- 프로젝트 설정 파일을 고쳤다고 이미 실행 중인 세션의 모델이 바뀌었다고 보고하지 않는다. 요청한 값과 실제 적용된 값(`launch.effective` 등)을 구분해 기록한다.
- 모델 접근 권한이 없으면 이 문서의 후보 밖에서 다른 모델을 고르지 않는다.
- Codex 하위 에이전트용 역할 프로필은 두지 않는다. 작업 분배는 Orca 코디네이터가 하고, 워커는 BMAD 워크플로가 요구하는 내부 리뷰 외에는 하위 에이전트를 띄우지 않는다.

## 적용과 관찰

대표 구현·리뷰·조사 작업에서 성공 여부, 재작업 횟수, 완료 시간, 확인 가능한 사용량을 `orca-runs.md`로 비교한다. 비교 결과가 쌓이기 전에는 이 배분이 품질·속도·비용을 개선한다고 보장하지 않는다. 처음에는 Story 2~3개로 시험하고, 2 Epic 이상 기록이 쌓이면 Phase C에서 이 표를 고친다.

근거: [Orca orchestration 가이드](https://github.com/stablyai/orca/blob/main/skill-guides/orchestration.md), [Claude effort](https://platform.claude.com/docs/en/build-with-claude/effort), [Codex 설정](https://learn.chatgpt.com/docs/config-file/config-advanced). 역할별 배정은 이 프로젝트의 운영 결정이다.
