Set-StrictMode -Version Latest

function Test-HarnessPackageJson {
  return (Test-Path -LiteralPath "package.json" -PathType Leaf)
}

function Get-HarnessValidateConfig {
  $path = "harness.validate.json"
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    return $null
  }

  try {
    return Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
  } catch {
    throw "harness.validate.json을 읽거나 파싱하지 못했습니다: $($_.Exception.Message)"
  }
}

function Get-HarnessObjectProperty {
  param(
    [AllowNull()]
    [object]$Object,
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  if ($null -eq $Object) { return $null }
  $property = $Object.PSObject.Properties[$Name]
  if ($null -eq $property) { return $null }
  return $property.Value
}

function Get-HarnessConfigCommand {
  param(
    [AllowNull()]
    [object]$Config,
    [Parameter(Mandatory = $true)]
    [string]$StepName
  )

  $commands = Get-HarnessObjectProperty -Object $Config -Name "commands"
  $command = Get-HarnessObjectProperty -Object $commands -Name $StepName
  if ([string]::IsNullOrWhiteSpace([string]$command)) {
    return $null
  }
  return [string]$command
}

function Test-HarnessProjectMarker {
  $markerFiles = @(
    "package.json",
    "pyproject.toml",
    "go.mod",
    "Cargo.toml",
    "pom.xml",
    "build.gradle",
    "build.gradle.kts",
    "Gemfile",
    "Package.swift"
  )

  foreach ($marker in $markerFiles) {
    if (Test-Path -LiteralPath $marker -PathType Leaf) {
      return $true
    }
  }

  if (Get-ChildItem -LiteralPath "." -Filter "*.csproj" -File -ErrorAction SilentlyContinue | Select-Object -First 1) {
    return $true
  }

  $sourceRoots = @("src", "app", "apps", "backend", "frontend", "server", "client", "packages", "cmd", "internal")
  foreach ($root in $sourceRoots) {
    if (-not (Test-Path -LiteralPath $root -PathType Container)) {
      continue
    }

    try {
      & git rev-parse --is-inside-work-tree *> $null
      if ($LASTEXITCODE -eq 0) {
        $tracked = @(& git ls-files -- $root 2>$null | Select-Object -First 1)
        $untracked = @(& git ls-files --others --exclude-standard -- $root 2>$null | Select-Object -First 1)
        if ($tracked.Count -gt 0 -or $untracked.Count -gt 0) {
          return $true
        }
        continue
      }
    } catch {
      # Fall back to a shallow filesystem check below.
    }

    if (Get-ChildItem -LiteralPath $root -Recurse -File -Depth 3 -ErrorAction SilentlyContinue | Select-Object -First 1) {
      return $true
    }
  }

  return $false
}

function Get-HarnessValidationMode {
  param(
    [AllowNull()]
    [object]$Config
  )

  $configured = Get-HarnessObjectProperty -Object $Config -Name "mode"
  if (-not [string]::IsNullOrWhiteSpace([string]$configured)) {
    $mode = ([string]$configured).Trim().ToLowerInvariant()
    if ($mode -in @("template", "project")) {
      return $mode
    }
    throw "harness.validate.json mode must be 'template' or 'project' (got: $configured)"
  }

  if (Test-HarnessProjectMarker) {
    return "project"
  }

  return "template"
}

function Get-HarnessStepRequired {
  param(
    [AllowNull()]
    [object]$Config,
    [Parameter(Mandatory = $true)]
    [string]$StepName,
    [bool]$ProjectMode,
    [bool]$DefaultInProject = $true
  )

  $required = Get-HarnessObjectProperty -Object (Get-HarnessObjectProperty -Object $Config -Name "required") -Name $StepName
  if ($null -ne $required) {
    return [bool]$required
  }

  return ($ProjectMode -and $DefaultInProject)
}

function Get-HarnessPackageJson {
  if (-not (Test-HarnessPackageJson)) {
    return $null
  }

  try {
    return Get-Content -LiteralPath "package.json" -Raw | ConvertFrom-Json
  } catch {
    throw "package.json을 읽거나 파싱하지 못했습니다: $($_.Exception.Message)"
  }
}

function Get-HarnessPackageManager {
  if (Test-Path -LiteralPath "pnpm-lock.yaml" -PathType Leaf) { return "pnpm" }
  if (Test-Path -LiteralPath "yarn.lock" -PathType Leaf) { return "yarn" }
  if ((Test-Path -LiteralPath "bun.lockb" -PathType Leaf) -or (Test-Path -LiteralPath "bun.lock" -PathType Leaf)) { return "bun" }
  if (Test-Path -LiteralPath "package-lock.json" -PathType Leaf) { return "npm" }
  return "npm"
}

function Test-HarnessPackageScript {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  $packageJson = Get-HarnessPackageJson
  if ($null -eq $packageJson -or $null -eq $packageJson.scripts) {
    return $false
  }

  return ($packageJson.scripts.PSObject.Properties.Name -contains $Name)
}

function Get-HarnessRunPrefix {
  $manager = Get-HarnessPackageManager
  switch ($manager) {
    "pnpm" { return "pnpm run" }
    "yarn" { return "yarn" }
    "bun" { return "bun run" }
    default { return "npm run" }
  }
}

function Get-HarnessInstallCommand {
  param(
    [AllowNull()]
    [object]$Config
  )

  if (-not [string]::IsNullOrWhiteSpace($env:HARNESS_INSTALL_CMD)) {
    return $env:HARNESS_INSTALL_CMD
  }

  $configured = Get-HarnessConfigCommand -Config $Config -StepName "install"
  if (-not [string]::IsNullOrWhiteSpace($configured)) {
    return $configured
  }

  switch (Get-HarnessPackageManager) {
    "pnpm" { return "pnpm install --prefer-offline" }
    "yarn" { return "yarn install" }
    "bun" { return "bun install" }
    default { return "npm install --prefer-offline" }
  }
}

function Get-HarnessScriptCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ScriptName,
    [string]$OverrideEnvName
  )

  if (-not [string]::IsNullOrWhiteSpace($OverrideEnvName)) {
    $override = [Environment]::GetEnvironmentVariable($OverrideEnvName)
    if (-not [string]::IsNullOrWhiteSpace($override)) {
      return $override
    }
  }

  if (-not (Test-HarnessPackageScript -Name $ScriptName)) {
    return $null
  }

  return "$(Get-HarnessRunPrefix) $ScriptName"
}

function Get-HarnessValidationCommand {
  param(
    [AllowNull()]
    [object]$Config,
    [Parameter(Mandatory = $true)]
    [string]$StepName,
    [Parameter(Mandatory = $true)]
    [string]$ScriptName,
    [string]$OverrideEnvName
  )

  if (-not [string]::IsNullOrWhiteSpace($OverrideEnvName)) {
    $override = [Environment]::GetEnvironmentVariable($OverrideEnvName)
    if (-not [string]::IsNullOrWhiteSpace($override)) {
      return $override
    }
  }

  $configured = Get-HarnessConfigCommand -Config $Config -StepName $StepName
  if (-not [string]::IsNullOrWhiteSpace($configured)) {
    return $configured
  }

  return Get-HarnessScriptCommand -ScriptName $ScriptName -OverrideEnvName ""
}

function Test-HarnessNodeBin {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if ($cmd) { return $true }

  $windowsBin = Join-Path "node_modules/.bin" "$Name.cmd"
  $unixBin = Join-Path "node_modules/.bin" $Name
  return ((Test-Path -LiteralPath $windowsBin -PathType Leaf) -or (Test-Path -LiteralPath $unixBin -PathType Leaf))
}

function Get-HarnessTestCommand {
  param(
    [AllowNull()]
    [object]$Config
  )

  # 우선순위: HARNESS_TEST_CMD > vitest binary > jest binary > npm run test
  # binary 직접 호출이 1순위인 이유: package.json의 "test" 스크립트가
  # "vitest" 단독(인자 없음)이면 watch 모드로 진입해 무한 행 발생.
  # binary 직접 호출은 항상 run-once 모드를 강제한다.
  if (-not [string]::IsNullOrWhiteSpace($env:HARNESS_TEST_CMD)) {
    return $env:HARNESS_TEST_CMD
  }

  $configured = Get-HarnessConfigCommand -Config $Config -StepName "test"
  if (-not [string]::IsNullOrWhiteSpace($configured)) {
    return $configured
  }

  if (Test-HarnessNodeBin -Name "vitest") {
    return "npx vitest run"
  }

  if (Test-HarnessNodeBin -Name "jest") {
    return "npx jest --runInBand --ci"
  }

  return Get-HarnessScriptCommand -ScriptName "test" -OverrideEnvName ""
}

function Get-HarnessRegressionTestCommand {
  param(
    [AllowNull()]
    [object]$Config
  )

  if (-not [string]::IsNullOrWhiteSpace($env:HARNESS_REGRESSION_TEST_CMD)) {
    return $env:HARNESS_REGRESSION_TEST_CMD
  }

  $configured = Get-HarnessConfigCommand -Config $Config -StepName "regression-test"
  if (-not [string]::IsNullOrWhiteSpace($configured)) {
    return $configured
  }

  if (Test-HarnessNodeBin -Name "vitest") {
    return "npx vitest run tests/regression/"
  }

  if (Test-HarnessNodeBin -Name "jest") {
    return "npx jest --runInBand --testPathPattern=tests/regression/"
  }

  return $null
}

function Get-HarnessRelatedTestCommand {
  param(
    [AllowNull()]
    [object]$Config,
    [Parameter(Mandatory = $true)]
    [string]$BaseRef,
    [string[]]$ChangedFiles = @()
  )

  if (-not [string]::IsNullOrWhiteSpace($env:HARNESS_RELATED_TEST_CMD)) {
    return $env:HARNESS_RELATED_TEST_CMD
  }

  $configured = Get-HarnessConfigCommand -Config $Config -StepName "related-tests"
  if (-not [string]::IsNullOrWhiteSpace($configured)) {
    return $configured
  }

  $changedJoined = ""
  if ($ChangedFiles -and $ChangedFiles.Count -gt 0) {
    $changedJoined = ($ChangedFiles -join " ")
  }

  if (Test-HarnessNodeBin -Name "vitest") {
    if ([string]::IsNullOrWhiteSpace($changedJoined)) {
      return "npx vitest run"
    }
    return "npx vitest related --run --reporter=verbose $changedJoined"
  }

  if (Test-HarnessNodeBin -Name "jest") {
    if ([string]::IsNullOrWhiteSpace($changedJoined)) {
      return "npx jest --runInBand --passWithNoTests"
    }
    return "npx jest --findRelatedTests $changedJoined --passWithNoTests"
  }

  return $null
}
