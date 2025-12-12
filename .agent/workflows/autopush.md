---
description: Workflow to stage, commit, and push changes to the remote repository
---

This workflow should be run at the end of every significant task to ensure changes are synced to GitHub.

1. Check git status to see what has changed.
2. Add all changed files: `git add .`
3. Commit with a relevant message based on the recent changes.
4. Push to the remote repository: `git push origin master`

// turbo
5. Verify the push status.
