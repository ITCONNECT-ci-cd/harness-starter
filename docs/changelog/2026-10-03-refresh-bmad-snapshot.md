---
title: "BMAD 스킬 스냅샷을 6.12.0으로 갱신"
date: 2026-10-03
tags: [harness, bmad, skills, snapshot]
---

# 26.10.03 BMAD 스킬 스냅샷을 6.12.0으로 갱신

> [전체 변경 이력](README.md) · [ADR-004](../decisions/ADR-004-bmad-build-auto.md) · 선행: [구현 워커를 bmad-build-auto로 교체](2026-10-03-bmad-build-auto.md)

## 회의에서 설명할 핵심

**하네스 문서는 `bmad-build-auto`를 쓰라고 하는데, 이 저장소의 스킬 스냅샷에는 그 스킬이 없었습니다.** 스냅샷은 6.12 이전 버전이었습니다. 앞선 변경([bmad-build-auto 교체](2026-10-03-bmad-build-auto.md))의 "남은 항목"이었습니다.

**손으로 복사하지 않고 공식 설치기로 다시 만들었습니다.** 같은 모듈 구성(core, bmm, bmb, tea, wds)을 6.12.0 기준으로 설치하고, 폐기된 호환 스킬은 넣지 않았습니다(`--no-shims`). 결과를 `.claude/skills`와 `.agents/skills` 양쪽에 같은 내용으로 넣었습니다.

**하네스 자체 스킬 `db-backup-setup`은 보존했습니다.** BMAD 설치기가 만드는 것이 아니라서 설치기 결과에 없었습니다.

**프로젝트 저장소에는 영향이 없습니다.** `install.sh`가 스킬 폴더를 설치 대상에서 제외하기 때문입니다. 영향은 이 저장소를 통째로 내려받는 경우에 한정됩니다.

## 변경 전후

| 구분 | 변경 전 | 변경 후 |
|---|---|---|
| 스킬 수 (폴더마다) | 70 | 60 (설치기 59 + `db-backup-setup` 1) |
| BMAD core·bmm | 6.12 이전 | 6.12.0 |
| BMad Builder (`bmb`) | 구버전 | v2.2.2 |
| Test Architect (`tea`) | 구버전 | v1.27.2 |
| WDS: Whiteport Design Studio (`wds`) | 구버전 | v0.4.3 |
| 구현 스킬 | `bmad-create-story`, `bmad-dev-story`, `bmad-quick-dev` | `bmad-build`, `bmad-build-auto` |
| 파일 수 (폴더마다) | 1,144개 | 1,657개 (설치기 1,656 + `db-backup-setup` 1) |

6.12.0 core·bmm에서 새로 생긴 스킬: `bmad-build`, `bmad-build-auto`, `bmad-prd`, `bmad-architecture`, `bmad-ux`, `bmad-spec`, `bmad-review`, `bmad-deep-recon`, `bmad-forge-idea`, `bmad-prfaq`, `bmad-walkthrough`, `bmad-customize`, `bmad-project-context`. 그 밖에 `bmad-eval-runner`와 WDS의 `memory`, `sync`, `wds-agent-mimir-builder`가 생겼습니다.

없어진 스킬 27개(+ 보존한 1개): 폐기된 호환 스킬(`bmad-create-story`, `bmad-dev-story`, `bmad-quick-dev`, `bmad-create-prd`, `bmad-edit-prd`, `bmad-validate-prd`, `bmad-create-architecture`, `bmad-sprint-status`, `bmad-document-project`, `bmad-generate-project-context`, 리서치 3종, 리뷰·편집 4종), 6.12 기본 설치에서 빠진 것(`bmad-agent-sm`·`-qa`·`-tech-writer`·`-quick-flow-solo-dev`, `bmad-check-implementation-readiness`, `bmad-create-ux-design`, `bmad-distillator`, `bmad-init`, `bmad-index-docs`, `bmad-shard-doc`).

## 수정 파일

| 파일 | 역할 |
|---|---|
| `.agents/skills/`, `.claude/skills/` | 스킬 스냅샷 전체 교체 (두 폴더는 byte 단위로 같음) |
| `THIRD-PARTY-NOTICES.md` | 모듈별 버전·출처·커밋, 설치 명령, 스냅샷은 실행할 수 없다는 설명, WDS `sync` 동작, `db-backup-setup` 구분 |
| `CLAUDE.md` | 프로젝트 지도 규칙에 `bmad-project-context` 호출 금지 추가 |
| `docs/changelog/README.md` | 목록 갱신 |

## 설치 방법 (재현)

```
npx bmad-method@6.12.0 install --modules bmm,bmb,tea,wds --tools claude-code,codex --no-shims --all-stable --yes
```

임시 폴더에서 실행해 `.claude/skills`와 `.agents/skills`만 가져왔습니다. 이후 `db-backup-setup`을 되돌렸습니다.

## 검증

실행해서 확인한 것:

- 설치기 출력의 `.claude/skills`와 `.agents/skills`가 같음 (`diff -rq`).
- 설치기 출력의 core·bmm 29개 스킬이 6.12.0을 설치한 실제 프로젝트의 스킬과 바이트까지 같음 (29/29). 설치기 결과를 재현할 수 있다는 근거입니다.
- 교체 뒤 두 폴더가 같음, `db-backup-setup` 보존.
- 줄바꿈: 설치기가 Windows에서 CRLF로 썼지만 `.gitattributes`의 `* text=auto`로 커밋 대상은 3,314개 파일 모두 LF입니다.
- 신규 스킬에 설치 머신의 경로나 사용자 이름이 섞이지 않음 (검색 결과 본문의 "scratchpad"라는 단어 1건뿐).
- `harness-self-test.yml`의 단계를 로컬(Windows)에서 같은 명령으로 실행:
  - `scripts/**/*.sh` 12개 `bash -n` 실패 0건, `scripts/**/*.ps1` 16개 PowerShell 7 파싱 오류 0건.
  - `node --test scripts/tests/orca-scripts.test.mjs` 19개 통과.
  - 스킬 트리 동기화 검사(`diff -rq .agents/skills .claude/skills`) 통과.
  - `validate-quick.sh`, `validate.sh`, `validate-quick.ps1`, `validate.ps1` 모두 PASSED (template 모드). `validate.sh` 보안 단계의 경고 1건은 `scripts/validate.ps1:179`의 검색 패턴이 자기 자신과 일치한 기존 오탐이며 새 스킬 파일과 무관합니다.

확인하지 못한 것:

- 외부 모듈(`bmb` v2.2.2, `tea` v1.27.2, `wds` v0.4.3)이 구버전과 어떻게 달라졌는지 내용은 검토하지 않았습니다. 공식 설치기가 만든 그대로입니다.
- 이 저장소 안에서 스킬을 실행해 보지 않았습니다. 스냅샷에는 `_bmad/`(실행 스크립트와 설정)가 없어서 실행할 수 없습니다. 구버전 스냅샷도 같았습니다.

## 알아 둘 점

| 항목 | 내용 |
|---|---|
| `bmad-project-context` | `AGENTS.md`의 지침 블록을 만들고 `CLAUDE.md`를 `@AGENTS.md`로 줄이자고 제안하는 스킬입니다. 하네스가 직접 관리하는 두 파일과 충돌하므로 `CLAUDE.md`에서 호출을 금지했습니다. |
| WDS `sync` | 프로젝트의 `_bmad/wds/`를 `~/.claude/commands/`로 동기화하는 스킬입니다. `_bmad/wds/`가 없으면 조용히 멈추므로 이 저장소에서는 아무것도 하지 않습니다. WDS가 설치된 프로젝트에서는 WDS 에이전트가 활성화될 때 호출합니다(최초 1회는 사용자에게 묻습니다). |
| 끊어진 참조 | 외부 모듈 일부가 6.12 기본 설치에 없는 스킬 이름을 참조합니다. `bmad-agent-builder`, `bmad-workflow-builder`(bmb)가 리서치·편집 스킬을, WDS Saga가 `bmad-document-project`·`bmad-market-research`를 언급합니다. 업스트림 모듈의 내용이라 고치지 않았습니다. |
| 6.11 이전 번들 | `CLAUDE.md`·`workflow-rules.md`의 Barry(`bmad-agent-quick-flow-solo-dev`) 안내는 "설치된 스킬 목록에 있을 때만"이라는 조건이 붙어 있어 그대로 둡니다. |
