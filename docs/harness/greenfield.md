# 새 프로젝트 하네스 적용

이 문서는 새 프로젝트에 Harness Engineering을 적용할 때의 상세 기준입니다.
루트 README에는 사용자가 복사할 프롬프트만 두고, 실제 운영 기준은 이 문서와
`AGENTS.md`, `docs/agents/`가 담당합니다.

## 준비물

BMAD 기획이 먼저 끝나 있어야 합니다.

필수 산출물:

- `_bmad-output/planning-artifacts/PRD.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/epics.md`

선택 산출물:

- `_bmad-output/planning-artifacts/epics/`

`epics.md`가 기본 형식입니다. Epic을 여러 파일로 나눠야 할 때만 `epics/`
디렉터리를 함께 둡니다. 스크립트는 둘 다 인식해야 합니다.

## 설치 흐름

1. BMAD 산출물과 스킬 경로를 확인합니다.
2. 기술 스택을 감지합니다.
3. 프로젝트 scaffold를 만듭니다.
4. harness 파일과 git hook을 적용합니다.
5. `harness.validate.json` 또는 패키지 스크립트로 검증 명령을 확정합니다.
6. 현재 OS에 맞는 검증 진입점을 실행합니다.

Windows PowerShell:

```powershell
./scripts/validate-quick.ps1
./scripts/validate.ps1
```

bash/WSL/macOS/Linux:

```bash
./scripts/validate-quick.sh
./scripts/validate.sh
```

## 완료 기준

- BMAD 산출물이 유지되어 있습니다.
- `AGENTS.md`와 `docs/agents/` 규칙이 적용되어 있습니다.
- project mode에서는 `typecheck`, `lint`, `test`, `build` 중 필수 명령이 누락되면 실패합니다.
- template mode에서는 프로젝트 마커가 없을 때 무거운 검증을 빠르게 건너뜁니다.
- Story 작업은 `story/*` 브랜치에서 진행하고 Phase B 승인 후 `develop`으로 병합합니다.

## 비개발자용 완료 보고 형식

```text
새 프로젝트 하네스 준비 완료

- 제품 문서: 확인 완료
- 기술 스택: <감지 결과>
- 검증 명령: <설정 결과>
- 빠른 검증: <통과/실패>
- 전체 검증: <통과/실패>
- 다음에 입력할 프롬프트: <Epic 구현 프롬프트>
```
