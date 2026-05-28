param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$ScriptArgs = @()
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "lib/validate-utils.ps1")
. (Join-Path $PSScriptRoot "lib/package-runner.ps1")
. (Join-Path $PSScriptRoot "lib/git-utils.ps1")

Repair-HarnessWindowsEnvironment
Set-Location (Get-HarnessRepoRoot)

try {
  Initialize-HarnessValidation -RunType "quick"

  $validateConfig = Get-HarnessValidateConfig
  $validationMode = Get-HarnessValidationMode -Config $validateConfig
  $projectMode = ($validationMode -eq "project")
  if ($script:ValidateOutputMode -eq "summary") {
    Write-Host " Validation mode: $validationMode"
  }

  $baseRef = $env:VALIDATE_BASE_REF
  if ([string]::IsNullOrWhiteSpace($baseRef)) {
    foreach ($ref in @("origin/develop", "develop", "origin/main", "main")) {
      & git rev-parse --verify $ref *> $null
      if ($LASTEXITCODE -eq 0) {
        $baseRef = $ref
        break
      }
    }
  }

  $typecheck = Get-HarnessValidationCommand -Config $validateConfig -StepName "typecheck" -ScriptName "typecheck" -OverrideEnvName "HARNESS_TYPECHECK_CMD"
  if ([string]::IsNullOrWhiteSpace($typecheck)) {
    if (Get-HarnessStepRequired -Config $validateConfig -StepName "typecheck" -ProjectMode $projectMode -DefaultInProject $true) {
      Invoke-HarnessStepMissingRequired -StepNumber "01" -StepName "typecheck" -Reason "no typecheck command configured"
    } else {
      Invoke-HarnessStepSkip -StepNumber "01" -StepName "typecheck" -Reason $(if ($projectMode) { "typecheck not required" } else { "no project marker (template state)" })
    }
  } else {
    Invoke-HarnessStep -StepNumber "01" -StepName "typecheck" -Command $typecheck
  }

  $lint = Get-HarnessValidationCommand -Config $validateConfig -StepName "lint" -ScriptName "lint" -OverrideEnvName "HARNESS_LINT_CMD"
  if ([string]::IsNullOrWhiteSpace($lint)) {
    if (Get-HarnessStepRequired -Config $validateConfig -StepName "lint" -ProjectMode $projectMode -DefaultInProject $true) {
      Invoke-HarnessStepMissingRequired -StepNumber "02" -StepName "lint" -Reason "no lint command configured"
    } else {
      Invoke-HarnessStepSkip -StepNumber "02" -StepName "lint" -Reason $(if ($projectMode) { "lint not required" } else { "no project marker (template state)" })
    }
  } else {
    Invoke-HarnessStep -StepNumber "02" -StepName "lint" -Command $lint
  }

  if ([string]::IsNullOrWhiteSpace($baseRef)) {
    Invoke-HarnessStepSkip -StepNumber "03" -StepName "related-tests" -Reason "no base ref found (develop/main)"
  } else {
    # 추적 파일 + 미추적 파일 모두 포함 (새로 추가된 .ts 누락 방지)
    $tracked = @(& git diff --name-only $baseRef -- "*.ts" "*.tsx" "*.js" "*.jsx" 2>$null)
    $untracked = @(& git ls-files --others --exclude-standard -- "*.ts" "*.tsx" "*.js" "*.jsx" 2>$null)
    $changed = @(@($tracked + $untracked) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique)

    if ($changed.Count -eq 0) {
      Invoke-HarnessStepSkip -StepNumber "03" -StepName "related-tests" -Reason "no changed source files vs $baseRef"
    } else {
      $related = Get-HarnessRelatedTestCommand -Config $validateConfig -BaseRef $baseRef -ChangedFiles $changed
      if ([string]::IsNullOrWhiteSpace($related)) {
        throw "Story-level validation requires vitest/jest or HARNESS_RELATED_TEST_CMD. Full-suite fallback is intentionally disabled."
      }
      Invoke-HarnessStep -StepNumber "03" -StepName "related-tests" -Command $related
    }
  }

  $exitCode = Complete-HarnessValidation
  exit $exitCode
} catch {
  if ([string]::IsNullOrWhiteSpace($script:ValidateFailedStep)) {
    $script:ValidateFailedStep = "validate-quick"
    $script:ValidateFailedCode = 1
    Write-Error $_
  }
  Complete-HarnessValidation | Out-Null
  exit 1
}
