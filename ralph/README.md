# Ralph - Autonomous PRD Runner

Ralph executes user stories from `prd.json` sequentially using Claude Code. Each story runs in a fresh session, ensuring clean context for each task.

## Quick Start

```powershell
# Windows (PowerShell)
cd ralph
.\ralph.ps1

# Unix/Mac (Bash) - requires jq
cd ralph
chmod +x ralph.sh
./ralph.sh
```

## Commands

| Command | Description |
|---------|-------------|
| `.\ralph.ps1` | Run next incomplete story |
| `.\ralph.ps1 -All` | Run all incomplete stories |
| `.\ralph.ps1 -Story 3` | Run specific story (US-003) |
| `.\ralph.ps1 -Status` | Show progress overview |
| `.\ralph.ps1 -DryRun` | Preview without executing |

Bash equivalents use `--all`, `--story 3`, `--status`, `--dry-run`.

## Files

- **prd.json** - User stories with acceptance criteria
- **progress.txt** - Execution log with timestamps
- **ralph.ps1** - PowerShell runner (Windows)
- **ralph.sh** - Bash runner (Unix/Mac)

## Workflow

1. Ralph reads `prd.json` and finds the next story where `passes: false`
2. Builds a prompt with the story's description and acceptance criteria
3. Launches Claude Code with the prompt
4. After completion, asks if you want to mark the story as complete
5. Updates `prd.json` and logs to `progress.txt`

## Story Format

```json
{
  "id": "US-001",
  "title": "Short title",
  "description": "As a [user], I want [feature] so that [benefit]",
  "acceptanceCriteria": [
    "Specific criterion 1",
    "Specific criterion 2",
    "Typecheck passes"
  ],
  "priority": 1,
  "passes": false,
  "notes": ""
}
```

## Tips

- **One story at a time**: Each Claude Code session handles exactly one story
- **Review before marking complete**: Check that acceptance criteria are actually met
- **Use dry-run first**: Preview what will be sent to Claude Code
- **Check status often**: `.\ralph.ps1 -Status` shows overall progress

## Requirements

- **Windows**: PowerShell 5.1+, Claude Code CLI (`claude`)
- **Unix/Mac**: Bash, jq, Claude Code CLI (`claude`)

## Manual Override

If a story needs manual intervention:
1. Edit the code yourself
2. Run `.\ralph.ps1 -Story N` to re-run just that story
3. Or manually set `"passes": true` in prd.json
