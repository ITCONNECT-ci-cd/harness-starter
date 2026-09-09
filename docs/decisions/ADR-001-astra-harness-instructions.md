# ADR-001: Astra에서 Harness 실행 기준과 모델 기본값 통일

- 날짜: 2026-09-09
- 상태: 적용
- 범위: Harness 운영 지침, Story/Quick Flow 스킬, Codex 모델 기본값

## 배경

사용자가 Astra의 reasoning을 Extra High로 선택하고 OpenAI 공식 가이드에 따른 Harness 점검·수정을 요청했다. 기존 지침에는 사용자 직접 구현 요청 무시, 선택적 질문 미응답 대기, Story마다 전체 테스트 실행, 3회 실패 처리 불일치가 있었다. 모델 기본값도 상세 문서와 legacy runner에 중복돼 있었다.

## 결정

1. `docs/agents/agent-execution-rules.md`를 `AGENTS.md`에서 연결한다. 설치 스크립트가 BMAD 스킬을 복사하지 않는 기존 프로젝트에도 공통 적용 기준을 전달하기 위해서다.
2. 제품 Story에서 BMAD를 임의 수정하는 금지는 유지한다. 명시적으로 요청된 Harness 유지보수에서는 필요한 원문을 양쪽 스킬 트리에 같은 byte로 수정하고 동기화를 검증한다.
3. 사용자 요청과 기존 승인 범위 안에서 진행한다. 중요한 미확정 결정, 실제 권한, 데이터 보존, 필수 검증은 유지한다. 선택적 질문·진행 단계·dirty tree만으로 멈추지 않는다.
4. Story는 관련 테스트와 native quick gate, Epic 및 Harness 변경은 전체 validate를 사용한다. commit 직전 finalizer의 필수 quick gate를 우회하지 않는다. TDD RED와 수정 실패 횟수를 구분하고, 실패한 Story의 의존 작업은 보류한다.
5. 모델 기본값은 `.codex/config.toml`로 통일한다. 현재 사용자가 선택한 모델·reasoning을 유지하고, legacy runner는 명시적인 환경변수만 CLI 인자로 전달한다. 설치 시 기존 프로젝트 설정은 기본적으로 보존한다.
6. project-map은 출처가 확인된 기존 스킬을 사용한다. 미설치를 대체 스킬 생성으로 감추지 않는다. 필수 지도·규칙 색인과 선택 사람용 문서를 구분하고, 마지막 Epic 판정에서 회고 키·빈 목록·상태 누락을 제외한다.

## 적용 범위와 제한

- 이번 변경은 제품 Epic 구현이나 Phase C 회고 실행이 아니다. 제품 아키텍처·sprint-status·PROJECT_MAP을 템플릿에 가짜로 생성하지 않는다.
- `run-epic.sh`는 기존 legacy fallback이다. 이번 코드 변경은 모델 옵션과 설정 탐색 위치에 한정하며, 그 스크립트의 기존 재시도·자동 통합 알고리즘을 Desktop Phase A 정책과 동일하게 만들었다고 주장하지 않는다. 새 실패/의존성 판단 지침은 이를 수행하는 에이전트에 적용한다.
- 모델 설정 파일은 이미 실행 중인 작업을 재설정하지 않으며, 모델 접근 권한을 부여하지 않는다. 보안·승인·sandbox 설정은 변경하지 않는다.
- 형식·동기화·스크립트 검증은 지침을 실제 모델이 항상 따름을 보장하지 않는다. 다음 실제 작업에서 불필요한 대기·검증 반복이 재현되면 해당 사례로 보완한다.

## 검증

- 현재 OS의 `scripts/validate.ps1` 실행. Starter이므로 제품 install/typecheck/lint/test/build는 해당 없음으로 보고한다.
- 변경된 세 스킬에 skill-creator의 `quick_validate.py` 실행, 두 스킬 트리 전체 byte 비교.
- `scripts/tests/codex-options.test.sh`: 기본값 미오버라이드, 모델/effort 개별·동시 오버라이드, 인자 경계 보존, 재호출 시 초기화 6개 경우. CI의 기존 수동 self-test에 포함한다.
- Bash/PowerShell 구문, TOML/YAML 파싱, 설치 함수의 새 설정 복사 및 기존 설정 보존 확인. 제품 구현·배포나 유료 모델 호출은 이 검증에 포함하지 않는다.

## 근거

- [OpenAI Astra 프롬프팅 가이드](https://developers.openai.com/api/docs/guides/latest-model#prompting-best-practices)
- [Codex 프로젝트 설정과 CLI 오버라이드](https://learn.chatgpt.com/docs/config-file/config-advanced)

공식 문서는 지침 점검과 작업별 조정을 권고한다. 구체적인 Phase 구분·테스트 경계·문서 생성 정책은 이 저장소의 운영 결정이다.
