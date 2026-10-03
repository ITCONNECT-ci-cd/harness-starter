# Harness 변경 이력

하네스의 변경 이유, 수정 파일, 적용 범위와 검증 결과를 날짜별로 관리합니다. Obsidian 등 회의 노트에는 요약과 이 목록 또는 해당 상세 문서의 GitHub 링크를 남깁니다.

| 날짜 | 변경 내용 | 문서 |
|---|---|---|
| 2026-10-03 | 워커의 의존성 추가를 절대 금지에서 계약의 허용 목록으로 변경 (첫 Story 차단 해소, 목록 밖은 ask, 리뷰 CRITICAL, ADR-005) | [변경 기록](2026-10-03-worker-dependency-allowlist.md) |
| 2026-10-03 | 구현 워커를 bmad-build-auto로 교체 (create-story·dev-story 폐기 대응, spec 파일, 오버라이드 `_bmad/custom/bmad-build-auto.toml`, preflight 검사 확장, ADR-004) | [변경 기록](2026-10-03-bmad-build-auto.md) |
| 2026-10-02 | effort 하한 (Sonnet 5.5·GPT-6.1 Sol·리뷰 최소 high, 코디네이터 Sonnet high, Codex 직접 사용 Sol medium 고정) | [변경 기록](2026-10-02-effort-floors.md) |
| 2026-10-02 | 코디네이터 무인 진행·사용량 가드(선택)·세션 인계 (owner-digest, limits.json·STOP, session-rollover) | [변경 기록](2026-10-02-coordinator-autonomy.md) |
| 2026-09-30 | GPT-6 Sol을 GPT-6.1 Sol로 교체 (Codex 등록 ID 확인, Codex 기본 effort·ultra 주의사항, 워커 우회 금지) | [변경 기록](2026-09-30-gpt-6-1-sol.md) |
| 2026-09-30 | Orca 모델 배정을 사용자 승인 방식으로 변경 (한도 계산 제거, 선택 표, 위험도별 effort, 코디네이터 기본 모델, 조정 제안 자동화) | [변경 기록](2026-09-30-orca-model-approval.md) |
| 2026-09-30 | Orca 오케스트레이션 적용 (Phase A·B 교체, 4개 모델 통일) | [변경 기록](2026-09-30-orca-orchestration.md) |
| 2026-09-10 | 전체 실행 전용 테스트 실패 회고 반영 (격리 규칙 언어 중립화, 간헐 실패 절차) | [변경 기록](2026-09-10-test-isolation-retro.md) |
| 2026-09-10 | Claude Fable 5 프롬프팅 가이드 반영 (보고 근거·구현 범위·Claude 모델/effort) | [변경 요약](2026-09-10-claude-fable5-harness.md) · [수정 파일·검증 상세](2026-09-10-claude-fable5-changed-files.md) |
| 2026-09-10 | Astra / High 기본값과 역할별 모델 배정 | [변경 요약](2026-09-10-astra-high-model-routing.md) · [공통 하네스 수정 파일·검증 상세](2026-09-10-harness-changed-files.md) |
| 2026-09-09 | Astra 실행 지침·스킬 충돌·검증·Phase C 보완 | [변경 기록](2026-09-09-astra-harness-guidance.md) |
| 2026-07-09 | Harness v2.1 범용성 보완 | [변경 기록](2026-07-09-harness-v2.1-범용성-보완.md) |
| 2026-04-17 | Harness v2 개선 | [변경 기록](2026-04-17-harness-v2-개선.md) |

## 기록 방법

- 변경마다 `YYYY-MM-DD-주제.md`를 추가하고 이 목록을 최신순으로 갱신합니다. 파일 목록이 길면 같은 날짜의 별도 상세 문서로 분리합니다.
- 변경 전후, 실제 수정 파일과 역할, 대상 프로젝트·브랜치·커밋, 실행한 검증과 남은 항목을 기록합니다.
- 과거 문서의 상태는 해당 날짜의 확인 기록으로 보존합니다. 후속 변경은 새 기록으로 연결하고, 기록 오류를 바로잡을 때는 정정 사실을 명시합니다.
- 개인 Vault 경로나 로컬 감사 로그에 의존하지 않도록 설명과 필요한 근거를 저장소 문서에 남깁니다.
