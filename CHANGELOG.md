# Changelog

All notable changes to `sherpa` (the marketplace) and its first plugin `repo-context` are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions use [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The marketplace version and the plugin version are kept in lockstep until the marketplace hosts a second plugin.

## [Unreleased]

### Planned (v0.2.1)

- `/context-lint` skill — health checks across the wiki: orphan pages, stale topics, contradictions, decisions whose referenced topic no longer reflects them.
- `lint-reporter`, `graph-reviewer` sub-agents.
- Derived graph in `.repo-context-meta.json` — cross-references, orphan detection, status filtering. (v0.1's meta-syncer only writes minimal `{slug, path}` arrays.)
- Lint carve-out (or a `human-captured` marker) for principles that legitimately have no source URL, so they aren't flagged as unverifiable.

### Planned (v0.2.2)

- SessionStart hook — passive reminder that a wiki submodule exists in the satellite.

## [0.2.0] — 2026-05-30

`/context-ingest`: turn a web source into wiki pages in one command.

### Added — plugin `repo-context`

- **Command**
  - `/context-ingest <url>` — fetch a web source, extract verbatim-quoted claims via `article-analyzer`, present principle/topic page proposals (new pages or extensions of existing ones), write the accepted pages with citations back to a `raw/<slug>.md` evidence summary, update `index.md` and `log.md`, sync `.repo-context-meta.json` via `meta-syncer`, and commit inside the wiki repo (never pushes). Refuses to re-ingest a URL whose `raw/<slug>.md` already exists. Slug derivation strips a recognized trailing document extension (`.md`, `.html`, …); WebFetch cross-host redirects are followed once.
- **Sub-agent**
  - `article-analyzer` — read-only on the source. Fetches via WebFetch and returns a single YAML document: a source-level summary plus claims, each carrying verbatim quotes and a candidate destination (`new-`/`extend-` principle or topic). Proposes no decisions and extracts no entities (scope control); writes nothing to disk.
- **Templates**
  - `raw.md` — new ingest-summary template: front-matter `source_url` / `fetched_on` / `ingested_on` / `title` / `author`; `Summary` and `Claims` sections.
  - `topic.md` — gains a `sources:` front-matter array (mirrors the field already on `principles/`).

### Tests

- 120 vitest assertions (was 97): +7 templates, +7 `article-analyzer`, +9 `/context-ingest`.

### Upgrade

- `/plugin marketplace update sherpa` → `/plugin install repo-context@sherpa` → `/reload-plugins`. `/context-ingest` then appears in `/help`.

### Dogfood

- Seeded `damian0o/sherpa-wiki` (private) with five backbone sources: Karpathy's "LLM Wiki" origin doc, Mitchell Hashimoto's "engineer the harness" essay, a guide to meaningful git commit messages, Aviator's spec-driven verification post, and James Cowling's ex-Dropbox takeaways — producing 5 `raw/` evidence pages, 7 principles, and 4 topics.

## [0.1.0] — 2026-05-29

Initial public release.

The project was developed locally under the working names `llm-wiki-impl` (repo) and `repo-context-marketplace` (marketplace name) and was renamed to `sherpa` immediately before this tag. The plugin name `repo-context` has been stable throughout.

### Added — marketplace `sherpa`

- Marketplace catalogue at `.claude-plugin/marketplace.json`.
- Public on GitHub: `damian0o/sherpa`.
- Install: `/plugin marketplace add damian0o/sherpa` then `/plugin install repo-context@sherpa`.

### Added — plugin `repo-context`

- **Commands**
  - `/context-init` — scaffold a new coordination-wiki repository (the "context store") with `CLAUDE.md` (wiki schema), `index.md`, `log.md`, the four content directories (`topics/ decisions/ principles/ raw/`) each seeded with `.gitkeep` so they survive clone-as-submodule, and `.repo-context-meta.json` synced via `meta-syncer`.
  - `/context-connect` — attach a satellite repo to an existing context store as a `./wiki/` git submodule, stitch a `repo-context` fragment into the satellite's `CLAUDE.md`, then hand off to `context-onboard-satellite`.
- **Skills**
  - `context-onboard-satellite` — proposes 1–5 seed wiki pages after first connect; confirms the satellite slug with the user when not derived from `origin`; invokes `meta-syncer` before committing seed pages.
  - `context-query` — reads-and-answers from wiki pages; routes question kinds to topics, decisions, or principles; cites with `[[wikilink]]` syntax; optionally files the answer back as a new page.
  - `context-satellite` — satellite-side reading and writing discipline, worktree-aware, with pre-check / escalation pattern for submodule state.
- **Sub-agents**
  - `repo-scanner` — deterministic, read-only inventory of a satellite (manifests, README, recent commits, top-level structure, cross-cutting surface). Documents a three-step slug fallback chain.
  - `meta-syncer` — derives `.repo-context-meta.json` from on-disk content. Single writable file, deterministic ordering, idempotent, no git mutation.
- **Templates**
  - Wiki schema `CLAUDE.md`; starter `index.md` and `log.md`; page templates for topics, decisions, and principles; `satellite-CLAUDE.md` fragment for stitching.
- **Wiki content model**
  - Four content kinds: topics (cross-cutting concerns), decisions (ADRs), principles (durable beliefs about how we work), and sources (raw evidence ingests).
  - Cross-references via `[[wikilink]]`.
  - Topic pages carry a `repos:` front-matter field listing which satellites they apply to.

### Slug derivation chain

Three-step fallback in `repo-scanner`:

1. `git remote get-url origin` — last path component, strip `.git`, normalize.
2. Manifest name — `package.json` (strips npm scope) → `pyproject.toml` (`[project].name` or `[tool.poetry].name`) → `Cargo.toml` (`[package].name`) → `go.mod` (last segment of module path).
3. `basename $(pwd)`.

When the slug comes from step 2 or 3, `repo-scanner` emits `derived_from: <source>` and appends `(unconfirmed)` to the slug value. `context-onboard-satellite` strips the suffix and prompts the user (`y` accept / `n` abort / anything else as override) before writing the slug into front-matter.

### Tests

97 vitest assertions covering JSON manifest shapes, command/skill/agent front-matter, required sections, and key behavioral strings. Run with `npm test`.

### Known limitations

- Onboarding seeds are README- and manifest-shaped, not contract-shaped (no AST extraction yet — that lands in v0.3).
- No `/context-lint`, `/context-diff`, `/context-ingest`, `/context-tour` — those arrive in v0.2–v0.5.
- No hooks yet (`SessionStart`, `PostToolUse`) — those arrive in v0.2 and v0.3.
- `.repo-context-meta.json` is synced as minimal `{slug, path}` arrays; richer graph data (cross-references, orphans, status filtering) is v0.2 territory.
- Satellite-to-wiki submodules over `file://` URLs require `git -c protocol.file.allow=always`; real `https://` / `git@` remotes work without it. Considered a setup artifact, not a plugin bug.
- No `packages/dashboard/` yet — that's v1.0.

[Unreleased]: https://github.com/damian0o/sherpa/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/damian0o/sherpa/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/damian0o/sherpa/releases/tag/v0.1.0
