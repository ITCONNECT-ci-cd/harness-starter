# CI/CD 운영 기준

이 저장소는 여러 프로젝트에서 가져다 쓰는 공유 스타터입니다. 따라서 CI/CD 문서는
"현재 이 원본 저장소의 상태"와 "새 프로젝트에서 권장되는 기본값"을 분리해서 봅니다.

## 공유 스타터의 기본 관점

새 프로젝트 사용자는 GitHub Actions 요금제 제한이 없을 수 있습니다. 따라서 문서는
자동 CI/CD를 기본 선택지로 설명하되, 비용이나 권한 문제가 있으면 수동 모드를 선택할
수 있게 안내합니다.

## Private 저장소 + 무료 플랜 (실패 방지 & 분 절약)

무료 플랜의 **private** 저장소에서 자동 모드를 켜면 일부 기능이 적용되지 않거나 분을
낭비한다. 템플릿은 기본적으로 **실패하지 않게(robust)** + **분을 아끼게** 설정돼 있고,
public 또는 GHAS(GitHub Advanced Security) 사용 시 확장하는 방법을 함께 둔다. 동일한
설명이 각 워크플로 파일 주석에도 있으므로, AI/사람이 대상 프로젝트의 가시성·플랜에 맞춰
바로 조정할 수 있다.

| 기능 | 무료 private의 한계 | 템플릿 기본 조치 | public/GHAS에서 확장 |
|---|---|---|---|
| 브랜치 보호(classic/ruleset) | API가 403(Pro 필요) | 적용 안 함. 배포 안전은 `deploy.yml`의 "CI success" 게이트로 보장 | Pro/Team 업그레이드 또는 public 전환 |
| CodeQL/Trivy SARIF → Security 탭 | GHAS 없으면 업로드 실패 → 잡 실패 | 업로드/analyze에 `continue-on-error: true` | 해당 줄 제거(업로드 실패를 실패로 취급) |
| CodeQL 실행 빈도 | 결과 미표출인데 분 소비 | `if: schedule \|\| workflow_dispatch`(주간+수동) | codeql `if`에 push/PR 추가 |
| Trivy 이미지 스캔 | 매 push 이미지 빌드=비쌈, base CVE로 실패 | 주간+수동 + `exit-code: '0'`(보고 전용) | `if`에 push/PR 추가, 차단 게이트는 `exit-code: '1'` |
| Harness windows 잡 | windows-latest는 분 2배 | main push + 수동만 | windows 잡 `if` 조정 |

원칙:

- **실패로 분을 낭비하지 않는다.** SARIF 업로드 실패·base 이미지 CVE는 잡을 깨지 않게 한다.
- **무거운 스캔(codeql/trivy-image)은 기본 주간**으로 두고, 분이 무료인 public이나 GHAS
  사용 프로젝트에서만 push/PR로 확장한다.
- **셀프호스트 러너로 배포하면 그 잡의 분은 무료**다(이미지 빌드를 self-hosted로 옮기면
  GitHub 분을 더 아낀다).
- `scripts/*.sh`는 실행 비트(+x)가 있어야 `./scripts/validate.sh`가 exit 126 없이 돈다
  (템플릿에 적용됨).

## 자동 실행 모드

자동 실행 모드는 push, pull request, schedule, workflow_run 같은 트리거를 사용합니다.

사용 프롬프트:

```text
이 프로젝트의 CI/CD를 자동 실행 모드로 준비해줘.

현재 workflow 파일을 확인하고, push/PR/schedule/workflow_run 트리거가 필요한지 판단해줘.
필요한 GitHub secrets, variables, environments를 알려줘.
설정 후 validate 또는 harness self-test를 실행해줘.
```

## 수동 실행 모드

수동 실행 모드는 `workflow_dispatch`만 남겨 사람이 필요할 때 직접 실행합니다.
요금제 제한, 실험 단계, 외부 공유 전 점검 상태에 적합합니다.

사용 프롬프트:

```text
이 프로젝트의 CI/CD를 수동 실행 모드로 유지해줘.

workflow_dispatch로 실행 가능한지 확인해줘.
자동 트리거가 켜져 있으면 끄는 변경 계획을 먼저 보여줘.
나중에 자동 모드로 되돌리는 절차도 함께 적어줘.
```

## 원본 haenss-starter 저장소 메모

이 원본 저장소는 특정 시점에 GitHub Actions 비용/권한 문제 때문에 manual-only 상태일
수 있습니다. 이것은 공유 스타터의 권장 기본값이 아니라 maintainer 운영 상태입니다.
다른 프로젝트에 설치할 때는 해당 프로젝트의 요금제와 운영 방식에 맞춰 자동 모드 또는
수동 모드를 선택합니다.

## 되돌리기 원칙

자동화를 끌 때는 반드시 되돌리는 방법도 같이 남깁니다.

- 어떤 workflow 트리거를 껐는지 기록합니다.
- Dependabot PR 제한을 바꿨다면 원래 값을 기록합니다.
- repo-level Actions 권한을 바꿨다면 다시 켜는 명령을 기록합니다.
- push/PR 자동화를 켤 때는 먼저 수동 workflow가 통과하는지 확인합니다.
