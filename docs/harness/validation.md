# 검증 기준

검증의 목적은 시간을 많이 쓰는 것이 아니라, 각 단계에서 다른 위험을 잡는 것입니다.
같은 의미의 전체 검증을 반복하지 않습니다.

## 단계별 역할

| 시점 | 진입점 | 목적 |
|---|---|---|
| Story 구현 중 | `validate-quick` | 변경 범위 빠른 확인 |
| Epic 완료 | `validate` | 전체 통합 확인 |
| Phase B 완료 | `validate + smoke` | 리뷰 반영 후 핵심 흐름 확인 |
| Phase C 회고 | incident/regression/rules 강화 | 반복 실패를 다음 Epic 전에 하네스에 반영 |
| CI/CD | GitHub Actions 등 | 깨끗한 원격 환경 확인 |

## Windows PowerShell

```powershell
./scripts/validate-quick.ps1
./scripts/validate.ps1
./scripts/smoke.ps1
```

## bash/WSL/macOS/Linux

```bash
./scripts/validate-quick.sh
./scripts/validate.sh
./scripts/smoke.sh
```

## 실패 시 재개

실패하면 `state/validate/latest/*.log`를 읽고 원인을 고친 뒤 실패 단계부터
재개합니다.

```powershell
./scripts/validate.ps1 --from=test
```

```bash
./scripts/validate.sh --from=test
```

## project mode와 template mode

template mode:

- 아직 실제 소스나 프로젝트 마커가 없는 starter 상태입니다.
- 무거운 검증은 SKIP될 수 있습니다.
- 빠른 셋업 확인이 목적입니다.

project mode:

- `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `pom.xml`, `.csproj`,
  또는 실제 소스 루트가 있는 상태입니다.
- 필수 검증 명령이 없으면 실패해야 합니다.
- 예외가 필요하면 `harness.validate.json`의 `required`에서 명시적으로 꺼야 합니다.

`harness.validate.json`의 `mode`/`commands`/`required` 계약은 `validate.ps1`과
`validate.sh` 두 진입점이 동일하게 인식합니다 (우선순위: `HARNESS_*_CMD` 환경변수
> config > 자동 감지). 비 npm 스택은 `commands`에 스택 고유 명령을 지정하세요.

## 불필요한 시간 줄이기

- 매 편집마다 전체 테스트를 돌리지 않습니다.
- Story 중에는 관련 테스트와 빠른 검증을 우선합니다.
- Epic 끝에서 전체 검증을 한 번 수행합니다.
- Phase C는 검증 반복이 아니라 회고와 하네스 강화가 목적입니다.
- 실패 후에는 `--from`으로 재개합니다.
- 콘솔에는 summary를 출력하고, 상세 로그는 파일에 남깁니다.
