param(
  [Parameter(Mandatory = $true)]
  [int]$Epic
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "../lib/git-utils.ps1")

Repair-HarnessWindowsEnvironment

function Stop-Setup2 {
  param([string]$Reason = "")
  if ($Reason) {
    Write-Host $Reason
  } else {
    Write-Host "README.md의 프로젝트 초기화 프롬프트를 먼저 완료하세요"
  }
  exit 1
}

Set-Location ((& git rev-parse --show-toplevel 2>$null) | Select-Object -First 1)
if ($LASTEXITCODE -ne 0) { Stop-Setup2 }

$branch = (& git rev-parse --abbrev-ref HEAD 2>$null).Trim()
if ($branch -notin @("main", "develop")) { Stop-Setup2 }

& git rev-parse --verify --quiet develop *> $null
if ($LASTEXITCODE -ne 0) { Stop-Setup2 }

& git config --get remote.origin.url *> $null
if ($LASTEXITCODE -ne 0) { Stop-Setup2 }

$remoteDevelop = Test-HarnessGitHubRemoteRef -Ref "develop"
if (-not $remoteDevelop.Ok) { Stop-Setup2 }

# 구현 워커는 bmad-build-auto, 리뷰 워커는 bmad-code-review를 쓴다 (docs/decisions/ADR-004-bmad-build-auto.md)
# BMAD는 6.11 이상 6.x여야 한다. 6.10 이하에는 bmad-build-auto가 없고, v7은 sprint-status.yaml 체계가 바뀐다.
$manifest = "_bmad/_config/manifest.yaml"
if (-not (Test-Path -LiteralPath $manifest -PathType Leaf)) {
  Stop-Setup2 "BMAD 설치 정보가 없습니다: $manifest"
}
$versionLine = Select-String -LiteralPath $manifest -Pattern '^\s*version:\s*(\d+)\.(\d+)\.' | Select-Object -First 1
if (-not $versionLine) {
  Stop-Setup2 "BMAD 버전을 읽지 못했습니다: $manifest"
}
$bmadMajor = [int]$versionLine.Matches[0].Groups[1].Value
$bmadMinor = [int]$versionLine.Matches[0].Groups[2].Value
if ($bmadMajor -ne 6 -or $bmadMinor -lt 11) {
  Stop-Setup2 "BMAD $bmadMajor.$bmadMinor는 지원하지 않습니다. 6.11 이상 6.x가 필요합니다 (ADR-004 참고)."
}
foreach ($skill in @("bmad-build-auto", "bmad-code-review", "bmad-sprint-planning")) {
  if (-not (Test-Path -LiteralPath ".agents/skills/$skill")) {
    Stop-Setup2 "필요한 BMAD 스킬이 없습니다: .agents/skills/$skill (BMAD 6.11 이상 필요, ADR-004 참고)"
  }
}
if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
  Stop-Setup2 "uv가 없습니다. bmad-build-auto는 uv로 스킬을 렌더하며 uv가 없으면 멈춥니다."
}
if (-not (Test-Path -LiteralPath "_bmad/scripts/render_skill.py" -PathType Leaf)) {
  Stop-Setup2 "_bmad/scripts/render_skill.py가 없습니다. BMAD 설치가 불완전하거나 Git에 추적되지 않았습니다."
}
if (-not (Test-Path -LiteralPath "_bmad/custom/bmad-build-auto.toml" -PathType Leaf)) {
  Stop-Setup2 "_bmad/custom/bmad-build-auto.toml이 없습니다. 구현 워커에 하네스 규칙을 넣는 오버라이드입니다."
}

$planningRoot = "_bmad-output/planning-artifacts"
$epicPattern = "(?mi)^#{1,6}\s*Epic\s+$Epic\b|Epic\s+$Epic\s*:"
$epicSources = New-Object System.Collections.Generic.List[string]

$epicsFile = Join-Path $planningRoot "epics.md"
if (Test-Path -LiteralPath $epicsFile -PathType Leaf) {
  $epicSources.Add($epicsFile)
}

$epicsDir = Join-Path $planningRoot "epics"
if (Test-Path -LiteralPath $epicsDir -PathType Container) {
  Get-ChildItem -LiteralPath $epicsDir -Recurse -File -Filter "*.md" -ErrorAction SilentlyContinue |
    ForEach-Object { $epicSources.Add($_.FullName) }
}

if ($epicSources.Count -eq 0) { Stop-Setup2 }

$epicFound = $false
foreach ($source in $epicSources) {
  $content = Get-Content -LiteralPath $source -Raw
  if ($content -match $epicPattern) {
    $epicFound = $true
    break
  }
}
if (-not $epicFound) { Stop-Setup2 }

if (-not (Test-Path -LiteralPath "_bmad-output/implementation-artifacts/sprint-status.yaml" -PathType Leaf)) { Stop-Setup2 }

Write-Host "Loop A preflight passed for Epic $Epic"
exit 0
