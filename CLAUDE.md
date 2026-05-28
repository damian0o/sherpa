# CLAUDE.md — repo-context contributor guide

You are working in the `repo-context` plugin source repository. This is a Claude Code marketplace whose first plugin is `repo-context` — a shared coordination wiki across multiple satellite repos. The full design is in [`docs/superpowers/specs/2026-05-27-repo-context-plugin-design.md`](docs/superpowers/specs/2026-05-27-repo-context-plugin-design.md).

## Philosophy

The plugin's job is cross-repo coordination, not code-structure modelling. We maintain *text-shaped* knowledge — topics, decisions, log entries — about how a group of repos fit together. Code-structure analysis (AST, contracts extraction) is used to *populate* the wiki, but the wiki itself stays markdown.

## How this repo is organised

- `plugins/repo-context/` — the plugin itself (commands, skills, agents, templates).
- `.claude-plugin/marketplace.json` — the marketplace catalogue.
- `tests/` — vitest tests validating manifest JSON, markdown front-matter, and required sections.
- `docs/superpowers/specs/` — design documents.
- `docs/superpowers/plans/` — implementation plans (one per phasing band).

## Behavioral baseline

Every skill, sub-agent, and command in this plugin inherits four operational principles:

1. **Think before acting.** State assumptions, surface tradeoffs, push back when warranted.
2. **Simplicity first.** Minimum content / minimum mutation. No speculative abstractions.
3. **Surgical changes.** Touch only what's needed. Match existing style.
4. **Goal-driven, verifiable.** Every proposal cites its source. Every finding cites the page and line.

## Contributing rules

- TDD: write the failing test first.
- Commit messages do **not** include `Co-Authored-By:` trailers.
- Match the existing markdown style in plugin templates and skills (front-matter shape, section ordering).
- Update the relevant plan document in `docs/superpowers/plans/` as tasks complete.

## Useful commands

- `npm test` — run all vitest tests.
- `npm test -- <pattern>` — run tests matching a pattern.

## Recommended companions for *this* repo's development

- [`superpowers`](https://github.com/obra/superpowers) — for the brainstorming → writing-plans → executing-plans workflow.
- [`karpathy-guidelines`](https://github.com/multica-ai/andrej-karpathy-skills) — the behavioral baseline above.
