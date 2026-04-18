#!/bin/bash

changed_files="$(git diff-tree -r --name-only --no-commit-id ORIG_HEAD HEAD)"

if echo "$changed_files" | grep --quiet -E "package\.json"; then
  yarn
fi
