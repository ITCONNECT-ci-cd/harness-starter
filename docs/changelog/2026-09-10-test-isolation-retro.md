---
title: "전체 실행 전용 테스트 실패 — Phase C 회고 반영"
date: 2026-09-10
tags: [harness, phase-c, testing, test-isolation]
---

# 26.09.10 전체 실행 전용 테스트 실패 — 회고 반영

> [전체 변경 이력](README.md) · [같은 날 Claude Fable 5 반영](2026-09-10-claude-fable5-harness.md)

서로 다른 스택 두 곳에서 같은 형태의 실패를 관측해 Phase C 승격 정책에 따라 활성 규칙으로 올렸습니다.

## 관측한 것

단독 실행하면 통과하는 테스트가 전체 실행에서만 실패합니다.

| 스택 | 형태 |
|---|---|
| 프런트엔드 Vitest | 컴포넌트 테스트 1건이 전체 병렬 실행에서만 실패. 같은 파일 단독 실행은 전부 통과 |
| 백엔드 pytest | 환경변수 미설정 시 fail-closed를 단언하는 테스트가 전체 실행에서 실패. 다른 테스트가 같은 환경변수를 `os.environ`에 심은 순서 의존 |

두 경우 모두 처음에는 타임아웃·성능 문제로 오진했습니다. 한쪽에서는 실제로 `waitFor` 상향을 시도하다 실패 시점 DOM 덤프가 반증했습니다. **그대로 올렸으면 실제 결함을 덮었을 것입니다.**

## 기존 규칙이 반쪽이었다

`testing-rules.md`의 격리 규칙에는 이미 환경변수 항목이 있었습니다. 그런데 두 가지가 비어 있었습니다.

- **언어가 JS로 고정**돼 있었습니다 (`process.env`만 언급). pytest 테스트 작성자에게 닿지 않았습니다.
- **값을 변경하는 쪽만 막고, 환경 상태를 단언하는 쪽은 막지 않았습니다.** 실제 실패는 값을 심은 테스트와 없다고 단언한 테스트가 서로 달랐던 경우입니다.

## 반영한 것

| 위치 | 내용 |
|---|---|
| `docs/agents/testing-rules.md` 격리 규칙 | 환경변수 항목을 언어 중립으로(`os.environ`, `monkeypatch.setenv`, `vi.stubEnv`) 고치고, 환경 상태를 단언하는 테스트도 금지 |
| `docs/agents/testing-rules.md` 새 절 | 「간헐 실패와 전체 실행 전용 실패」 5단계 절차 |
| `docs/agents/feedback-rules.md` | 활성 규칙 6번 추가 |
| `feedback/incidents/` | `2026-09-10-test-isolation-full-run-only.yaml` |
| `state/learning-loop.json` | 격리 패턴 count 2 / active-rule, 환경변수 직접 대입 하위 패턴 count 1 / watching |

### 간헐 실패 절차 5단계

1. 단독 실행으로 격리 문제인지 먼저 판별한다
2. 대기 시간·재시도를 올려 넘어가지 않는다 (실제 결함을 덮는다)
3. ad-hoc 재현 전에 `state/validate/<실행 디렉터리>/*.log`부터 읽는다
4. 재현하지 못하면 시도 방법·횟수를 기록하고 미확정으로 남긴다. 재현되지 않은 수정을 원인으로 보고하지 않는다
5. 아무것도 증명하지 못하는 재현 테스트는 남기지 않는다

## blocking check로 승격하지 않은 이유

테스트 파일 안의 환경변수 직접 대입(`os.environ[...] =`, `process.env.X =`)은 grep으로 잡히므로 기계적 검출이 가능합니다. 다만 그 **하위 패턴은 아직 1회 관측**이라 승격 기준(3회 또는 치명적)에 못 미칩니다. 정책보다 앞서 승격하면 오탐으로 검증이 막힙니다. `learning-loop.json`에 후보로 기록해 두고 재발 시 올립니다.

## 기록 방침

이 회고 기록에는 내부 프로젝트명·브랜치·커밋을 남기지 않았습니다(`security-rules.md` 「내부 프로젝트 관리 정보」). 재발 판단에 필요한 것은 실패의 형태이지 어느 저장소였는지가 아닙니다.

## 실행한 검증

`scripts/validate.ps1` 9/9 통과. 이 저장소는 템플릿 상태라 실제 실행된 것은 security·performance·blocking 3단계이고 나머지 6단계는 대상이 없어 SKIP됐습니다.
