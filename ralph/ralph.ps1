<#
.SYNOPSIS
    Ralph - Autonomous PRD Runner for Claude Code
.DESCRIPTION
    Reads prd.json and executes user stories sequentially using Claude Code.
    Each story runs in a fresh Claude Code session.
.EXAMPLE
    .\ralph.ps1           # Run next incomplete story
    .\ralph.ps1 -All      # Run all incomplete stories
    .\ralph.ps1 -Story 3  # Run specific story (US-003)
    .\ralph.ps1 -Status   # Show progress status
#>

param(
    [switch]$All,
    [switch]$Status,
    [int]$Story = 0,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$PrdFile = Join-Path $ScriptDir "prd.json"
$ProgressFile = Join-Path $ScriptDir "progress.txt"

# Colors for output
function Write-Success { param($msg) Write-Host $msg -ForegroundColor Green }
function Write-Info { param($msg) Write-Host $msg -ForegroundColor Cyan }
function Write-Warn { param($msg) Write-Host $msg -ForegroundColor Yellow }
function Write-Err { param($msg) Write-Host $msg -ForegroundColor Red }

# Load PRD
if (-not (Test-Path $PrdFile)) {
    Write-Err "Error: prd.json not found at $PrdFile"
    exit 1
}

$prd = Get-Content $PrdFile -Raw | ConvertFrom-Json

# Show status
function Show-Status {
    Write-Host ""
    Write-Info "==========================================================="
    Write-Info "  RALPH STATUS: $($prd.project)"
    Write-Info "  Branch: $($prd.branchName)"
    Write-Info "==========================================================="
    Write-Host ""

    $completed = 0
    $total = $prd.userStories.Count

    foreach ($story in $prd.userStories) {
        $statusChar = if ($story.passes) { "[x]" } else { "[ ]" }
        $color = if ($story.passes) { "Green" } else { "Gray" }
        Write-Host "  $statusChar " -NoNewline -ForegroundColor $color
        Write-Host "$($story.id): $($story.title)" -ForegroundColor $color
        if ($story.passes) { $completed++ }
    }

    Write-Host ""
    Write-Info "  Progress: $completed / $total stories completed"
    Write-Host ""
}

if ($Status) {
    Show-Status
    exit 0
}

# Find next story to run
function Get-NextStory {
    foreach ($story in $prd.userStories | Sort-Object { $_.priority }) {
        if (-not $story.passes) {
            return $story
        }
    }
    return $null
}

# Get story by number
function Get-StoryByNumber {
    param([int]$num)
    $id = "US-{0:D3}" -f $num
    return $prd.userStories | Where-Object { $_.id -eq $id }
}

# Build prompt for Claude Code
function Build-Prompt {
    param($story)

    $criteria = ($story.acceptanceCriteria | ForEach-Object { "- $_" }) -join "`n"

    $prompt = @"
# Task: $($story.id) - $($story.title)

## Description
$($story.description)

## Acceptance Criteria
$criteria

## Instructions
1. Implement this user story completely
2. Ensure all acceptance criteria are met
3. Run typecheck (npm run lint) before finishing
4. Do NOT move on to other stories - only complete this one
5. When done, summarize what was implemented

Project: $($prd.project)
Branch: $($prd.branchName)
"@
    return $prompt
}

# Log to progress file
function Log-Progress {
    param($message)
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -Path $ProgressFile -Value "[$timestamp] $message"
}

# Mark story as complete in prd.json
function Mark-Complete {
    param($storyId)

    for ($i = 0; $i -lt $prd.userStories.Count; $i++) {
        if ($prd.userStories[$i].id -eq $storyId) {
            $prd.userStories[$i].passes = $true
            break
        }
    }

    $prd | ConvertTo-Json -Depth 10 | Set-Content $PrdFile -Encoding UTF8
    Write-Success "Marked $storyId as complete"
}

# Run a single story
function Run-Story {
    param($story)

    Write-Host ""
    Write-Info "==========================================================="
    Write-Info "  RUNNING: $($story.id) - $($story.title)"
    Write-Info "==========================================================="
    Write-Host ""

    $prompt = Build-Prompt $story

    Write-Host "Description: $($story.description)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Acceptance Criteria:" -ForegroundColor Gray
    foreach ($ac in $story.acceptanceCriteria) {
        Write-Host "  - $ac" -ForegroundColor Gray
    }
    Write-Host ""

    if ($DryRun) {
        Write-Warn "[DRY RUN] Would execute Claude Code with the above prompt"
        Write-Host ""
        Write-Host "Prompt that would be sent:" -ForegroundColor Yellow
        Write-Host $prompt -ForegroundColor DarkGray
        return $true
    }

    Log-Progress "Starting $($story.id): $($story.title)"

    # Create temp file with prompt
    $promptFile = Join-Path $env:TEMP "ralph-prompt-$($story.id).md"
    $prompt | Set-Content $promptFile -Encoding UTF8

    # Run Claude Code
    Write-Info "Launching Claude Code..."
    Write-Host ""

    try {
        # Change to project root and run claude
        Push-Location $ProjectRoot

        # Run claude with the prompt
        $promptContent = Get-Content $promptFile -Raw
        $process = Start-Process -FilePath "claude" -ArgumentList "-p", "`"$promptContent`"" -NoNewWindow -Wait -PassThru

        Pop-Location

        if ($process.ExitCode -eq 0) {
            Log-Progress "Completed $($story.id)"
            return $true
        } else {
            Log-Progress "Failed $($story.id) with exit code $($process.ExitCode)"
            Write-Err "Claude Code exited with code $($process.ExitCode)"
            return $false
        }
    }
    catch {
        Pop-Location
        Log-Progress "Error on $($story.id): $_"
        Write-Err "Error running Claude Code: $_"
        return $false
    }
    finally {
        Remove-Item $promptFile -ErrorAction SilentlyContinue
    }
}

# Main execution
Write-Host ""
Write-Host "+-----------------------------------------------------------+" -ForegroundColor Magenta
Write-Host "|                     RALPH v1.0                            |" -ForegroundColor Magenta
Write-Host "|         Autonomous PRD Runner for Claude Code             |" -ForegroundColor Magenta
Write-Host "+-----------------------------------------------------------+" -ForegroundColor Magenta

if ($Story -gt 0) {
    # Run specific story
    $targetStory = Get-StoryByNumber $Story
    if ($null -eq $targetStory) {
        Write-Err "Story US-$('{0:D3}' -f $Story) not found"
        exit 1
    }

    $success = Run-Story $targetStory
    if ($success -and -not $DryRun) {
        $confirm = Read-Host "Mark $($targetStory.id) as complete? (y/n)"
        if ($confirm -eq 'y') {
            Mark-Complete $targetStory.id
        }
    }
}
elseif ($All) {
    # Run all incomplete stories
    $remaining = $prd.userStories | Where-Object { -not $_.passes } | Sort-Object { $_.priority }

    if ($remaining.Count -eq 0) {
        Write-Success "All stories are complete!"
        Show-Status
        exit 0
    }

    Write-Info "Running $($remaining.Count) remaining stories..."

    foreach ($story in $remaining) {
        $success = Run-Story $story

        if (-not $DryRun) {
            if ($success) {
                $confirm = Read-Host "Mark $($story.id) as complete? (y/n/q to quit)"
                if ($confirm -eq 'q') {
                    Write-Warn "Stopping Ralph"
                    break
                }
                if ($confirm -eq 'y') {
                    Mark-Complete $story.id
                }
            }
            else {
                $continue = Read-Host "$($story.id) may have failed. Continue to next? (y/n)"
                if ($continue -ne 'y') {
                    break
                }
            }
        }
    }

    Show-Status
}
else {
    # Run next story
    $nextStory = Get-NextStory

    if ($null -eq $nextStory) {
        Write-Success "All stories are complete!"
        Show-Status
        exit 0
    }

    $success = Run-Story $nextStory

    if ($success -and -not $DryRun) {
        $confirm = Read-Host "Mark $($nextStory.id) as complete? (y/n)"
        if ($confirm -eq 'y') {
            Mark-Complete $nextStory.id
        }
    }
}

Write-Host ""
