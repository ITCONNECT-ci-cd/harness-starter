---
title: "README에 가벼운 수정(Quick Flow) 프롬프트 추가"
date: 2026-10-01
tags: [harness, readme, quick-flow]
---

# 26.10.01 가벼운 수정 프롬프트

> [전체 변경 이력](README.md) · [Quick Flow 규칙](../agents/workflow-rules.md)

BMAD 기획과 Orca 없이 작은 수정을 맡길 때 쓸 프롬프트를 README에 넣었습니다. 그동안 README에는 Orca·회고·검증 실패·CI/CD·Docker 프롬프트만 있어서, 작은 수정을 어떻게 시작하는지 찾기 어려웠습니다.

## 회의에서 설명할 핵심

**작은 수정은 Claude Code 한 세션에서 끝냅니다.** `bmad-quick-dev` 스킬이 내용 정리, 구현, 리뷰, 결과 보고까지 진행합니다. 모델은 Sonnet 5.5 / medium입니다. 아주 작은 수정은 계획서 없이 바로 고치고, 그 밖의 수정은 짧은 계획서를 쓴 뒤 진행합니다.

**브랜치와 올리는 범위를 정했습니다.** 사용자가 브랜치를 정하지 않으면 develop(없으면 기본 브랜치)에서 `fix/<이름>` 브랜치를 만들어 작업합니다. validate-quick을 통과하면 로컬 커밋까지만 하고, push와 develop 병합은 사람이 요청할 때만 합니다. main에는 직접 올리지 않습니다. 병합된 fix 브랜치는 `scripts/cleanup-branches.sh`의 정리 대상입니다.

**Quick Flow를 쓰지 않는 경우를 적었습니다.** 따로 배포할 목표가 여러 개면 나눠 요청하고, 설계 결정이 필요하면 BMAD 기획, 위험이 높은 변경은 Orca 흐름을 씁니다. Docker·DB 작업은 크기와 상관없이 `AGENTS.md`의 의무 규칙을 따릅니다.

## 수정 파일

| 파일 | 변경 |
|---|---|
| `README.md` | 「가벼운 수정 - Quick Flow 프롬프트」 절, 핵심 원칙 한 줄 |
| `docs/agents/workflow-rules.md` | Quick Flow 절에 모델, 기본 브랜치, 검증·커밋·push 범위 |
| `docs/changelog/README.md` | 목록 |

## 실행한 검증

- template mode `validate.sh`·`validate-quick.sh` 통과, 두 스킬 트리 동기화 통과, `git diff --check` 통과
- 바뀐 문서의 상대 링크 존재 확인
