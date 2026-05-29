# sherpa

A Claude Code marketplace for coordination and shared-understanding plugins. Its first plugin is **`repo-context`** — a shared coordination wiki maintained by Claude Code agents, usable in a single repository or shared across multiple satellite repositories (frontend, backend, infra, etc.) via git submodule.

This repo is the marketplace. The `repo-context` plugin's full design lives in [`docs/superpowers/specs/2026-05-27-repo-context-plugin-design.md`](docs/superpowers/specs/2026-05-27-repo-context-plugin-design.md).

## Status

**v0.1 (skeletal smoke test):** install path, `/context-init`, `/context-connect`, `context-onboard-satellite` with only the `repo-scanner` analyzer. The wiki content produced is README-shaped, not contract-shaped. v0.2+ deliver the headline cross-cutting context value.

## Install

```bash
/plugin marketplace add <this-repo-url>
/plugin install repo-context@sherpa
```

For local development:

```bash
/plugin marketplace add /path/to/this/repo
/plugin install repo-context@sherpa
```

## Quick start

1. `/context-init` in an empty directory to scaffold a context-store. Push it to a remote.
2. `/context-connect <store-url>` inside a satellite repo. The plugin adds the wiki as a submodule at `./wiki/` and runs onboarding to propose seed pages.

## Recommended companions

The plugin works standalone, but integrates with these companions when available:

- [`superpowers`](https://github.com/obra/superpowers) — workflow discipline (verification, parallel dispatch, planning).
- [`agency-agents`](https://github.com/msitarzewski/agency-agents) — engineering personas (code review, onboarding, git workflow).
- [`karpathy-guidelines`](https://github.com/multica-ai/andrej-karpathy-skills) — behavioral baseline for LLM coding.

And MCP servers (configured in `~/.claude/settings.json`): Figma, Playwright, GitHub, Slack, Jira / GitHub Projects / Linear.

## Development

```bash
npm install
npm test
```

See [`docs/superpowers/plans/`](docs/superpowers/plans/) for current implementation plans.

## Dogfooding (v0.1 acceptance)

Run this sequence end-to-end to validate the install / scaffold / connect / onboard path. It exercises the full v0.1 surface.

### Prerequisites

- Claude Code installed and authenticated.
- `git` available.
- One existing git repo to use as a satellite. Any repo will do.

### Steps

```bash
# 1. Install the plugin from this local marketplace.
/plugin marketplace add /path/to/llm-wiki-impl
/plugin install repo-context@sherpa

# 2. Create an empty directory for the wiki and scaffold it.
mkdir ~/playground/example-context-store && cd ~/playground/example-context-store
/context-init
# Verify scaffolded files:
ls -A                                              # → .git CLAUDE.md index.md log.md topics decisions principles raw .repo-context-meta.json
cat .repo-context-meta.json | python3 -m json.tool # → kind: repo-context-store, schema_version: 1, empty topics/decisions/principles arrays
git log --oneline                                  # → one commit: "Initialise repo-context store"

# 3. Push it to a remote (create a new repo on GitHub / GitLab).
git remote add origin <new-remote-url>
git push -u origin main

# 4. Inside an existing satellite repo, connect it.
cd /path/to/your/satellite-repo
/context-connect <new-remote-url>
# This should:
#   - Add wiki/ as a submodule.
#   - Stitch the repo-context section into the satellite's CLAUDE.md (creates it if missing).
#   - Invoke context-onboard-satellite, which runs repo-scanner and proposes 1–5 seed pages.
#   - You accept (or edit / reject) each. Accepted seeds are committed inside the wiki submodule.
#   - Append a log entry. Commit the satellite repo with "Add repo-context wiki submodule".
# Verify:
ls wiki/                                           # → CLAUDE.md index.md log.md topics/ decisions/ principles/ raw/ .repo-context-meta.json (plus any seeds)
cat wiki/log.md                                    # → init entry + connect entry + onboard entry
grep -A 3 "BEGIN repo-context" CLAUDE.md           # → the satellite fragment

# 5. Ask a question against the wiki.
# Type something like: "What does the wiki say about <something the seed page covered>?"
# Expected: Claude uses context-query, reads index.md, drills into the relevant topic, answers with [[wikilinks]].
```

### Acceptance criteria

v0.1 passes if all five steps above complete without errors AND the wiki ends up with:

- At least one topic page tagged with this satellite's slug in its `repos:` front-matter.
- A `log.md` containing the `init`, `connect`, and `onboard` entries in chronological order.
- The satellite's `CLAUDE.md` has the `BEGIN repo-context` … `END repo-context` block.

### Known v0.1 limitations (expected, not bugs)

- Onboarding seeds are README-shaped, not contract-shaped (no AST extraction yet — that's v0.3).
- No `/context-lint`, `/context-diff`, `/context-ingest`, `/context-tour` (those land in v0.2–v0.5). The wiki schema doc (`templates/CLAUDE.md`) describes lint, ingest, and querying as part of the steady-state system — the commands themselves arrive in later bands.
- No hooks (no SessionStart reminder, no PostToolUse hint — those land in v0.2–v0.3).
- The dashboard package is not yet built (v1.0).
