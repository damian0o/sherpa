---
name: context-init
description: Scaffold a new repo-context coordination wiki (the "context store") in the current directory. Use when the user wants to bootstrap a wiki that satellite repos will reference via git submodule.
argument-hint: "[target-directory]"
---

# /context-init

Scaffold a new `repo-context` coordination-wiki repository (the "context store") at the user's target directory.

## Preconditions

1. The target directory is either empty or only contains a `.git/` directory. If non-empty in any other way, STOP and surface the situation to the user — do not overwrite.
2. The user has `git` available in the shell.

If the user provided an argument, use that as the target directory. Otherwise, target the current working directory. Confirm with the user before writing if the target is ambiguous.

## Steps

Execute these steps in order. Each step that performs a filesystem or git mutation must use the Bash tool.

1. **Confirm target is acceptable.** Run `ls -A <target>`. If it returns anything other than `.git` (or nothing), STOP. Show the user what's there and ask what to do.
2. **Initialise git if needed.** If `<target>/.git` doesn't exist, run `git init <target>`.
3. **Copy templates.** From the plugin's `templates/` directory, copy the following files into `<target>`:
   - `templates/CLAUDE.md` → `<target>/CLAUDE.md`
   - `templates/index.md` → `<target>/index.md`
4. **Render `log.md` with today's date.** Read `templates/log.md`, replace `{{date}}` with today's ISO date (YYYY-MM-DD), and write the result to `<target>/log.md`.
5. **Create directories.** Create the four content-category directories under `<target>`: `topics/`, `decisions/`, `principles/`, `raw/`. Run `mkdir -p <target>/topics/ <target>/decisions/ <target>/principles/ <target>/raw/`.
6. **Drop `.gitkeep` sentinel files.** Write empty files at `<target>/topics/.gitkeep`, `<target>/decisions/.gitkeep`, `<target>/principles/.gitkeep`, and `<target>/raw/.gitkeep`. Use the Bash tool: `touch <target>/topics/.gitkeep <target>/decisions/.gitkeep <target>/principles/.gitkeep <target>/raw/.gitkeep`. These sentinel files ensure the four content directories survive `git clone` (git does not track empty directories).
7. **Sync `.repo-context-meta.json` via `meta-syncer`.** Use the Task tool with `subagent_type: "meta-syncer"`. Pass `<target>` as the wiki root. The sub-agent writes the initial marker file (empty `topics/decisions/principles` arrays, today's ISO date). Verify the sub-agent returns a line matching `meta-syncer: synced <target>/.repo-context-meta.json` before proceeding.
8. **Initial commit.** Run `git -C <target> add . && git -C <target> commit -m "Initialise repo-context store"`.
9. **Prompt the user to push.** Tell the user:
   - The store has been initialised.
   - To use it from satellite repos, push it to a remote and copy the remote URL.
   - The next step from any satellite repo is `/context-connect <remote-url>`.

## Idempotency

`/context-init` is intentionally non-idempotent: re-running it in a non-empty target refuses to proceed (step 1). To re-initialise, the user must clear or move the existing content first.

## Behavioral baseline

Follow the four operational principles from this plugin's contributor `CLAUDE.md` — think before acting (confirm the target), simplicity first (don't add content not in templates), surgical changes (only touch the target directory), goal-driven (verify each file landed before claiming success).
