# CI/CD 운영 기준

이 저장소는 여러 프로젝트에서 가져다 쓰는 공유 스타터입니다. 따라서 CI/CD 문서는
"현재 이 원본 저장소의 상태"와 "새 프로젝트에서 권장되는 기본값"을 분리해서 봅니다.

## 공유 스타터의 기본 관점

새 프로젝트 사용자는 GitHub Actions 요금제 제한이 없을 수 있습니다. 따라서 문서는
자동 CI/CD를 기본 선택지로 설명하되, 비용이나 권한 문제가 있으면 수동 모드를 선택할
수 있게 안내합니다.

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
