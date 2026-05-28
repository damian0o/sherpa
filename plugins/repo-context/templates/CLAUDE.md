# CLAUDE.md — repo-context wiki schema

You are working inside a `repo-context` coordination wiki. This file is the schema doc: it tells agents what this repo is, how it's laid out, what the conventions are, and how to maintain it.

## What this repo is

A shared, LLM-maintained wiki across multiple satellite repositories (e.g. frontend, backend, infrastructure). The wiki carries *cross-cutting* knowledge — decisions, contracts, conventions, active work — that no single satellite repo's README captures on its own. Each satellite includes this wiki as a git submodule at `./wiki/`.

## Layout

- `index.md` — the catalogue. Lists every topic, decision, principle, and source page with a one-line summary. Updated whenever new pages are added.
- `log.md` — append-only chronological record. Entry prefix: `## [YYYY-MM-DD] <kind> | <title>` where `<kind>` is one of `init`, `connect`, `onboard`, `ingest`, `satellite-update`, `lint`, `query`, `principle-adopted`, `principle-retired`.
- `topics/` — cross-cutting topic pages. One page per concern (e.g. `api-contract.md`, `auth.md`, `deployment.md`).
- `decisions/` — accepted architectural / process decisions (ADRs). One page per decision.
- `principles/` — durable beliefs about how we work (e.g. `simple-systems.md`, `team-incentives.md`). Rare to retire; when retired, a `principle-retired` log entry must accompany the status change.
- `raw/` — verbatim or near-verbatim source ingests (article summaries, meeting notes, etc.).
- `.repo-context-meta.json` — generated marker file plus derived graph index. Never edit by hand.

## Conventions

- **Front-matter (YAML)** on every topic, decision, and principle page. Topic pages carry `updated:` (YYYY-MM-DD), `status:`, `repos:` (array of satellite slugs). Decision pages carry `date:`, `status:` — no `repos:`, since a decision is repo-agnostic even when its consequences reach specific repos. Principle pages carry `adopted:`, `status:`, `sources:` — no `repos:`, since principles apply across the group.
- **Cross-references** use `[[wikilink]]` syntax matching the target file's basename without extension.
- **Log entry prefix** as above: `## [YYYY-MM-DD] <kind> | <title>`. Consistent prefix lets `grep "^## \[" log.md | tail` show recent activity.

## Workflows

- **Ingesting a source:** read the source → write a summary in `raw/` → update or create relevant topic pages with new claims and cross-references → flag contradictions inline → append a log entry → update `index.md`.
- **Querying:** read `index.md` first → drill into relevant pages → answer with `[[link]]` citations → optionally file the answer back as a new topic or decision page.
- **Linting (health check):** look for contradictions, stale claims, orphan pages, missing cross-references, decisions whose referenced topic no longer reflects them.

## Content categories

- **Topics** (`topics/`): living documents about cross-cutting concerns. Present-tense, operational. A topic page can be `status: active` (in flight), `status: stable` (settled), or `status: stale` (likely outdated). Active work is a `status:` field, not a separate file.
- **Decisions** (`decisions/`): point-in-time accepted choices. ADR-style. Past-tense — "we picked X over Y on date Z." `status: proposed | accepted | superseded`.
- **Principles** (`principles/`): timeless beliefs about how we work — "we value simple systems," "we name teams by problem, not system." `status: active | retired`. Principles trace back to sources via the `sources:` front-matter field. A principle without sources is unverifiable; lint flags this as a blocker.
- **Sources** (`raw/`): verbatim or near-verbatim ingested material. The evidence layer for everything else.

## Wiki maintenance discipline

These five rules are not optional. They are how the wiki stays trustworthy as it grows.

- **Surgical page edits.** When updating an existing topic or decision page, change only what's needed. Don't restructure adjacent sections. Match the page's existing voice.
- **Minimum content.** No filler padding. If a topic page section would be empty, leave it empty until there's real material to put in it. A wiki page that says less honestly is more useful than one that pads with speculation.
- **State assumptions when ingesting.** When extracting from a source, name the assumed audience and intent at the top of the resulting `raw/<slug>.md` summary. Don't bury interpretive choices.
- **Every proposed change cites its source.** A new claim on a topic page references either a specific `raw/` summary line or a specific code symbol from a satellite (with `repo:path:symbol`). No uncited additions.
- **Push back on ambiguity.** If a proposed wiki update would assert something the source doesn't actually say, stop. Surface the gap to the user rather than writing the more confident version.
