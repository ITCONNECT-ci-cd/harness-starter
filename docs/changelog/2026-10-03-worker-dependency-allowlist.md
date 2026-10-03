---
title: "워커의 의존성 추가를 계약의 허용 목록으로 제한"
date: 2026-10-03
tags: [harness, orca, dependencies, adr-005]
---

# 26.10.03 워커 의존성 추가: 절대 금지에서 허용 목록으로

> [전체 변경 이력](README.md) · [ADR-005](../decisions/ADR-005-worker-dependency-allowlist.md) · 선행: [구현 워커를 bmad-build-auto로 교체](2026-10-03-bmad-build-auto.md)

## 회의에서 설명할 핵심

**"의존성을 추가하지 않는다"는 절대 금지가 새 프로젝트의 첫 Story를 막았습니다.** 첫 Story는 `package.json`, lockfile, 프레임워크 의존성을 만들어야 합니다. 이 규칙을 지키면 끝낼 수 없습니다. 실제 프로젝트의 `epics.md`가 이 충돌을 "결정 필요"로 올렸습니다.

**금지를 없애지 않고 허용 목록으로 바꿨습니다.** 워커는 계약의 「허용 추가 의존성」에 적힌 것만 추가합니다. 목록 밖이 필요하면 추가하지 않고 Orca `ask`로 이름·이유·대안을 보냅니다. 코디네이터는 계획과 `architecture.md`로 답할 수 있으면 목록을 고쳐 답하고, 아니면 사용자에게 묻습니다.

**목록은 계획 단계에서 사람이 검토한 문서에서 옵니다.** 기본값은 `epics.md`의 해당 Story `추가 의존성` 줄입니다. 코디네이터가 계약에 그대로 옮깁니다.

**원래 규칙의 이유는 문서에 없었습니다.** 규칙은 2026-09-30 Orca 도입 커밋(`527eb2a`)에서 "ORCA SDD Orchestrator v5.0" 프롬프트를 옮기며 들어왔고, 커밋 메시지와 어느 ADR에도 이유가 없습니다. ADR-005에 그 사실과, 이 저장소 구조에서 따르는 위험(병렬 워크트리의 lockfile 병합 충돌, 승인 없는 의존성의 공급망·유지보수 부담, 리뷰 부담, 스택 결정은 `architecture.md`의 몫)을 추정으로 구분해 적었습니다.

## 변경 전후

| 자리 | 변경 전 | 변경 후 |
|---|---|---|
| `AGENTS.md` 워커 규칙 | 의존성을 추가하거나 설치 명령을 바꾸지 않는다 | 설치 명령 변경 금지는 유지. 의존성은 계약의 허용 목록만 추가, 목록 밖은 `ask` |
| 워커 계약 서식 | 의존성 칸 없음 | 「허용 추가 의존성」 칸 |
| 코디네이터 | 규칙 없음 | `epics.md`의 `추가 의존성` 줄을 계약에 옮김. 맞지 않으면 Story를 띄우지 않음. 무인이면 해당 Story만 보류 |
| 리뷰 | 규칙 없음 | 목록 밖 의존성은 CRITICAL. 목록 안이어도 이유 없는 커밋 메시지나 중복 기능은 지적 |
| `bmad-build-auto` 오버라이드 | 규칙 없음 | 목록을 spec의 Never에 적게 함. 목록 밖이 필요하면 `blocked`(`dependency not allowed`) |

## 수정 파일

| 파일 | 역할 |
|---|---|
| `AGENTS.md` | 워커 규칙 |
| `templates/orca-worker-contract.md` | 허용 추가 의존성 칸 |
| `docs/agents/orca-rules.md` | 코디네이터 절차(§5 준비) |
| `REVIEW.md` | 리뷰 기준 |
| `_bmad/custom/bmad-build-auto.toml` | 구현 워커 오버라이드 fact |
| `docs/decisions/ADR-005-worker-dependency-allowlist.md`, `ADR-004-bmad-build-auto.md` | 결정 기록과 연결 |
| `scripts/install.sh`, `scripts/install.ps1` | ADR-005를 설치 목록에 추가 |

## 검증

실행해서 확인한 것:

- 프로젝트 저장소에서 `bmad-build-auto` 렌더: 새 fact가 렌더된 `workflow.md`에 들어감, 종료 코드 0.
- `_bmad/custom/bmad-build-auto.toml` 파싱, `file:` 경로 존재.
- `install.sh` `bash -n`, `install.ps1` PowerShell 7 파싱 오류 0건.
- 프로젝트 저장소의 하네스 node 테스트 29개 통과, `preflight.ps1 -Epic 1` 통과.

이 저장소(스타터)에서 `harness-self-test.yml`의 단계를 로컬(Windows)에서 같은 명령으로 실행:

- `scripts/**/*.sh` 12개 `bash -n` 실패 0건, `scripts/**/*.ps1` 16개 PowerShell 7 파싱 오류 0건.
- `node --test scripts/tests/orca-scripts.test.mjs` 19개 통과.
- `validate-quick.sh`, `validate.sh`, `validate-quick.ps1`, `validate.ps1` 모두 PASSED (template 모드).

실행하지 못한 것:

- 실제 워커가 목록 밖 요청을 `ask`로 올리는지, `blocked`로 끝난 뒤 코디네이터가 목록을 고쳐 재시도하는 흐름이 매끄러운지는 확인하지 못했습니다. 첫 Epic 시험 운영에서 확인합니다.
