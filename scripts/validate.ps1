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

$from = ""
if ($ScriptArgs.Count -gt 0) {
  if ($ScriptArgs[0] -match '^--from=(typecheck|lint|test|build|security)$') {
    $from = $Matches[1]
  } else {
    Write-Error "Unknown option: $($ScriptArgs[0])`nUsage: ./scripts/validate.ps1 [--from=typecheck|lint|test|build|security]"
    exit 1
  }
}

$skipInstall = $false
$skipTypecheck = $false
$skipLint = $false
$skipTest = $false
$skipBuild = $false

switch ($from) {
  "typecheck" { $skipInstall = $true }
  "lint" { $skipInstall = $true; $skipTypecheck = $true }
  "test" { $skipInstall = $true; $skipTypecheck = $true; $skipLint = $true }
  "build" { $skipInstall = $true; $skipTypecheck = $true; $skipLint = $true; $skipTest = $true }
  "security" { $skipInstall = $true; $skipTypecheck = $true; $skipLint = $true; $skipTest = $true; $skipBuild = $true }
}

try {
  Initialize-HarnessValidation -RunType "epic"

  $validateConfig = Get-HarnessValidateConfig
  $validationMode = Get-HarnessValidationMode -Config $validateConfig
  $projectMode = ($validationMode -eq "project")
  if ($script:ValidateOutputMode -eq "summary") {
    Write-Host " Validation mode: $validationMode"
  }

  if (-not [string]::IsNullOrWhiteSpace($from)) {
    Write-Host " Resuming from: $from"
    Write-Host ""
  }

  $hasPackageJson = Test-HarnessPackageJson

  if ($skipInstall) {
    Invoke-HarnessStepSkip -StepNumber "01" -StepName "install" -Reason "--from"
  } else {
    $configuredInstall = Get-HarnessConfigCommand -Config $validateConfig -StepName "install"
    $install = $null
    if ($hasPackageJson -or -not [string]::IsNullOrWhiteSpace($env:HARNESS_INSTALL_CMD) -or -not [string]::IsNullOrWhiteSpace($configuredInstall)) {
      $install = Get-HarnessInstallCommand -Config $validateConfig
    }

    if ([string]::IsNullOrWhiteSpace($install)) {
      if (Get-HarnessStepRequired -Config $validateConfig -StepName "install" -ProjectMode $projectMode -DefaultInProject $false) {
        Invoke-HarnessStepMissingRequired -StepNumber "01" -StepName "install" -Reason "no install command configured"
      } else {
        Invoke-HarnessStepSkip -StepNumber "01" -StepName "install" -Reason $(if ($projectMode) { "no install command configured" } else { "no package.json (template state)" })
      }
    } else {
      Invoke-HarnessStep -StepNumber "01" -StepName "install" -Command $install
    }
  }

  if ($skipTypecheck) {
    Invoke-HarnessStepSkip -StepNumber "02" -StepName "typecheck" -Reason "--from"
  } else {
    $typecheck = Get-HarnessValidationCommand -Config $validateConfig -StepName "typecheck" -ScriptName "typecheck" -OverrideEnvName "HARNESS_TYPECHECK_CMD"
    if ([string]::IsNullOrWhiteSpace($typecheck)) {
      if (Get-HarnessStepRequired -Config $validateConfig -StepName "typecheck" -ProjectMode $projectMode -DefaultInProject $true) {
        Invoke-HarnessStepMissingRequired -StepNumber "02" -StepName "typecheck" -Reason "no typecheck command configured"
      } else {
        Invoke-HarnessStepSkip -StepNumber "02" -StepName "typecheck" -Reason $(if ($projectMode) { "typecheck not required" } else { "no project marker (template state)" })
      }
    } else {
      Invoke-HarnessStep -StepNumber "02" -StepName "typecheck" -Command $typecheck
    }
  }

  if ($skipLint) {
    Invoke-HarnessStepSkip -StepNumber "03" -StepName "lint" -Reason "--from"
  } else {
    $lint = Get-HarnessValidationCommand -Config $validateConfig -StepName "lint" -ScriptName "lint" -OverrideEnvName "HARNESS_LINT_CMD"
    if ([string]::IsNullOrWhiteSpace($lint)) {
      if (Get-HarnessStepRequired -Config $validateConfig -StepName "lint" -ProjectMode $projectMode -DefaultInProject $true) {
        Invoke-HarnessStepMissingRequired -StepNumber "03" -StepName "lint" -Reason "no lint command configured"
      } else {
        Invoke-HarnessStepSkip -StepNumber "03" -StepName "lint" -Reason $(if ($projectMode) { "lint not required" } else { "no project marker (template state)" })
      }
    } else {
      Invoke-HarnessStep -StepNumber "03" -StepName "lint" -Command $lint
    }
  }

  if ($skipTest) {
    Invoke-HarnessStepSkip -StepNumber "04a" -StepName "test" -Reason "--from"
    Invoke-HarnessStepSkip -StepNumber "04b" -StepName "regression-test" -Reason "--from"
  } else {
    $test = Get-HarnessTestCommand -Config $validateConfig
    if ([string]::IsNullOrWhiteSpace($test)) {
      if (Get-HarnessStepRequired -Config $validateConfig -StepName "test" -ProjectMode $projectMode -DefaultInProject $true) {
        Invoke-HarnessStepMissingRequired -StepNumber "04a" -StepName "test" -Reason "no test command configured"
      } else {
        Invoke-HarnessStepSkip -StepNumber "04a" -StepName "test" -Reason $(if ($projectMode) { "test not required" } else { "no project marker (template state)" })
      }
    } else {
      Invoke-HarnessStep -StepNumber "04a" -StepName "test" -Command $test
    }

    $regressionFiles = @()
    if (Test-Path -LiteralPath "tests/regression") {
      $regressionFiles = @(Get-ChildItem -LiteralPath "tests/regression" -Recurse -File -ErrorAction SilentlyContinue)
    }

    if ($regressionFiles.Count -eq 0) {
      Invoke-HarnessStepSkip -StepNumber "04b" -StepName "regression-test" -Reason "no tests/regression/ found"
    } else {
      $regression = Get-HarnessRegressionTestCommand -Config $validateConfig
      if ([string]::IsNullOrWhiteSpace($regression)) {
        throw "Regression tests exist, but no vitest/jest runner or HARNESS_REGRESSION_TEST_CMD was found."
      }
      Invoke-HarnessStep -StepNumber "04b" -StepName "regression-test" -Command $regression
    }
  }

  if ($skipBuild) {
    Invoke-HarnessStepSkip -StepNumber "05" -StepName "build" -Reason "--from"
  } else {
    $build = Get-HarnessValidationCommand -Config $validateConfig -StepName "build" -ScriptName "build" -OverrideEnvName "HARNESS_BUILD_CMD"
    if ([string]::IsNullOrWhiteSpace($build)) {
      if (Get-HarnessStepRequired -Config $validateConfig -StepName "build" -ProjectMode $projectMode -DefaultInProject $true) {
        Invoke-HarnessStepMissingRequired -StepNumber "05" -StepName "build" -Reason "no build command configured"
      } else {
        Invoke-HarnessStepSkip -StepNumber "05" -StepName "build" -Reason $(if ($projectMode) { "build not required" } else { "no project marker (template state)" })
      }
    } else {
      Invoke-HarnessStep -StepNumber "05" -StepName "build" -Command $build
    }
  }

  Write-Host ""
  if ($script:ValidateOutputMode -eq "summary") { Write-Host ("[06] {0,-20} " -f "security") -NoNewline } else { Write-Host "[06] security..." }
  $securityLog = Join-Path $script:ValidateLogDir "06-security.log"
  $securityWarnings = 0
  $securityMessages = New-Object System.Collections.Generic.List[string]
  $sourceFiles = @(Get-HarnessSearchFiles -Path "src")
  if ($sourceFiles.Count -gt 0) {
    $secretMatches = $sourceFiles | Select-String -Pattern "(api[_-]?key|secret|password|token)\s*[:=]\s*['`"][a-zA-Z0-9]{8,}" -CaseSensitive:$false -ErrorAction SilentlyContinue |
      Where-Object { $_.Line -notmatch "process\.env|\.env\.|\.example|test|mock|fake|dummy" }
    if ($secretMatches) {
      $securityWarnings += 1
      $securityMessages.Add("WARNING: Possible hardcoded secret detected in source code")
      $secretMatches | ForEach-Object { $securityMessages.Add($_.ToString()) }
    }
  }
  $stagedEnv = (& git diff --cached --name-only 2>$null) | Where-Object { $_ -match '^\.env(\.\w+)?$' -and $_ -notmatch '\.example$' }
  if ($stagedEnv) {
    $securityWarnings += 1
    $securityMessages.Add("WARNING: .env file staged for commit")
    $stagedEnv | ForEach-Object { $securityMessages.Add($_) }
  }
  $scriptFiles = @()
  if (Test-Path -LiteralPath "scripts") {
    $scriptFiles = @(Get-ChildItem -LiteralPath "scripts" -Recurse -File -Include "*.sh", "*.ps1" -ErrorAction SilentlyContinue)
  }
  $downVolume = $scriptFiles |
    Where-Object { $_.Name -notin @("validate.ps1", "validate.sh") } |
    Select-String -Pattern "down -v|down --volumes" -ErrorAction SilentlyContinue
  if ($downVolume) {
    $securityWarnings += 1
    $securityMessages.Add("WARNING: docker compose down volume destruction pattern found in scripts")
    $downVolume | ForEach-Object { $securityMessages.Add($_.ToString()) }
  }
  if ($securityWarnings -eq 0) { $securityMessages.Add("Security check: PASSED") } else { $securityMessages.Add("Security check: $securityWarnings warning(s) found") }
  $securityMessages | Set-Content -LiteralPath $securityLog
  $script:ValidateTotalSteps += 1
  $script:ValidatePassedSteps += 1
  if ($script:ValidateOutputMode -eq "summary") {
    if ($securityWarnings -eq 0) { Write-Host "PASSED" } else { Write-Host "WARN ($securityWarnings warning(s)) - log: $securityLog" }
  } else {
    Get-Content -LiteralPath $securityLog
  }

  if ($script:ValidateOutputMode -eq "summary") { Write-Host ("[07] {0,-20} " -f "performance") -NoNewline } else { Write-Host ""; Write-Host "[07] performance..." }
  $perfLog = Join-Path $script:ValidateLogDir "07-performance.log"
  $perfWarnings = 0
  $perfMessages = New-Object System.Collections.Generic.List[string]
  if ($sourceFiles.Count -gt 0) {
    $unbounded = $sourceFiles | Select-String -Pattern "findMany\(\)" -ErrorAction SilentlyContinue |
      Where-Object { $_.Line -notmatch "take:|limit:|where:" }
    if ($unbounded) {
      $perfWarnings += 1
      $perfMessages.Add("WARNING: findMany() without take/limit may return unbounded results")
      $unbounded | ForEach-Object { $perfMessages.Add($_.ToString()) }
    }
    $lodash = $sourceFiles | Select-String -Pattern "from 'lodash'|from `"lodash`"" -ErrorAction SilentlyContinue |
      Where-Object { $_.Line -notmatch "lodash/" }
    if ($lodash) {
      $perfWarnings += 1
      $perfMessages.Add("WARNING: Full lodash import; use lodash/specific-function")
      $lodash | ForEach-Object { $perfMessages.Add($_.ToString()) }
    }
  }
  if ($perfWarnings -eq 0) { $perfMessages.Add("Performance check: PASSED") } else { $perfMessages.Add("Performance check: $perfWarnings warning(s) found") }
  $perfMessages | Set-Content -LiteralPath $perfLog
  $script:ValidateTotalSteps += 1
  $script:ValidatePassedSteps += 1
  if ($script:ValidateOutputMode -eq "summary") {
    if ($perfWarnings -eq 0) { Write-Host "PASSED" } else { Write-Host "WARN ($perfWarnings warning(s)) - log: $perfLog" }
  } else {
    Get-Content -LiteralPath $perfLog
  }

  if ($script:ValidateOutputMode -eq "summary") { Write-Host ("[08] {0,-20} " -f "blocking") -NoNewline } else { Write-Host ""; Write-Host "[08] blocking..." }
  $blockingLog = Join-Path $script:ValidateLogDir "08-blocking.log"
  "Blocking check: PASSED (no promoted patterns)" | Set-Content -LiteralPath $blockingLog
  $script:ValidateTotalSteps += 1
  $script:ValidatePassedSteps += 1
  if ($script:ValidateOutputMode -eq "summary") { Write-Host "PASSED" } else { Get-Content -LiteralPath $blockingLog }

  $exitCode = Complete-HarnessValidation
  exit $exitCode
} catch {
  if ([string]::IsNullOrWhiteSpace($script:ValidateFailedStep)) {
    $script:ValidateFailedStep = "validate"
    $script:ValidateFailedCode = 1
    Write-Error $_
  }
  Complete-HarnessValidation | Out-Null
  exit 1
}
