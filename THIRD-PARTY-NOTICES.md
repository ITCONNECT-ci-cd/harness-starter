# Third-Party Notices

이 저장소는 편의를 위해 서드파티 콘텐츠를 번들합니다. 아래 콘텐츠의 저작권과
라이선스는 각 업스트림 프로젝트에 있으며, 루트 `LICENSE`(MIT)는 하네스 자체
파일에만 적용됩니다.

## BMAD-METHOD™ 스킬

- 경로: `.claude/skills/`와 `.agents/skills/`의 `bmad-*` 및 관련 에셋 (두 폴더는 byte 단위로 같다)
- 출처: [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)
- 라이선스: 업스트림 저장소의 LICENSE 참조 (커스텀 라이선스)
- 버전: 6.12.0 (core, bmm). 2026-10-03에 공식 설치기로 갱신했다.
  `npx bmad-method@6.12.0 install --modules bmm,bmb,tea,wds --tools claude-code,codex --no-shims --all-stable`
- 참고: 번들은 특정 시점 스냅샷입니다. 대상 프로젝트에 이미 설치된 BMAD가 있으면
  `scripts/install.sh`는 스킬 디렉터리를 복사하지 않고 기존 설치를 사용합니다. 스냅샷에는
  `_bmad/`(실행에 필요한 스크립트와 설정)가 없으므로 이 저장소 안에서 스킬을 실행할 수는 없습니다.
- 하네스는 폐기된 구버전 호환 스킬(`bmad-create-story`, `bmad-dev-story`, `bmad-quick-dev` 등, `--shims`로만 설치됨)을
  쓰지 않아 번들에 넣지 않았습니다. 근거는 [ADR-004](docs/decisions/ADR-004-bmad-build-auto.md)입니다.

같은 설치기가 받은 외부 모듈과 버전(2026-10-03, stable 채널):

| 모듈 | 버전 | 출처 | 커밋 |
|---|---|---|---|
| BMad Builder (`bmb`) | v2.2.2 | [bmad-builder](https://github.com/bmad-code-org/bmad-builder) | `4a14222` |
| Test Architect (`tea`) | v1.27.2 | [bmad-method-test-architecture-enterprise](https://github.com/bmad-code-org/bmad-method-test-architecture-enterprise) | `d99ad29` |
| WDS: Whiteport Design Studio (`wds`) | v0.4.3 | [bmad-method-wds-expansion](https://github.com/bmad-code-org/bmad-method-wds-expansion) | `cc16f09` |

## WDS (Whiteport Design Studio) 스킬

- 경로: `.claude/skills/`와 `.agents/skills/`의 `wds-*`, 그리고 WDS 모듈이 함께 넣는 `memory`, `sync`
- 출처: [bmad-method-wds-expansion](https://github.com/bmad-code-org/bmad-method-wds-expansion) (v0.4.3)
- 라이선스: 업스트림 모듈 배포처 참조
- 참고: WDS의 `sync` 스킬은 프로젝트의 `_bmad/wds/`를 사용자 폴더 `~/.claude/commands/`로 동기화한다.
  프로젝트에 `_bmad/wds/`가 없으면 조용히 멈추므로, 이 저장소에서는 아무것도 하지 않는다.

## 하네스 자체 스킬

`db-backup-setup`은 BMAD 설치기가 만든 것이 아니라 이 저장소가 직접 가진 스킬이다. 갱신 때 그대로 보존했다.

## 문의

번들 콘텐츠의 라이선스 관련 문의는 각 업스트림 프로젝트로, 하네스 자체 파일
관련 문의는 이 저장소 이슈로 남겨 주세요.
