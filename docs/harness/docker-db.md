# Docker / DB 작업 기준

Docker와 DB 마이그레이션은 데이터 유실 위험이 있으므로, 작업 전 환경을 먼저
명확히 해야 합니다.

## 표준 지시 문구

개발 환경:

```text
<프로젝트명> 개발 환경으로 docker 구성해.
```

운영 환경:

```text
<프로젝트명> 운영 환경으로 docker 구성해.
```

AI는 이 의도를 확인한 뒤 아래 guard를 사용해야 합니다.

```bash
./scripts/docker-guard.sh --env development
./scripts/docker-guard.sh --env production
```

Windows PowerShell에서는 대응되는 `.ps1` 진입점을 사용합니다.

## 금지

- `docker compose down -v`
- `docker compose down --volumes`
- 운영 DB 마이그레이션 직접 실행
- 사용자 확인 없는 볼륨 삭제

## DB 마이그레이션

직접 명령 대신 래퍼를 사용합니다.

```bash
./scripts/db-migrate.sh --cmd "<원본 마이그레이션 명령>"
```

또는 PowerShell 환경에서:

```powershell
./scripts/db-migrate.ps1 -Cmd "<원본 마이그레이션 명령>"
```

## 완료 보고 형식

```text
Docker/DB 작업 계획

- 대상 환경: development / production
- 변경할 compose 파일:
- DB 백업 필요 여부:
- 실행할 guard:
- 실행할 migration wrapper:
- 사용자가 확인해야 할 위험:
```
