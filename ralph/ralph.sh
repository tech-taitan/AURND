#!/bin/bash
#
# Ralph - Autonomous PRD Runner for Claude Code
#
# Usage:
#   ./ralph.sh           # Run next incomplete story
#   ./ralph.sh --all     # Run all incomplete stories
#   ./ralph.sh --story 3 # Run specific story (US-003)
#   ./ralph.sh --status  # Show progress status
#   ./ralph.sh --dry-run # Preview without executing

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PRD_FILE="$SCRIPT_DIR/prd.json"
PROGRESS_FILE="$SCRIPT_DIR/progress.txt"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Parse arguments
ALL=false
STATUS=false
DRY_RUN=false
STORY_NUM=0

while [[ $# -gt 0 ]]; do
    case $1 in
        --all|-a)
            ALL=true
            shift
            ;;
        --status|-s)
            STATUS=true
            shift
            ;;
        --dry-run|-d)
            DRY_RUN=true
            shift
            ;;
        --story|-n)
            STORY_NUM="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Check dependencies
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is required. Install with: brew install jq (mac) or apt install jq (linux)${NC}"
    exit 1
fi

if [ ! -f "$PRD_FILE" ]; then
    echo -e "${RED}Error: prd.json not found at $PRD_FILE${NC}"
    exit 1
fi

# Load PRD data
PROJECT=$(jq -r '.project' "$PRD_FILE")
BRANCH=$(jq -r '.branchName' "$PRD_FILE")
TOTAL_STORIES=$(jq '.userStories | length' "$PRD_FILE")

# Show status
show_status() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  RALPH STATUS: $PROJECT${NC}"
    echo -e "${CYAN}  Branch: $BRANCH${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo ""

    completed=0
    for i in $(seq 0 $((TOTAL_STORIES - 1))); do
        id=$(jq -r ".userStories[$i].id" "$PRD_FILE")
        title=$(jq -r ".userStories[$i].title" "$PRD_FILE")
        passes=$(jq -r ".userStories[$i].passes" "$PRD_FILE")

        if [ "$passes" = "true" ]; then
            echo -e "  ${GREEN}✓ $id: $title${NC}"
            ((completed++))
        else
            echo -e "  ${GRAY}○ $id: $title${NC}"
        fi
    done

    echo ""
    echo -e "${CYAN}  Progress: $completed / $TOTAL_STORIES stories completed${NC}"
    echo ""
}

if [ "$STATUS" = true ]; then
    show_status
    exit 0
fi

# Get next incomplete story index
get_next_story_index() {
    for i in $(seq 0 $((TOTAL_STORIES - 1))); do
        passes=$(jq -r ".userStories[$i].passes" "$PRD_FILE")
        if [ "$passes" = "false" ]; then
            echo "$i"
            return
        fi
    done
    echo "-1"
}

# Get story index by number
get_story_index_by_number() {
    local num=$1
    local id=$(printf "US-%03d" "$num")
    for i in $(seq 0 $((TOTAL_STORIES - 1))); do
        story_id=$(jq -r ".userStories[$i].id" "$PRD_FILE")
        if [ "$story_id" = "$id" ]; then
            echo "$i"
            return
        fi
    done
    echo "-1"
}

# Build prompt for story
build_prompt() {
    local idx=$1
    local id=$(jq -r ".userStories[$idx].id" "$PRD_FILE")
    local title=$(jq -r ".userStories[$idx].title" "$PRD_FILE")
    local desc=$(jq -r ".userStories[$idx].description" "$PRD_FILE")
    local criteria=$(jq -r ".userStories[$idx].acceptanceCriteria | map(\"- \" + .) | join(\"\n\")" "$PRD_FILE")

    cat << EOF
# Task: $id - $title

## Description
$desc

## Acceptance Criteria
$criteria

## Instructions
1. Implement this user story completely
2. Ensure all acceptance criteria are met
3. Run typecheck (npm run lint) before finishing
4. Do NOT move on to other stories - only complete this one
5. When done, summarize what was implemented

Project: $PROJECT
Branch: $BRANCH
EOF
}

# Log progress
log_progress() {
    local msg="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $msg" >> "$PROGRESS_FILE"
}

# Mark story as complete
mark_complete() {
    local story_id=$1
    local tmp_file=$(mktemp)

    jq --arg id "$story_id" '
        .userStories |= map(if .id == $id then .passes = true else . end)
    ' "$PRD_FILE" > "$tmp_file" && mv "$tmp_file" "$PRD_FILE"

    echo -e "${GREEN}Marked $story_id as complete${NC}"
}

# Run a single story
run_story() {
    local idx=$1
    local id=$(jq -r ".userStories[$idx].id" "$PRD_FILE")
    local title=$(jq -r ".userStories[$idx].title" "$PRD_FILE")
    local desc=$(jq -r ".userStories[$idx].description" "$PRD_FILE")

    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  RUNNING: $id - $title${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${GRAY}Description: $desc${NC}"
    echo ""
    echo -e "${GRAY}Acceptance Criteria:${NC}"
    jq -r ".userStories[$idx].acceptanceCriteria[]" "$PRD_FILE" | while read -r ac; do
        echo -e "${GRAY}  • $ac${NC}"
    done
    echo ""

    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY RUN] Would execute Claude Code with the above prompt${NC}"
        echo ""
        echo -e "${YELLOW}Prompt that would be sent:${NC}"
        echo -e "${GRAY}"
        build_prompt "$idx"
        echo -e "${NC}"
        return 0
    fi

    log_progress "Starting $id: $title"

    # Create temp file with prompt
    local prompt_file=$(mktemp)
    build_prompt "$idx" > "$prompt_file"

    echo -e "${CYAN}Launching Claude Code...${NC}"
    echo ""

    # Run Claude Code
    cd "$PROJECT_ROOT"

    if claude --print < "$prompt_file"; then
        log_progress "Completed $id"
        rm -f "$prompt_file"
        return 0
    else
        local exit_code=$?
        log_progress "Failed $id with exit code $exit_code"
        echo -e "${RED}Claude Code exited with code $exit_code${NC}"
        rm -f "$prompt_file"
        return 1
    fi
}

# Main
echo ""
echo -e "${MAGENTA}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║                     RALPH v1.0                            ║${NC}"
echo -e "${MAGENTA}║         Autonomous PRD Runner for Claude Code             ║${NC}"
echo -e "${MAGENTA}╚═══════════════════════════════════════════════════════════╝${NC}"

if [ "$STORY_NUM" -gt 0 ]; then
    # Run specific story
    idx=$(get_story_index_by_number "$STORY_NUM")
    if [ "$idx" = "-1" ]; then
        echo -e "${RED}Story US-$(printf '%03d' "$STORY_NUM") not found${NC}"
        exit 1
    fi

    if run_story "$idx"; then
        if [ "$DRY_RUN" = false ]; then
            id=$(jq -r ".userStories[$idx].id" "$PRD_FILE")
            read -p "Mark $id as complete? (y/n) " confirm
            if [ "$confirm" = "y" ]; then
                mark_complete "$id"
            fi
        fi
    fi

elif [ "$ALL" = true ]; then
    # Run all incomplete stories
    while true; do
        idx=$(get_next_story_index)
        if [ "$idx" = "-1" ]; then
            echo -e "${GREEN}All stories are complete!${NC}"
            show_status
            exit 0
        fi

        if run_story "$idx"; then
            if [ "$DRY_RUN" = false ]; then
                id=$(jq -r ".userStories[$idx].id" "$PRD_FILE")
                read -p "Mark $id as complete? (y/n/q to quit) " confirm
                case $confirm in
                    q) echo -e "${YELLOW}Stopping Ralph${NC}"; break ;;
                    y) mark_complete "$id" ;;
                esac
            fi
        else
            read -p "Story may have failed. Continue to next? (y/n) " cont
            if [ "$cont" != "y" ]; then
                break
            fi
        fi
    done

    show_status

else
    # Run next story
    idx=$(get_next_story_index)
    if [ "$idx" = "-1" ]; then
        echo -e "${GREEN}All stories are complete!${NC}"
        show_status
        exit 0
    fi

    if run_story "$idx"; then
        if [ "$DRY_RUN" = false ]; then
            id=$(jq -r ".userStories[$idx].id" "$PRD_FILE")
            read -p "Mark $id as complete? (y/n) " confirm
            if [ "$confirm" = "y" ]; then
                mark_complete "$id"
            fi
        fi
    fi
fi

echo ""
