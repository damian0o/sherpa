<!-- BEGIN repo-context -->
## Shared context (repo-context wiki)

This repo is part of a coordination group. A shared wiki lives at `./wiki/` (git submodule).

- Read `./wiki/CLAUDE.md` first for conventions.
- Before significant cross-cutting work, scan `./wiki/index.md` and topic pages whose `repos:` front-matter includes this satellite.
- When you make a cross-repo decision or change a contract that affects other satellites, update the wiki (`./wiki/topics/` or `./wiki/decisions/`) and append an entry to `./wiki/log.md`.
- After commits that touch routes, schema, env vars, or container config, consider running `/context-diff` to propose wiki updates.

The `repo-context` plugin's skills (`context-satellite`, `context-diff`, `context-tour`) activate automatically while you work in this repo.
<!-- END repo-context -->
