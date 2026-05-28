# repo-context

A Claude Code plugin that maintains a shared coordination wiki across multiple satellite repositories (frontend, backend, infra, etc.) connected via git submodule.

This repo is a single-plugin Claude Code marketplace. The plugin's full design lives in [`docs/superpowers/specs/2026-05-27-repo-context-plugin-design.md`](docs/superpowers/specs/2026-05-27-repo-context-plugin-design.md).

## Status

**v0.1 (skeletal smoke test):** install path, `/context-init`, `/context-connect`, `context-onboard-satellite` with only the `repo-scanner` analyzer. The wiki content produced is README-shaped, not contract-shaped. v0.2+ deliver the headline cross-cutting context value.

## Install

```bash
/plugin marketplace add <this-repo-url>
/plugin install repo-context@repo-context-marketplace
```

For local development:

```bash
/plugin marketplace add /path/to/this/repo
/plugin install repo-context@repo-context-marketplace
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
