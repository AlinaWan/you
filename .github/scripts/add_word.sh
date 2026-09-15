#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -ne 5 ]; then
    echo "ERROR: Expected 5 arguments: ID WORD DATE TAGS NOTE" >&2
    exit 1
fi

ID="$1"
WORD="$2"
DATE="$3"
TAGS="$4"
NOTE="$5"

if [ -z "$ID" ]; then
    echo "ERROR: ID cannot be empty." >&2
    exit 1
fi

if [ -z "$WORD" ]; then
    echo "ERROR: WORD cannot be empty." >&2
    exit 1
fi

if [ -z "$DATE" ]; then
    echo "ERROR: DATE cannot be empty." >&2
    exit 1
fi

TAGS=$(printf '%s' "$TAGS" |
    sed 's/[[:space:]]*,[[:space:]]*/,/g; s/^[[:space:]]*//; s/[[:space:]]*$//')

if [ -s words.txt ] && [ -n "$(tail -c 1 words.txt)" ]; then
    printf '\n' >> words.txt
fi

printf '%s\t%s\t%s\t%s\t%s\n' \
    "$ID" \
    "$WORD" \
    "$DATE" \
    "$TAGS" \
    "$NOTE" \
    >> words.txt

printf 'OK: Added word "%s" (%s)\n' "$WORD" "$ID"