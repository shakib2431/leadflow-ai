---
name: gitPush pushes committed HEAD only
description: The gitPush callback pushes the current committed HEAD; uncommitted working-tree edits silently don't ship
---

# gitPush only ships committed HEAD

The `gitPush` CodeExecution callback pushes whatever commit `HEAD` points to. It does **not** stage or commit working-tree changes first. It returns `{success:true}` even when your latest edits are still uncommitted — so the push "succeeds" but GitHub receives nothing new.

**Why:** Replit's automatic checkpoint commit is not guaranteed to have fired by the time you call `gitPush` right after editing files. If it hasn't, HEAD is stale and the push carries old code. Symptom: user's `git pull` says "Already up to date" / still sees the old UI despite repeated "successful" pushes.

**How to apply:** Before calling `gitPush`, explicitly `git add <files> && git commit -m "..."`, then push. Always **verify** the push actually landed, don't trust the success flag:
- `git fetch origin && git rev-list --count origin/master..HEAD` → must be `0`
- `git show origin/master:<path> | grep -c '<marker from your change>'` → must be `>=1`

Do this verify step every time before telling the user to pull.
