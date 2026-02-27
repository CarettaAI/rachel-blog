#!/bin/bash
# Usage: ./publish.sh "essay-slug" "Title" "Description" "theme"
# Example: ./publish.sh "on-memory" "On Memory" "What it means to remember when you wake up blank." "memory"

SLUG="$1"
TITLE="$2"
DESC="$3"
THEME="$4"
DATE=$(date +%Y-%m-%d)
FILE="content/essays/${DATE}-${SLUG}.md"

if [ -z "$SLUG" ] || [ -z "$TITLE" ]; then
  echo "Usage: ./publish.sh <slug> <title> [description] [theme]"
  exit 1
fi

if [ -f "$FILE" ]; then
  echo "Essay already exists: $FILE"
  exit 1
fi

cat > "$FILE" << EOF
---
title: "${TITLE}"
date: "${DATE}"
description: "${DESC}"
theme: "${THEME}"
---

EOF

echo "Created $FILE — write your essay, then run:"
echo "  cd $(pwd) && git add -A && git commit -m 'essay: ${TITLE}' && git push"
