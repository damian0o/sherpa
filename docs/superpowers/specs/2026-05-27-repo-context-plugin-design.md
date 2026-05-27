# repo-context — design

A Claude Code plugin that instantiates the LLM-maintained coordination-wiki pattern described in `TODO.md`. It lets a user set up a shared "context store" repo and connect any number of satellite repos (frontend, backend, infra, etc.) to it as git submodules, so agents working in any one satellite can read shared cross-cutting context and write back changes that affect the group.

The plugin is published to a single-plugin Claude Code marketplace hosted in this repository.

## Goal

Give a developer who maintains several repos that collaborate toward a common task (e.g. fe + be + infra) a turnkey way to stand up a shared, LLM-maintained wiki that every repo's agents can read from and contribute to. The user's own fe + be is the dogfooding target; the plugin must be generic enough for other repo groups too.

## Non-goals

- A bespoke wiki for one specific project. The deliverable is the plugin; populated wiki content is downstream.
- Per-repo entity pages. Each satellite repo already describes itself in its own `README.md`; the wiki exists for the *between-the-repos* concerns. (Easy to add later under `repos/` if the need appears.)
- A search/embedding layer over the wiki. Index-driven retrieval is sufficient at the intended scale; can be layered on later.
- Automatic pushing. All git mutations (submodule add, log entries, satellite commits) are staged locally; the user reviews and pushes.

## Approach (chosen)

Shape **C** of the three considered: one bootstrap command and one connect command, with the rest as context-activated skills. Rationale: the two commands make the unambiguous setup steps explicit and discoverable, while ongoing operations (ingest, query, lint, satellite read/write) benefit from the agent's judgment and are better expressed as skill instructions than as imperative scripts.

The wiki repo is referenced from each satellite as a **git submodule at `./wiki/`**, picked over alternatives because the user wants (a) per-satellite pinning of a known-good wiki version and (b) `git clone --recursive` to pull the wiki automatically on new machines.

## Repository layout

```
llm-wiki-impl/                       # this plugin repo
  .claude-plugin/
    plugin.json                      # plugin manifest (name: repo-context, version, …)
    marketplace.json                 # single-plugin marketplace declaration, source: "./"
  commands/
    context-init.md                  # /context-init slash command
    context-connect.md               # /context-connect slash command
  skills/
    context-ingest/SKILL.md
    context-query/SKILL.md
    context-lint/SKILL.md
    context-satellite/SKILL.md
    context-onboard-satellite/SKILL.md
  templates/
    CLAUDE.md                        # schema doc written into the context-store
    index.md                         # starter index
    log.md                           # starter log
    satellite-CLAUDE.md              # fragment stitched into satellite CLAUDE.md
    topic.md                         # topic-page template
    decision.md                      # ADR template
  docs/
    superpowers/specs/               # design docs and plans live here
  README.md
  LICENSE
```

The directory inside a satellite repo where the submodule lives is hard-coded to `wiki/` in v1.

## Plugin surface

### Slash commands

#### `/context-init`

Run from an empty directory the user wants to become the context-store repo, or from anywhere with a target-path argument. Instructs the agent to:

1. Confirm target directory; bail if non-empty.
2. `git init` if not already a repo.
3. Copy `templates/CLAUDE.md`, `templates/index.md`, `templates/log.md` into the target.
4. Create directories: `topics/`, `decisions/`, `raw/`.
5. Write `.repo-context-meta.json` with `{"kind": "repo-context-store", "schema_version": 1}`. This is the marker file the skills use to detect "I am inside a context-store".
6. Initial commit.
7. Prompt the user to push to a remote and remind them that URL is needed for `/context-connect`.

#### `/context-connect <wiki-url>`

Run from inside a satellite repo. Instructs the agent to:

1. Verify current directory is a git repo; verify no existing `wiki/` submodule.
2. `git submodule add <wiki-url> wiki`.
3. `git submodule update --init --recursive` (defensive).
4. Stitch `templates/satellite-CLAUDE.md` into the satellite repo's `CLAUDE.md` between delimited markers so re-runs replace the section instead of duplicating it.
5. **Invoke the `context-onboard-satellite` skill** to seed the wiki with what already exists in this satellite repo.
6. Append a `## [DATE] connect | <satellite repo name>` entry to `wiki/log.md` (staged in the submodule, not pushed).
7. Stage and commit the satellite repo: "Add repo-context wiki submodule". Not pushed.

### Skills

Each skill ships as `skills/<name>/SKILL.md` with a `description` front-matter field that tells Claude when to activate. Skills are silent in repos that lack the marker file.

#### `context-ingest`

*Activate when:* the user adds a source to a context-store repo (working directory contains `.repo-context-meta.json`) and asks to ingest, process, or summarise it.

*Procedure:*

1. Read the source.
2. Discuss key takeaways with the user.
3. Write a summary into `raw/<slug>.md`.
4. Identify the topic pages in `topics/` that the source touches; create new topic pages from `templates/topic.md` if needed.
5. Update the topic pages with new claims and `[[wiki-link]]` cross-references.
6. Flag contradictions inline with the convention `> ⚠️ contradicts [[other-page]]: <reason>`.
7. Append `## [DATE] ingest | <source title>` to `log.md`.
8. Update `index.md` if new pages were created.

#### `context-query`

*Activate when:* the user asks a question and the working directory, or any parent / submodule, contains `.repo-context-meta.json`.

*Procedure:*

1. Read `index.md` first.
2. Drill into relevant pages.
3. Synthesise the answer with `[[link]]` citations.
4. After answering, offer to file the answer back as a new `topics/<slug>.md` or `decisions/<slug>.md` when the answer represents something worth keeping.

#### `context-lint`

*Activate when:* the user asks to health-check, audit, or lint the context-store.

*Procedure:* generate a report (do not auto-fix) covering:

- Contradictions between pages.
- Stale claims newer sources have superseded.
- Orphan pages with no inbound `[[links]]`.
- Concepts repeatedly mentioned across pages but lacking their own page.
- Missing cross-references where two pages clearly relate.
- Decisions in `status: accepted` whose referencing `topics/` page no longer reflects them.

Each finding includes a concrete suggested fix.

#### `context-satellite`

*Activate when:* working in a repo where `wiki/.repo-context-meta.json` exists (i.e. a satellite with the submodule connected).

*Procedure has two roles:*

**Reading** — before significant work in the satellite repo, scan `wiki/index.md` and any topic pages whose `repos:` front-matter includes the current repo's name. Use that context to inform the work.

**Writing back** — when a change in the satellite touches cross-cutting concerns (API contract, env var, deployment, a real decision), update the corresponding `wiki/topics/*.md` page or add a `wiki/decisions/*.md` entry, append a `## [DATE] satellite-update | <repo>: <summary>` line to `wiki/log.md`, and stage the changes inside the submodule.

**Submodule discipline (non-obvious, must be in the skill):** edits must be made on a real branch inside the submodule, not in the detached HEAD that `git submodule update` leaves you in. The skill instructs the agent to `cd wiki && git checkout main && <edits> && git add … && git commit` from inside `wiki/`, then come back to the satellite to update the submodule pointer. Without this discipline the commits become orphaned.

#### `context-onboard-satellite`

*Activate when:* invoked by `/context-connect`, or when the user explicitly asks to re-onboard a connected satellite.

*Procedure:*

1. **Detect repo character.** Read `README.md`, the satellite's own `CLAUDE.md` if any, manifest files (`package.json`, `pyproject.toml`, `go.mod`, …), `Dockerfile` / `compose.yml`, `.env.example`. Skim recent commits (`git log --oneline -30`). Identify the repo's purpose, stack, what it exposes, key directories.
2. **Read what's already in the wiki.** `wiki/index.md` and `wiki/topics/*.md` whose `repos:` front-matter overlaps with this satellite's name. This is what makes the *second* satellite onboarding reconcile rather than duplicate.
3. **Propose seed pages.** Draft (but do not write yet) a list of seeds covering observed cross-cutting concerns — API endpoints, shared env vars, deployment story, runtime constraints, conventions. Map each item to either a new `topics/<slug>.md` or an extension of an existing topic page.
4. **Show the proposal to the user** as a bullet list of "+ new topics/api-contract.md (covers REST routes in be/src/routes/)" / "+ extend topics/auth.md (adds be-side JWT validation)". The user can accept all, accept some, edit individual items, or reject.
5. **Write accepted seeds.** Update `index.md`. Append a single `## [DATE] onboard | <satellite repo>` entry summarising what was added.
6. Return control to `/context-connect`.

### Templates

#### `templates/CLAUDE.md` — schema doc written into the context-store

Contents (high level):

- **What this repo is.** A coordination wiki across multiple satellite repos.
- **Layout.** `index.md`, `log.md`, `topics/`, `decisions/`, `raw/`, `.repo-context-meta.json`.
- **Conventions.**
  - Front-matter on every page: `updated:`, `status:`, `repos:`.
  - Cross-references via `[[link]]`.
  - Log entries prefixed `## [YYYY-MM-DD] <kind> | <title>`, where `<kind>` is one of `init`, `connect`, `ingest`, `onboard`, `satellite-update`, `lint`, `query`.
- **Workflows.** When ingesting / querying / linting (mirrors what the skills do, but written for human readers and for sessions where the plugin isn't installed).
- **Content categories.** Topics, decisions, active work. Active work is **a `status:` field on topic pages**, not a separate file — keeping status co-located with the thing it describes.

#### `templates/index.md`

```
# Index
## Topics
(none yet)
## Decisions
(none yet)
## Sources
(none yet)
```

#### `templates/log.md`

```
# Log
## [YYYY-MM-DD] init | context store created
```

(YYYY-MM-DD substituted at scaffold time.)

#### `templates/topic.md`

```
---
updated: YYYY-MM-DD
status: active | stable | stale
repos: [fe, be]
---
# <Topic name>

## Summary

## Current state

## Decisions referenced

## Open questions

## Sources
```

#### `templates/decision.md`

```
---
date: YYYY-MM-DD
status: proposed | accepted | superseded
supersedes: [[<other-decision>]]
---
# <Decision title>

## Context

## Decision

## Consequences
```

#### `templates/satellite-CLAUDE.md`

```
<!-- BEGIN repo-context -->
## Shared context (repo-context wiki)
This repo is part of a coordination group. A shared wiki lives at `./wiki/` (git submodule).
Read `./wiki/CLAUDE.md` first for conventions. When you make a cross-repo decision or change
a contract that affects other satellites, update the wiki (`./wiki/topics/` or
`./wiki/decisions/`) and append an entry to `./wiki/log.md`.
<!-- END repo-context -->
```

## Detection mechanism

Skills discriminate on one marker file:

- `.repo-context-meta.json` at the repo root → this is a context-store; activate `context-ingest`, `context-query`, `context-lint`.
- `wiki/.repo-context-meta.json` exists → this is a satellite with the submodule connected; activate `context-satellite` (and `context-onboard-satellite` when invoked).
- No marker → no plugin skill activates. The plugin is silent in unrelated repositories.

The marker file is written by `/context-init` (into the store) and reaches each satellite automatically via the submodule.

## Marketplace shape

`.claude-plugin/marketplace.json` declares this repo as a single-plugin marketplace exposing `repo-context`. Installation:

```
claude plugin marketplace add <this-repo-url>
claude plugin install repo-context
```

A second plugin can be added to the same marketplace later without restructuring.

## Dogfooding plan (acceptance for v1)

Sequence the user runs once the plugin is built. Assumes at least two real satellite repos are available (the user's case is `fe` and `be`, but any two will exercise the reconciliation path).

1. Install from local path: `claude plugin marketplace add ./` (from this directory), then install `repo-context`.
2. Create an empty directory for the context store, `cd` into it, run `/context-init`, push to a remote.
3. From the first satellite repo: `/context-connect <store-url>`. The onboarding skill scans the repo and proposes seed pages; the user reviews and accepts.
4. From the second satellite repo: `/context-connect <store-url>`. The onboarding skill reconciles against what the first satellite contributed and proposes extensions / merges, not duplicates.
5. Use the wiki for ~a week of real work across both satellites — ingest a source, ask a query, run a lint. Capture friction.

v1 is considered acceptance-passed when (a) the user reports that cross-repo coordination feels concretely better (the wiki is being read before significant changes and updated after them), and (b) the second-satellite onboarding produced extensions rather than duplicate topic pages.

## Resolved design choices (recorded so they don't drift)

- **`.repo-context-meta.json` schema for v1** is exactly `{"kind": "repo-context-store", "schema_version": 1}`. No further fields. Adding fields later means bumping `schema_version` and updating the skills' detection logic.
- **`context-satellite` does not auto-scan diffs.** It relies on the agent's judgment, with the skill description naming typical triggers (API contract change, env var addition, deployment change, runtime/version bump, an explicit decision). This avoids the skill becoming an over-eager linter on every change.
- **`context-onboard-satellite` writes a single combined commit** inside the wiki submodule covering all accepted seeds, with a commit message summarising what was added. Easier to review than one commit per seed.
