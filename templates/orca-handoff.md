# 코디네이터 인계 — Epic <N> #<k> (체인 <n>/<max>)

<!--
앞 코디네이터가 인계 직전에 state/orca/handoff/epic-<N>-<k>.md로 쓴다(docs/agents/orca-rules.md §11). 60줄 이내.
계획·실행 기록·진행 파일·Git에 이미 있는 것은 경로만 적는다 — 후임은 어차피 그것들을 읽는다.
여기에는 파일에 없는 것(앞 세션의 판단, 진행 중 사정)만 쓴다.
-->

- 앞 코디네이터 탭: <ORCA_TERMINAL_HANDLE 또는 「없음(사람이 띄움)」>
- Orca Run: <run id> — 후임은 `orca orchestration run-use --id <run id>`로 붙는다
- 진행 방식: <승인 대기 | 무인> · 사용량 가드: <꺼짐 | 켜짐 — 마지막 판정 Claude <ok/unknown> n%, Codex <ok/light/exhausted> n%>
- 기준: `epic/<N>` <커밋>(원격 동기 여부), 마지막으로 통합한 Story: <story-key>
- 다음 인계는 체인 <n+1>/<max> — 인계 주기: Story <K>개마다

## 읽을 곳
- 계획·배정안: `plans/epic-<N>-orca.md` (승인 후 변경 표까지)
- 실행 기록: `reviews/epic-<N>/orca-runs.md` · 진행: `state/epic-<N>-progress.json`
- 무인 결정: `reviews/epic-<N>/owner-digest.md` — 미확인 <k>건

## 다음에 할 일
- 다음 Story: <story-key> — 해제 조건 충족 여부: <충족 | 무엇을 기다림>
- 그다음: <story-key 목록>

## 파일에 없는 사정
- <앞 세션이 알게 된 것: 도구 결함·우회 경로·주의할 충돌·실패한 시도. 없으면 「없음」>

## 멈춤 조건 확인
- 남은 Story가 모두 사람 결정에 막혀 있나: <예/아니오>
- 멈춤 파일(`~/.orchestrator/STOP`·`STOP-<저장소>`): 없음 — 있었다면 이 인계문은 쓰이지 않았다
- 워커: 실행 중인 워커 없음, 모든 `worker_done` 정산·정리 완료 <확인>
