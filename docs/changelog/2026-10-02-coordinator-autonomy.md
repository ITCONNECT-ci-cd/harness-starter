---
title: "코디네이터 무인 진행·사용량 가드(선택)·세션 인계"
date: 2026-10-02
tags: [harness, orca, coordinator]
---

# 26.10.02 코디네이터 무인 진행·사용량 가드·세션 인계

> [전체 변경 이력](README.md) · [결정 기록 ADR-003](../decisions/ADR-003-coordinator-autonomy.md) · [Orca 가이드](../harness/orca.md) · [Orca 개발 규칙](../agents/orca-rules.md)
>
> 선행: [Orca 모델 배정 승인 방식](2026-09-30-orca-model-approval.md)

09-30 Orca 개정이 전제한 세 가지 — 사람이 곁에서 승인한다, 사용량은 계산하지 않는다, 코디네이터 한 세션이 Epic 내내 돈다 — 를 보완했습니다. 같은 구성으로 여러 Epic을 무인으로 돌린 다른 저장소의 운영 장치를 일반화해 옮겼습니다. 모델 선택 표와 리뷰 규칙은 바꾸지 않았습니다.

## 회의에서 설명할 핵심

**자리를 비워도 멈추지 않게 할 수 있습니다.** 시작 프롬프트에서 진행 방식을 「무인」으로 고르면 코디네이터가 질문으로 멈추지 않습니다. 배정안을 규칙대로 적용하고, Story를 나누면 부모 배정을 물려받습니다. 사람 대신 정한 것은 `owner-digest.md`에 「무엇을 정했고, 뒤집으면 무엇이 바뀌는지」로 남깁니다. 다른 회사 리뷰, 검증, 수락 기준, push 승인 범위는 무인이어도 그대로입니다. 기본은 지금처럼 승인 대기입니다.

**사용량 한도는 원하는 사람만 켭니다.** `~/.orchestrator/limits.json`을 만들면 Claude·Codex 주간 사용률을 읽어, Claude는 정한 비율에서 멈추고 Codex는 정한 비율부터 Sol 구현을 대체 모델로 돌립니다. 파일이 없으면 지금처럼 계산하지 않습니다. `STOP` 파일 하나로 언제든 「이번 Story까지만」을 걸 수 있습니다.

**코디네이터가 스스로 교대합니다.** Story 3개마다 코디네이터가 인계문을 쓰고, 같은 모델의 새 세션을 Orca 탭으로 띄워 넘깁니다. 한 세션이 길어지면 매 턴 옛 대화를 다시 읽느라 비용이 커지고 앞 판단을 잘못 기억하기 때문입니다. 사람이 「이어서 하기」를 치던 일을 스크립트가 합니다.

## 변경 전후

| 구분 | 변경 전 | 변경 후 |
|---|---|---|
| 승인 | 배정안·재승인 대상마다 사용자 OK 대기 | 기본 같음. 「무인」을 고르면 적용·기록(`owner-digest.md`), Story 분할은 부모 상속, 리뷰 약화 등은 보류 |
| 사용량 | 계산하지 않음 | 기본 같음. `~/.orchestrator/limits.json`이 있으면 Claude stop·Codex light/exhausted 판정, 멈춤 파일 |
| 코디네이터 수명 | Epic 내내 한 세션, 교대는 사람이 「이어서 하기」 | Story K개(기본 3)마다 `session-rollover.mjs`로 자동 인계, 같은 Run에 `run-use` |
| 인계 정보 | 계획·실행 기록·Git 대조 | 그대로 + 인계문(`state/orca/handoff/`)에 파일에 없는 판단만 |
| 멈출 때 보고 | 결과부터 | 무인이면 digest의 미확인 항목 수와 경로부터 |

## 수정 파일

| 파일 | 변경 |
|---|---|
| `docs/agents/orca-rules.md` | §1 인계 원칙, §4를 승인 대기(4.1)·무인 진행(4.2)으로, §5 경계 확인 단계, §8.1 사용량 가드, §10 digest 보고, §11 코디네이터 인계 신설 |
| `docs/agents/model-routing-rules.md` | 머리말과 「사용자 승인」에 무인 진행·사용량 가드 참조(선택 표는 그대로) |
| `AGENTS.md` | 코디네이터 시작 루틴 5·6단계에 무인 진행·경계 확인·인계 |
| `README.md` | 최근 변경, 코디네이터 모델 절의 인계, 시작 프롬프트의 진행 방식·인계 주기·사용량 가드, 이어서 하기의 인계문·digest |
| `docs/harness/orca.md` | 「자리를 비우고 맡기기」「코디네이터 세션 인계」「사용량 한도 (선택)」 절, 비용 원칙·한계 갱신 |
| `templates/orca-epic-plan.md` | 진행 방식·인계 주기·사용량 가드 줄, 무인 승인 줄, 「무인」 변경 구분 |
| `templates/orca-handoff.md` | 신규. 인계문 양식 |
| `templates/orca-owner-digest.md` | 신규. 무인 결정 요약 양식 |
| `templates/orca-unattended-system-prompt.md` | 신규. 무인 코디네이터 시스템 프롬프트(질문으로 턴을 끝내지 않기) |
| `templates/orchestrator-limits.json` | 신규. 사용량 가드 한도 예시 |
| `scripts/orca/session-rollover.mjs` | 신규. 후임 탭 생성·준비 판정·모델 대조·멱등 전송·앞 탭 정리 |
| `scripts/orca/limits.mjs`, `claude-usage.mjs`, `codex-usage.mjs` | 신규. 한도 파일·멈춤 파일·사용률 판정(파일이 없으면 off) |
| `scripts/orca/statusline-tee.mjs`, `install-statusline-tee.mjs` | 신규. Claude statusline 입력의 주간 사용률 기록 장치와 설치·정확한 되돌리기 |
| `scripts/tests/orca-scripts.test.mjs` | 신규. 판정 함수·tee 실행·설치 왕복 시험 14개 |
| `.github/workflows/harness-self-test.yml` | Node 시험 단계 추가 |
| `state/README.md` | 인계문·인계 기록·사용자 폴더 파일 설명 |
| `docs/decisions/ADR-003-coordinator-autonomy.md` | 신규. 결정 이유와 대안 |

`scripts/`와 `templates/`는 설치 스크립트가 통째로 복사하므로 설치 목록은 바꾸지 않았습니다. 인계문·인계 기록은 이미 Git 제외 대상인 `state/orca/` 아래에 둡니다.

## 실행한 검증

- `node --test scripts/tests/orca-scripts.test.mjs`: 14/14 통과(Windows, Node 24)
- 독립 리뷰(Codex GPT-6 Astra, high, 읽기 전용): high 3·medium 6·low 1 → 전부 반영
  - Codex 사용률을 첫 창(primary)이 아니라 주간 창(`window_minutes` 10080)으로 고른다
  - Codex `light`로 구현 모델이 바뀌면 리뷰 모델을 실제 작성 모델 기준으로 다시 고른다
  - 터미널 목록을 못 읽으면 인계하지 않는다(중복 코디네이터 방지), 멈춤 파일·사용량을 첫 전송 직전에 다시 본다, 체인 상한 필수
  - 권한 확인 생략(`--skip-permissions`)을 무인 진행에서 분리했다
  - Claude `stop`에서 리뷰 전 Story는 보존하고 멈춘다, unknown은 직전 stop을 잇는다, 한도 파일이 깨지면 stop, 잘못된 기록은 unknown
  - statusline 원본을 설정 파일 경로별로 보관한다(설정 폴더가 둘이어도 섞이지 않게)
- 실제 Orca(1.4.218)에서 인계 시험 `--dry-run --no-predecessor`: 탭 생성 → Sonnet 5.5 배너 대조 → 한 줄 전송(영수증 accepted) → 후임 응답 `ROLLOVER-5555` 확인 → 탭 닫기, 종료 0
  - 첫 시도에서 결함 발견: Claude Code 2.1.287의 기본 권한 모드가 auto mode로 바뀌어 상태줄 문구가 달라졌고 준비 판정이 실패했다(인계문은 보내지 않음 — 안전한 실패). 상태줄 공통 표시 `⏵⏵`와 `auto mode`를 판정에 넣고 시험을 추가한 뒤 통과
  - Orca에 등록되지 않은 경로에서는 탭을 만들 수 없음을 확인하고 오류 안내를 넣음
- 사용량 판정: 한도 파일이 없는 폴더에서 `claude-usage.mjs` 판정 off·종료 0
- template mode `validate.sh`·`validate-quick.sh`, `git diff --check`, 바뀐 문서의 상대 링크 확인 (아래 「남은 확인 항목」 참고)

## 남은 확인 항목

- 실제 Epic에서 무인 진행·인계 체인을 끝까지 돌린 기록은 이 저장소에 아직 없다. 첫 Epic은 진행 범위를 「처음 3개 Story」로 두고 인계 1회를 포함해 시험 운영하기를 권한다.
- 무인 코디네이터에 권한 확인 창이 뜨면 멈춘다. 허용 목록(`permissions.allow`)을 프로젝트에 맞게 채우는 예시는 아직 없다 — 첫 무인 운영에서 실제로 쓴 명령으로 만든다. `--skip-permissions`는 hook만 남기고 push 승인 범위를 규칙으로만 지킨다.
- Codex 사용량 탐침은 `codex exec`를 sandbox 없이 임시 폴더에서 한 번 부른다(Windows에서 sandbox 모드가 셸을 막는 문제 때문). 응답만 받는 호출이다.
