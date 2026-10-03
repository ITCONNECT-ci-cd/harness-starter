param(
  [Parameter(Mandatory = $true)]
  [string]$StoryName,
  [string]$BranchName = "",
  [string]$CommitMessage = "",
  [switch]$AllowNoVerifyFallback,
  [switch]$NoPush
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "../lib/git-utils.ps1")

Repair-HarnessWindowsEnvironment
Set-Location ((& git rev-parse --show-toplevel 2>$null) | Select-Object -First 1)

if ([string]::IsNullOrWhiteSpace($BranchName)) {
  if ($NoPush) {
    # Orca workers stay on the branch Orca created for their worktree.
    $BranchName = (& git rev-parse --abbrev-ref HEAD).Trim()
  } else {
    $BranchName = "story/$StoryName"
  }
}
if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
  $CommitMessage = "feat($StoryName): implement story"
}
if ($CommitMessage -notmatch '^(feat|fix|refactor|test|docs|chore|perf|style|ci|build)(\([a-z0-9_/-]+\))?!?: .+') {
  throw "Commit message is not Conventional Commits format: $CommitMessage"
}

& (Join-Path "scripts" "validate-quick.ps1")
if ($LASTEXITCODE -ne 0) {
  throw "validate-quick.ps1 failed; refusing to commit"
}

$current = (& git rev-parse --abbrev-ref HEAD).Trim()
if ($current -ne $BranchName) {
  & git rev-parse --verify --quiet $BranchName *> $null
  if ($LASTEXITCODE -eq 0) {
    & git checkout $BranchName
  } else {
    & git checkout -b $BranchName
  }
  if ($LASTEXITCODE -ne 0) { throw "Failed to switch/create branch $BranchName" }
}

& git add -A
if ($LASTEXITCODE -ne 0) { throw "git add failed" }

$staged = & git diff --cached --name-only
if ([string]::IsNullOrWhiteSpace(($staged -join ""))) {
  Write-Host "No staged changes to commit."
} else {
  & git commit -m $CommitMessage
  if ($LASTEXITCODE -ne 0) {
    if (-not $AllowNoVerifyFallback) {
      throw "git commit failed. If native checks already passed and the failure is a shell hook issue, rerun with -AllowNoVerifyFallback."
    }
    & git commit --no-verify -m $CommitMessage
    if ($LASTEXITCODE -ne 0) { throw "git commit --no-verify fallback failed" }
  }
}

# Orca workers commit locally; the coordinator pushes within the approved scope.
if ($NoPush) {
  Write-Host "Story committed without push (-NoPush): $BranchName"
  exit 0
}

$push = Invoke-HarnessGitPush -Branch $BranchName
$push.Output | ForEach-Object { Write-Host $_ }
if ($push.ExitCode -ne 0) {
  throw "git push failed"
}

Write-Host "Story finalized and pushed: $BranchName"
exit 0
