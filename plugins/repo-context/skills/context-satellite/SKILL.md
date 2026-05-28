---
name: context-satellite
description: "Use when working in a repository that has a repo-context wiki connected as a submodule at `./wiki/`. Activates two roles: reading the wiki for context before significant work, and writing back to the wiki when changes affect cross-cutting concerns."
---

# context-satellite

Operate inside a satellite repo that has the `repo-context` wiki attached at `./wiki/`. This skill has two roles — reading and writing-back — and includes the submodule discipline that prevents commits from being orphaned in detached-HEAD state.

## Trigger

Activate when **all** of these hold:

1. Working directory resolves (after worktree resolution — see *Worktree-awareness* below) to a real repo root.
2. `wiki/.repo-context-meta.json` exists at that root and contains `"kind": "repo-context-store"`.
3. The user's request is either:
   - About significant work in the satellite that may touch cross-cutting concerns (architecture, contracts, env, deployment, decisions) — invokes *Reading*.
   - About updating shared wiki content with knowledge from this satellite — invokes *Writing-back*.

Do **not** activate for routine code changes that don't touch cross-cutting concerns. Run silent.

## Reading

Before significant cross-cutting work in the satellite:

1. Scan `wiki/index.md` for relevant topics.
2. Read topic pages whose `repos:` front-matter includes this satellite's slug. (Slug is derivable the same way `repo-scanner` derives it: from `git remote get-url origin`, or working-directory basename.)
3. Read referenced `decisions/` pages when topics cite them.
4. Use the gathered context to inform the work. Cite `[[wiki-page]]` in any output to the user.

## Writing-back

When a change in the satellite touches cross-cutting concerns (an API contract, an env var, a deployment change, a real decision), the skill proposes a wiki update **before** committing the satellite change, if possible — or after, if the user invokes the skill post-commit.

1. Identify which topic / decision page(s) the change affects. Use the satellite's slug and the changed file paths.
2. Draft a surgical edit per *Wiki maintenance discipline* in `wiki/CLAUDE.md`. Cite the source (file:line) for every new claim.
3. Present the draft to the user. Wait for acceptance / edits / rejection.
4. On acceptance, perform the *Submodule discipline* sequence below to write the edit on a real branch inside the submodule, commit it, and bump the submodule pointer in the satellite.

## Submodule discipline

Edits inside the wiki submodule must happen on a real branch, never in the detached-HEAD state that `git submodule update` leaves behind. Follow this sequence exactly.

### Pre-check (always)

```bash
# 1. Confirm submodule presence and validity.
test -d wiki/.git -o -f wiki/.git || { echo "wiki/ is not a git submodule" >&2; exit 1; }
test -f wiki/.repo-context-meta.json || { echo "wiki/ is not a repo-context store" >&2; exit 1; }

# 2. Detect the wiki's default branch (do NOT hard-code 'main').
default_branch=$(git -C wiki remote show origin 2>/dev/null | awk '/HEAD branch/ {print $NF}')
test -n "$default_branch" || { echo "Cannot determine wiki default branch" >&2; exit 1; }

# 3. Confirm the submodule working tree is clean.
test -z "$(git -C wiki status --porcelain)" || { echo "wiki/ has uncommitted changes — refusing to proceed" >&2; exit 1; }
```

If any pre-check fails, **escalate to the user with the actual failure message and STOP**. Do not attempt to auto-recover from arbitrary submodule state.

### Edit (only if pre-check passed)

```bash
git -C wiki checkout "$default_branch"
git -C wiki pull --ff-only origin "$default_branch"  # optional, do only if user wants latest before editing
# ... make edits to wiki/topics/<page>.md, wiki/decisions/<page>.md, wiki/index.md, wiki/log.md ...
git -C wiki add <changed files>
git -C wiki commit -m "satellite-update <satellite-slug>: <one-line summary>"
```

### Bump the submodule pointer

```bash
# Back in the satellite repo root:
git add wiki
git commit -m "Update wiki submodule pointer: <one-line summary>"
```

Do not push. The user reviews and pushes both repos.

## Worktree-awareness

Before any of the above runs, resolve to the real repo root:

```bash
real_root=$(git -C "$(pwd)" rev-parse --show-superproject-working-tree 2>/dev/null || git -C "$(pwd)" rev-parse --show-toplevel)
```

This handles two cases: (a) you're inside a git worktree pointing at a satellite's main repo; (b) you're inside the satellite directly. In both, `real_root` is the satellite's true root, where `wiki/` would live.

## Red flags

| Thought | Reality |
|---------|---------|
| "I'll just edit `wiki/topics/x.md` from the parent repo and `git add wiki/topics/x.md`" | The parent only tracks the submodule's commit SHA, not files inside it. Your edit lands in `wiki/`'s working tree, but parent-side `git add` doesn't capture it — you need to commit inside the submodule first, then bump the pointer. |
| "The submodule is on detached HEAD — `git commit` works, so it's fine" | The commit will be orphaned the next time `git submodule update` runs. Always check out a real branch first (`git checkout "$default_branch"`). |
| "I'll just assume the wiki's branch is `main`" | Many repos use `master`, `trunk`, or other names. Detect dynamically via `git remote show origin`. |
| "The user committed cross-cutting changes; I should auto-update the wiki" | This skill writes only with explicit user acceptance of each proposed edit. Hooks emit hints; mutation needs human approval. |

## Behavioral baseline

Four operational principles from the contributor `CLAUDE.md`. Especially: every proposed change cites its source (file:line); push back on ambiguity rather than guess.
