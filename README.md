# Harness Engineering Starter Kit

AI에게 일을 시킬 때, 사람이 긴 명령어를 외우지 않아도 되도록 만든
프로젝트 운영 템플릿입니다. 사용자는 아래 프롬프트를 복사해서 붙여넣고,
AI가 저장소 규칙, 스크립트, 검증 로그를 읽고 처리하게 합니다.

상세 설명은 아래 문서에 따로 있습니다.

| 필요한 상황 | 문서 |
|---|---|
| 새 프로젝트 시작 | [docs/harness/greenfield.md](docs/harness/greenfield.md) |
| 기존 프로젝트에 하네스 적용 | [docs/harness/brownfield.md](docs/harness/brownfield.md) |
| Orca로 개발 맡기기 (준비물·흐름·비용 원칙) | [docs/harness/orca.md](docs/harness/orca.md) |
| 검증이 언제 도는지 | [docs/harness/validation.md](docs/harness/validation.md) |
| CI/CD 켜기 또는 수동 모드 유지 | [docs/harness/ci-cd.md](docs/harness/ci-cd.md) |
| Docker/DB 작업 지시 문구 | [docs/harness/docker-db.md](docs/harness/docker-db.md) |
| Orca 코디네이터·워커 규칙 | [docs/agents/orca-rules.md](docs/agents/orca-rules.md) |
| 4개 모델(Flash·Sonnet·Sol·Opus)과 effort 배정 | [docs/agents/model-routing-rules.md](docs/agents/model-routing-rules.md) |
| 자율 진행·승인 범위·스킬 충돌 기준 | [docs/agents/agent-execution-rules.md](docs/agents/agent-execution-rules.md) |
| Phase C 문서·project-map 준비 | [docs/agents/project-map-rules.md](docs/agents/project-map-rules.md) |
| 날짜별 변경 이력·수정 파일 상세 | [docs/changelog/README.md](docs/changelog/README.md) |

모델은 Gemini 3.8 Flash, Sonnet 5.5, GPT-6 Sol, Opus 5.5 네 개만 쓰며, 기준은 [모델 배정 규칙](docs/agents/model-routing-rules.md) 한 곳에 있습니다. Orca 워커는 기동할 때마다 모델과 effort를 명시하고, [`.codex/config.toml`](.codex/config.toml)은 Codex를 직접 열 때의 기본값(GPT-6 Sol / medium)입니다. 설치 스크립트는 기존 설정 파일을 기본적으로 보존합니다. 개인 설정·권한을 바꾸지 않으며, BMAD 원본을 별도로 설치한 프로젝트에도 `AGENTS.md`의 공통 실행 규칙을 적용합니다.

## 최근 변경

2026-09-30: Phase A(Codex Desktop 구현)와 Phase B(Claude Code 리뷰)를 Orca 개발 흐름으로 교체했습니다. Story마다 구현 워커와 다른 회사 모델의 리뷰 워커가 일하고, 코디네이터가 `epic/<번호>` 브랜치에 통합합니다. 모델 기준은 Gemini 3.8 Flash, Sonnet 5.5, GPT-6 Sol, Opus 5.5 네 개로 통일했고, 코디네이터가 Story별 모델 배정안을 먼저 보여 주고 사용자 승인을 받습니다(한도 계산은 하지 않음). [변경 기록](docs/changelog/2026-09-30-orca-orchestration.md), [모델 배정 승인 방식](docs/changelog/2026-09-30-orca-model-approval.md), [Orca 가이드](docs/harness/orca.md)를 확인하세요.

이전 변경(Claude 프롬프팅 가이드 반영, Astra 모델 기본값 등)은 [변경 이력](docs/changelog/README.md)에 날짜별로 남아 있습니다. 그 기록에 적힌 모델 설정은 이번 변경으로 대체됐습니다.

---

## 먼저 고르기

### 첫 프로젝트일 때

아직 제품 문서가 없다면 Claude Code에 먼저 이 프롬프트를 입력합니다.

```text
이 프로젝트를 BMAD 방식으로 기획해줘.

1. 내가 설명하는 아이디어를 바탕으로 PRD를 만들어줘.
2. PRD를 바탕으로 architecture를 만들어줘.
3. architecture를 바탕으로 epics와 story 목록을 만들어줘.
4. 산출물은 _bmad-output/planning-artifacts/ 아래에 저장해줘.
5. Epic 산출물은 기본적으로 epics.md에 저장하고, 필요하면 epics/ 디렉터리로도 나눠줘.
6. 내가 개발자가 아니어도 이해할 수 있게, 각 단계마다 무엇을 확인해야 하는지만 짧게 알려줘.
```

BMAD 산출물이 이미 있다면 아래 프롬프트로 바로 시작합니다.

```text
이 저장소를 새 프로젝트용 Harness Engineering 프로젝트로 준비해줘.

AGENTS.md와 docs/agents/ 규칙을 먼저 읽어줘.
_bmad-output/planning-artifacts/ 아래의 PRD, architecture, epics 산출물을 확인해줘.
BMAD 스킬 경로가 있는지 확인해줘.
docs/agents/project-map-rules.md에 따라 Phase C에서 사용할 project-map의 실제 경로·출처도 확인해줘.
현재 프로젝트의 기술 스택을 감지하고, 필요한 scaffold와 harness 파일을 적용해줘.
templates/orca.yaml을 참고해서 루트 orca.yaml의 워크트리 준비 명령을 이 프로젝트의 의존성 설치 명령으로 만들어줘.
검증 스크립트는 현재 OS에 맞는 공식 진입점으로 실행해줘.

중요:
- BMAD를 다시 설치하지 말고, 이미 있는 산출물과 스킬을 확인만 해줘.
- 불필요한 전체 검증을 반복하지 말고, 초기 설정이 끝난 뒤 필요한 검증만 실행해줘.
- 완료 후 내가 다음에 입력할 프롬프트를 알려줘.
```

### 기존 프로젝트일 때

이미 코드가 있는 프로젝트 루트에서 Claude Code에 입력합니다.

```text
이 기존 프로젝트에 Harness Engineering을 안전하게 적용해줘.

기존 코드와 문서를 먼저 읽고, 하네스 적용 계획을 세워줘.
기존 변경사항과 harness 설치 산출물을 분리해서 확인해줘.
충돌이 없는 파일은 추가하고, 기존 규칙과 충돌하는 부분은 백업 후 수정해줘.
Orca로 개발할 수 있게 templates/orca.yaml을 참고해서 루트 orca.yaml의 워크트리 준비 명령도 이 프로젝트에 맞춰줘.
CI/CD, Docker, DB 마이그레이션 설정은 사용자 확인 없이 위험하게 바꾸지 말아줘.

기본 원칙:
- 기존 프로젝트 동작을 깨지 않는 것이 우선이야.
- 수정 전에는 어떤 파일을 바꿀지 먼저 요약해줘.
- 검증은 현재 OS에 맞는 공식 진입점으로 실행해줘.
- 완료 후 변경 파일, 검증 결과, 남은 선택 사항을 비개발자도 이해하게 정리해줘.
```

자세한 Brownfield 절차가 필요하면
[docs/harness/brownfield.md](docs/harness/brownfield.md)를 참고하세요.

---

## 개발 - Orca 프롬프트

Orca에서 코디네이터 세션을 Sonnet 5.5 / medium으로 열고 입력합니다(위험 높음 Story가 절반 이상인 Epic은 Opus 5.5 / medium). 코디네이터는 먼저 Story별 모델 배정안을 보여 주고, OK를 받은 뒤 Story마다 구현 워커와 리뷰 워커(작성자와 다른 회사 모델)를 띄우고, 검증과 리뷰를 통과한 Story를 `epic/<번호>` 브랜치에 모읍니다. 처음 쓰기 전에 [Orca 가이드](docs/harness/orca.md)의 준비물을 확인하세요.

```text
Orca 코디네이터로 Epic <번호>를 진행해줘.

이 Epic은 <누구를 위한 어떤 결과물인지, 완료되면 무엇이 가능해지는지>이고, 가장 걱정되는 위험은 <위험>이야.

시작 전에 AGENTS.md의 Orca 개발 루틴과 docs/agents/orca-rules.md를 읽고 그대로 따라줘.
환경 확인은 state/orca/env.json이 있으면 재사용하고, 도구 버전이 바뀌었을 때만 다시 해줘.

모델별 접근 경로와 계정:
- Gemini 3.8 Flash: <경로 / 계정>
- Sonnet 5.5: <경로 / 계정>
- GPT-6 Sol: <경로 / 계정>
- Opus 5.5: <경로 / 계정>

워커를 띄우기 전에 docs/agents/model-routing-rules.md의 선택 방법대로 Story별 모델 배정안(위험도, 작업 형태, 구현·리뷰 모델과 effort, 대체 모델, 이유)을 표로 보여 주고 내 OK를 기다려줘.

승인 범위:
- 검증과 리뷰를 통과한 Story 브랜치와 epic/<번호> push: <허용 / 허용하지 않음>
- develop 병합과 배포: 하지 않음 (따로 요청할 때만)
- 예산: orca-rules.md 기본값 <바꿀 값이 있으면 적기>

완료 보고는 결과부터 써줘. Story별 승인·실제 모델과 effort, 배정안과 달라진 부분과 이유, 커밋, 검증 로그 경로, 남은 위험을 적어줘.
```

### 이어서 하기

한도 오류나 시간 예산 때문에 멈췄거나 코디네이터를 바꿀 때 씁니다.

```text
Orca 코디네이터로 Epic <번호> 작업을 이어서 해줘.

AGENTS.md의 Orca 개발 루틴과 docs/agents/orca-rules.md를 따라줘.
plans/epic-<번호>-orca.md(승인된 모델 배정안 포함), reviews/epic-<번호>/orca-runs.md, state/epic-<번호>-progress.json, 현재 Git 상태를 대조해서 멈춘 지점부터 진행해줘.
끝난 Story를 다시 리뷰하거나 검증하지 말고, 멈춘 원인이 해결됐는지 먼저 확인해줘.
승인된 모델 배정안을 그대로 쓰고, 남은 Story의 배정을 바꿔야 하면 바꿀 행만 보여 주고 내 OK를 기다려줘.

승인 범위는 처음 요청과 같아. <바뀐 점이 있으면 적기>
```

### Epic 통합 (develop 병합)

Epic 완료 보고를 확인한 뒤 develop에 합칠 때 씁니다.

```text
Epic <번호>의 epic/<번호> 브랜치를 develop에 병합해줘.

docs/agents/orca-rules.md의 완료 조건과 docs/agents/workflow-rules.md의 Epic 통합 기준을 먼저 확인해줘.
전체 validate와 smoke 결과가 epic/<번호>의 현재 커밋 기준인지 확인하고, 아니면 다시 실행해줘.
조건을 만족하면 develop에 병합하고, sprint-status.yaml의 epic-<번호>를 done으로 바꿔 커밋한 뒤 push해줘.
만족하지 않으면 병합하지 말고 무엇이 남았는지 알려줘.
```

---

## Phase C - Epic 회고 + Harness 강화 프롬프트

Phase C는 출시 전 배포 준비가 아니라, Epic이 끝난 뒤 반복 실수와 검증 실패를 하네스에 반영하는 회고 단계입니다.
배포 준비가 필요하면 아래의 CI/CD 프롬프트나 별도 Release Gate 프롬프트를 사용합니다.

```text
Epic <번호>의 회고를 진행하고 Harness를 강화해줘.

Epic 통합(epic/<번호>의 전체 검증)이 끝났는지 먼저 확인해줘.
reviews/epic-<번호>/ 아래 리뷰 결과, 검증 로그, Orca 실행 기록(orca-runs.md)을 분석해줘.
state/epic-<번호>-progress.json이 있으면 failed/skipped story를 확인해줘.

반복된 REJECTED 패턴, validate 실패 패턴, 수동으로 놓치기 쉬운 실수를 찾아줘.
필요하면 feedback/incidents/ 아래 incident YAML을 작성해줘.
다음 Epic에서 자동으로 잡아야 하는 패턴이면 tests/regression/에 재현 테스트를 추가해줘.
반복 규칙은 docs/agents/feedback-rules.md에 반영하고, 기계적으로 판별 가능한 치명 패턴만 validate blocking check로 승격해줘.
orca-runs.md에서 모델별 성공·재작업·소요 시간을 정리하고, docs/agents/model-routing-rules.md의 배정을 바꿀 근거가 있으면 제안해줘.

회고를 반영한 뒤 docs/agents/workflow-rules.md Phase C의 8단계(프로젝트 이해 문서 갱신)도 실행해줘.
docs/PROJECT_MAP.md가 없으면 만들고 CLAUDE.md·AGENTS.md에 배선해줘. 있으면 이번 Epic에서 바뀐 장만 갱신해줘.
마지막 Epic 여부는 workflow-rules.md의 Epic 키·상태·기획 목록 기준으로 판단해줘.
마지막이면 PROJECT_MAP.md §10 규칙 색인을 생성·검증해줘.
SPEC.html 신규 생성은 이미 승인됐으면 진행하고, 아니면 한 번 물어봐줘. 추가 사람용 문서는 승인된 파일명과 범위가 있을 때만 만들어줘.
선택 문서의 답변 대기와 project-map 누락은 구분해서 보고하고, 독립적인 회고·검증 작업은 계속해줘.

Harness 파일(validate, rules, hooks)을 수정했다면 현재 OS에 맞는 validate를 다시 실행해줘.
회고 반영 커밋 메시지는 chore(harness): Epic <번호> 회고 반영 으로 준비해줘.

완료 보고는 결과부터 써줘. 하네스에 무엇이 바뀌었고 다음 Epic에서 무엇이 달라지는지를 먼저 적고, 근거와 세부는 그 뒤에 적어줘. 확인하지 못한 항목은 미검증이라고 적어줘.
```

---

## 검증 실패 시 프롬프트

```text
검증 실패 원인을 분석하고 고쳐줘.

state/validate/latest/ 아래 로그를 먼저 읽어줘.
실패한 단계와 원인을 사람이 이해하기 쉽게 설명해줘.
필요한 최소 파일만 수정해줘.
수정 후 현재 OS에 맞는 validate 진입점으로 실패 단계부터 재개해줘.
```

---

## CI/CD / Release Gate 프롬프트

이 스타터는 여러 사람이 가져다 쓰는 공유 템플릿입니다. 따라서 CI/CD는
각 프로젝트 상황에 맞게 켜거나 수동 모드로 둘 수 있습니다.
출시 전 최종 검증, develop -> main 승격, 배포 준비는 Phase C가 아니라 이 영역에서 다룹니다.

자동 CI/CD를 쓰려면:

```text
이 프로젝트의 CI/CD를 자동 실행 모드로 준비해줘.

현재 GitHub Actions, Dependabot, deploy workflow 상태를 확인해줘.
push/PR/schedule 트리거가 필요한 workflow를 켜고, 필요한 secrets와 variables를 알려줘.
요금제나 권한 문제로 자동화가 불가능하면 수동 실행 모드로 유지하고 이유를 설명해줘.
```

수동 실행 모드로 두려면:

```text
이 프로젝트의 CI/CD를 수동 실행 모드로 유지해줘.

workflow_dispatch로 직접 실행 가능한지 확인해줘.
자동 push/PR/schedule 트리거가 켜져 있으면 끄는 변경 계획을 먼저 보여줘.
나중에 자동화로 되돌리는 방법도 함께 문서화해줘.
```

자세한 기준은 [docs/harness/ci-cd.md](docs/harness/ci-cd.md)를 참고하세요.

---

## Docker / DB 작업 프롬프트

Docker나 DB 마이그레이션을 시킬 때는 환경을 먼저 말해야 합니다.

```text
<프로젝트명> 개발 환경으로 docker 구성해.
```

```text
<프로젝트명> 운영 환경으로 docker 구성해.
```

DB 마이그레이션은 AI에게 이렇게 지시합니다.

```text
운영 환경 DB 마이그레이션을 안전 래퍼로 실행할 계획을 세워줘.
직접 prisma migrate deploy를 실행하지 말고 ./scripts/db-migrate.sh 또는 ./scripts/db-migrate.ps1 경로를 사용해줘.
마이그레이션 전 백업과 실패 시 복원 방법을 먼저 설명해줘.
```

상세 규칙은 [docs/harness/docker-db.md](docs/harness/docker-db.md)에 있습니다.

---

## 핵심 원칙

- 사람은 프롬프트를 입력하고, AI가 저장소 규칙과 스크립트를 읽습니다.
- 개발은 Orca 코디네이터가 Story별로 워커에게 맡기고, 리뷰는 작성자와 다른 회사의 모델이 합니다.
- Story 중에는 `validate-quick`, Epic 통합 끝에는 `validate + smoke`를 사용합니다.
- develop 병합과 배포는 사람이 따로 요청할 때만 합니다.
- Phase C는 배포 준비가 아니라 Epic 회고와 Harness 강화 단계입니다.
- 출시 전 최종 검증과 배포 준비는 `CI/CD / Release Gate` 흐름으로 분리합니다.
- 실제 프로젝트에서는 필수 검증 명령이 없으면 통과로 보지 않습니다.
- 템플릿 상태에서는 무거운 검증을 건너뛰어 빠르게 유지합니다.
- 자세한 운영 규칙은 `AGENTS.md`와 `docs/agents/`가 기준입니다.
