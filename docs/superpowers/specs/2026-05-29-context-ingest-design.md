# `/context-ingest` v0.2.0 — design

One command from "I read an article" to "the wiki reflects its claims as principles or topics, with citations back to a `raw/` summary." v0.2.0 ships exactly this pipeline — the first of three sub-bands that decompose v0.2 (v0.2.0 = ingest; v0.2.1 = lint + derived graph; v0.2.2 = SessionStart hook).

This spec is concrete enough to plan from because it was brainstormed against five real sources the user wants to seed the `sherpa-wiki` with: Andrej Karpathy's "LLM Wiki" gist (the origin doc this whole project is built on), Mitchell Hashimoto's "Engineer the harness" essay, an article on commit-message hygiene, an Aviator post on spec-driven verification, and a captured conversation with an ex-Dropbox engineer (the "James" sources). The dogfood gate at the bottom of this spec walks through ingesting those.

## Goal

A user reading an article on their phone, laptop, or in a chat with an agent should be able to land its key claims in a coordination-store wiki with one slash command. Each ingested source should:

- Leave a verbatim, traceable `raw/<slug>.md` summary with quotes preserved.
- Promote durable beliefs into `principles/` and operational claims into `topics/`, citing the raw page.
- Surface contradictions inline rather than silently.
- Run the same way whether the source is two pages or twenty, an opinion piece or a technical note.

## Non-goals

- Re-ingesting an already-ingested URL. v0.2.0 refuses. Overwrite, merge, and partial-update semantics are interesting but separate design conversations; we have no concrete need yet.
- Input types other than URL. Raw text input (for conversations, Slack threads, manually written summaries) lands in v0.2.0.1 if needed. File paths and PDFs land in v0.3 alongside binary handling.
- JS-rendered or paywalled URL fetching. v0.2.0 uses Claude Code's WebFetch tool; if it can't reach the page, the skill surfaces the error and stops.
- Lint, derived graph index, orphan detection, contradiction *resolution*, reinforcement clustering. All v0.2.1.
- Natural-language activation ("hey, can you ingest this?"). v0.2.0 ships the slash command only; the skill-style trigger affordance comes later.

## Approach

A new slash command `/context-ingest <url>` activates inside a context-store repository (anywhere `.repo-context-meta.json` with `kind: repo-context-store` is at the working directory root). The command dispatches a new sub-agent, `article-analyzer`, which fetches the URL and returns a structured YAML extraction. The command turns the extraction into a proposal list (same UX as `/context-connect`'s onboarding), the user accepts/edits/rejects items, the command writes pages, invokes `meta-syncer` to refresh `.repo-context-meta.json`, and commits — never pushes.

The chosen mechanism preserves v0.1's posture: markdown-only plugin content, only `git` and WebFetch required at the user's machine.

## Components

### `commands/context-ingest.md`

New slash-command spec. Owns slug derivation, the WebFetch dispatch through `article-analyzer`, proposal presentation, file writes, `meta-syncer` invocation, and the final commit. Reuses the wiki-mutation discipline from `/context-init` and `context-onboard-satellite`: verify success of each sub-agent before continuing; do not push.

### `agents/article-analyzer.md`

New sub-agent. Read-only on the source URL. Mission: produce a YAML document containing one source-level summary plus a list of claims, each with verbatim supporting quotes and a candidate destination. Writes nothing to disk — output is returned to the caller. Markdown-only agent definition like `repo-scanner` and `meta-syncer`.

The agent's critical rules:

- **Read-only on source.** Use WebFetch; do not modify files, do not run git, do not perform additional fetches beyond the supplied URL.
- **Verbatim quotes required.** Every claim must cite at least one quote pulled exactly from the source text. No paraphrased quotes.
- **Single YAML output.** Return one well-formed YAML document; the calling skill parses it. No extra prose around it.
- **Candidate, not commitment.** The `candidate:` field on each claim is a *proposal* — the calling skill and the user make the final call.
- **Scope control.** Do not propose decisions. Do not extract entities or named concepts as standalone outputs. Decisions are our own point-in-time choices, not assertions in articles; entity extraction is v0.3+.

### `templates/raw.md`

New template. Front-matter requires `source_url`, `fetched_on`, `ingested_on`, `title`; optional `author`. Body is the summary plus a "Claims" section that lists each claim as an H3 with its verbatim quote(s) blockquoted underneath and a `→ See [[link]]` pointer to the principle/topic that consumed it.

### `templates/topic.md` (modified)

Grow the front-matter to include a `sources:` array (already present on `principles/`; now mirrored on topics). Empty `[]` for human-written topics with no source backing.

## Workflow

`/context-ingest <url>` executes in this order. Every filesystem mutation uses the Bash tool or Write tool.

1. **Preconditions.** Working directory contains `.repo-context-meta.json` whose `kind` is `repo-context-store`. If not, STOP and surface the situation.
2. **Slug derivation.** From the URL: take the last meaningful path component, strip a recognized trailing document extension if present (`.md`, `.html`, `.htm`, `.php`, `.aspx`, `.jsp`, `.txt`), then normalize lowercase + non-alphanumeric → `-`. If the URL has no path (`https://example.com/`), fall back to the hostname. Show the derived slug to the user; allow override before proceeding.
3. **Refuse if duplicate.** If `raw/<slug>.md` already exists, STOP. Surface the existing file's `source_url` so the user can confirm intent. (Re-ingest semantics are deferred.)
4. **Dispatch `article-analyzer`.** Use the Task tool with `subagent_type: "article-analyzer"`. Pass the URL and derived slug as the prompt body. Wait for the YAML document. If the agent returns an error or empty extraction, STOP and surface.
5. **Read existing wiki state.** Open `index.md`. For every claim with `candidate: extend-topic` or `extend-principle`, read the target page to know what already exists.
6. **Build the proposal list.** Per claim:
   - `+ new principle/<proposed_slug>.md` if `candidate: new-principle`
   - `+ new topic/<proposed_slug>.md` if `candidate: new-topic`
   - `extend principle/<target>.md` if `candidate: extend-principle` and the target exists; else `+ new principle/<target>.md`
   - `extend topic/<target>.md` if `candidate: extend-topic` and the target exists; else `+ new topic/<target>.md`
   - Plus, always: `+ new raw/<slug>.md` (the summary file).
   Detect slug collisions: any `candidate: new-*` whose `proposed_slug` matches an existing wiki page (of any kind — topic, decision, or principle) is refused at proposal time. The user picks a different slug or converts the proposal to an `extend` against the existing page.
7. **Present proposals to the user.** Bulleted list matching `context-onboard-satellite`'s pattern. The user replies `y` (accept all), `n` (abort), a list (accept some by number/slug), or per-item edits ("accept #1 with slug `engineer-the-harness`", etc.). The skill only proceeds with accepted-and-resolved items.
8. **Write pages.** New principles/topics render from `templates/principle.md` or `templates/topic.md` with `{{date}}` set to today, `{{title}}` set from the claim text or analyzer-derived title, and `sources:` set to `[<slug>]` pointing at the raw page. Extensions are surgical edits: add a section, add a bullet citing the raw page, link via `[[<slug>]]`. Contradictions with existing pages are inlined as `> ⚠️ contradicts [[other-page]]: <claim>` immediately before the new claim.
9. **Write the raw page.** Render `templates/raw.md` with the analyzer's summary and the full claims list (whether accepted or not — `raw/` is the evidence layer, not the proposal layer; rejected claims still appear in `raw/` with no `→ See` pointer).
10. **Update `index.md`.** Add an entry per new page under its section (Topics, Decisions, Principles, or Sources) with a one-line summary and `[[wikilink]]`. `raw/` entries go under Sources.
11. **Append to `log.md`.** `## [<date>] ingest | <slug>` followed by 2–N bullet lines: `+ raw/<slug>.md`, `+ principles/<x>.md`, `extend topics/<y>.md`, etc.
12. **Invoke `meta-syncer`.** Same pattern as v0.1: Task tool, `subagent_type: "meta-syncer"`, pass the wiki root. Verify the confirmation line `meta-syncer: synced <wiki-root>/.repo-context-meta.json`. If absent, STOP.
13. **Commit.** `git add . && git commit -m "Ingest <slug>: <N> claims"`. Do not push.

## File formats

### `article-analyzer` YAML output

```yaml
slug: engineer-the-harness
source_url: https://mitchellh.com/writing/my-ai-adoption-journey
fetched_on: 2026-05-29
title: "Engineer the harness"
author: Mitchell Hashimoto         # best-effort; may be "(not detected)"
summary: |
  Mitchell argues that agentic workflows reward developers who build feedback
  mechanisms and explicit guidance into their environment — every agent mistake
  becomes a prompt to engineer a solution that prevents recurrence.
claims:
  - text: "Every agent mistake should trigger engineering so the mistake never recurs."
    quotes:
      - "anytime you find an agent makes a mistake, you take the time to engineer a solution such that the agent never makes that mistake again"
    candidate: new-principle
    proposed_slug: engineer-the-harness
  - text: "AGENTS.md files act as implicit prompting infrastructure."
    quotes: ["better implicit prompting"]
    candidate: extend-topic
    target: agent-tooling
```

`candidate` is one of: `new-principle`, `new-topic`, `extend-principle`, `extend-topic`. For `new-*`, the agent emits `proposed_slug`. For `extend-*`, the agent emits `target` (the existing page slug it believes this claim attaches to).

### `raw/<slug>.md`

```markdown
---
source_url: https://mitchellh.com/writing/my-ai-adoption-journey
fetched_on: 2026-05-29
ingested_on: 2026-05-29
title: "Engineer the harness"
author: Mitchell Hashimoto
---
# Engineer the harness (Mitchell Hashimoto)

> Source: <source_url>, fetched 2026-05-29

## Summary
<summary from analyzer>

## Claims

### Every agent mistake should trigger engineering so the mistake never recurs.
> "anytime you find an agent makes a mistake, you take the time to engineer a solution such that the agent never makes that mistake again"
→ See [[engineer-the-harness]] (principle).

### AGENTS.md files act as implicit prompting infrastructure.
> "better implicit prompting"
→ See [[agent-tooling]] (topic).
```

### `templates/topic.md` — sources field

Existing front-matter gains `sources:`. Default empty array for human-written topics.

```yaml
---
updated: {{date}}
status: active
repos: []
sources: []
---
```

## Edge cases & decisions

| Case | v0.2.0 behavior |
|---|---|
| Duplicate URL (re-ingest) | Refuse if `raw/<slug>.md` exists. |
| WebFetch failure | Surface error; suggest manual download → raw-text input (v0.2.0.1). No automatic retry. |
| WebFetch returns a cross-host redirect | Re-issue WebFetch once with the redirect URL the tool reports. If it still does not resolve to content, treat as a WebFetch failure. |
| Paywalled or JS-rendered URL | Same as WebFetch failure. Out of scope to fix. |
| Short sources (<500 words) | No special path; analyzer returns fewer claims. |
| Contradictions | Inline `> ⚠️ contradicts [[other-page]]: ...` immediately before the new claim. No auto-resolution. |
| Reinforcement (claim echoes existing page) | Implicit via citation overlap. v0.2.0 does not track explicitly. |
| Slug collision with existing wiki page of a different kind | Refuse the proposal; user picks a different slug at the proposal step. |
| Principle vs. topic call | Analyzer suggests via `candidate:`. Skill follows. User can override per item during proposal review. |
| Mid-flow failure (between writes and commit) | User deletes `raw/<slug>.md` and any partial new pages, then re-runs `/context-ingest <url>`. v0.2.0 does not roll back automatically. |
| Author / title extraction quality | Best-effort. `author: (not detected)` and `title: (not detected)` are valid front-matter values. |
| Analyzer returns zero claims | STOP. Treat as a failed extraction; the source did not yield wiki-worthy content under this run. |
| Meta source (describes the wiki *method*, not a domain) | Ingest normally — no special path. Such a source (e.g. Karpathy's "LLM Wiki" origin doc, our first backbone ingest) yields principles/topics *about the method itself* (e.g. `compounding-knowledge-artifact`, `wiki-architecture`). Pleasingly recursive: the coordination wiki ends up holding the very idea that birthed it, and that ingest is itself the clearest demonstration of the pattern the source describes. The analyzer classifies its claims like any other; no handling change required. |

## Tests

Estimated 10–12 new vitest assertions.

### New — `tests/commands.test.ts`, `/context-ingest`

- Front-matter has `name: context-ingest`, non-trivial `description`, `argument-hint`.
- Body has `Preconditions`, `Steps`, `Idempotency` sections.
- Body documents the URL slug-derivation rule.
- Body invokes `article-analyzer` (string match on the agent name and the Task tool reference).
- Body invokes `meta-syncer` and verifies the confirmation line.
- Body specifies refusal when `raw/<slug>.md` already exists.
- No placeholder leftovers.

### New — `tests/agents.test.ts`, `article-analyzer`

- File exists; front-matter has `name: article-analyzer` and non-trivial `description`.
- Five required sections (Identity, Mission, Critical rules, Output format, Workflow process) — same checklist as `repo-scanner` and `meta-syncer`.
- Critical rules: read-only on source, single YAML output, no git mutation, verbatim quotes required, scope control (no decisions, no entities).
- Output format documents claims / quotes / candidate / proposed_slug shape with an embedded YAML example.
- Workflow process names the WebFetch tool.

### Updated — `tests/templates.test.ts`

- New `raw.md` template exists; required front-matter fields (`source_url`, `fetched_on`, `ingested_on`, `title`) present; body has `Summary` and `Claims` sections.
- `topic.md` front-matter requires `sources:` array (new assertion; old tests for `updated`, `status`, `repos` unchanged).

## Dogfood acceptance gate

Set up a real coordination-store at `damian0o/sherpa-wiki` (new GitHub repo, private to start, flip to public after acceptance). Ingest the four backbone URLs through `/context-ingest`; file James's three principles manually since the conversation is already a 3-bullet synthesis with no URL to fetch.

Steps:

1. `mkdir ~/playground/sherpa-wiki && cd ~/playground/sherpa-wiki`.
2. `/context-init` → empty wiki with `.gitkeep` × 4, meta-json synced.
3. Push to `damian0o/sherpa-wiki` (private; flip to public after acceptance).
4. Stay inside the wiki directory.
5. `/context-ingest https://gist.githubusercontent.com/karpathy/442a6bf555914893e9891c11519de94f/raw/ac46de1ad27f92b28ac95459c782c07f6b8c964a/llm-wiki.md` → confirm the derived slug `llm-wiki` (the `.md` extension is stripped) → this is the *origin doc* and is meta (about the wiki method, not the engineering domain), so expect principle candidates like `compounding-knowledge-artifact` and a `wiki-architecture` topic (raw/wiki/schema layers; ingest → query → lint), not domain claims. (Pleasingly recursive: the coordination wiki ends up holding the very idea that birthed it — this ingest is itself the clearest demonstration of the pattern the source describes.) → accept the substantive ones → verify the commit lands.
6. `/context-ingest https://mitchellh.com/writing/my-ai-adoption-journey` → review the proposals (expect 1 new principle `engineer-the-harness`, possibly 1–2 extending topics like `agent-tooling`) → accept all → verify commit lands.
7. `/context-ingest https://medium.com/@iambonitheuri/the-art-of-writing-meaningful-git-commit-messages-a56887a4cb49` → expect a `topics/commit-conventions.md` (status: stable) and possibly a `principles/clear-history.md` or similar.
8. `/context-ingest https://www.aviator.co/blog/what-if-code-review-happened-before-the-code-was-written/` → expect a new principle (e.g. `spec-driven-verification`) and a topic on the two-agent workflow.
9. Manually write the three James principles: `principles/conceptualisation-over-syntax.md`, `principles/teams-by-problem.md`, `principles/simple-systems.md`. Each has a `sources: []` array (no traceable source). Run `meta-syncer` manually after the manual writes so the meta-json reflects them.

Acceptance criteria:

- Four `raw/` entries exist, one per backbone URL, each with `source_url`, `fetched_on`, `ingested_on` in front-matter and at least one verbatim quote per claim.
- At least six principles total across the wiki, including the three James principles.
- At least one topic page per ingested article (commit-conventions, agent-tooling or agent-workflow, spec-driven-verification or similar — the exact slugs are analyzer-judgment).
- Every principle whose source came from a URL ingest has `sources:` referencing the matching `raw/` slug. The three James principles have `sources: []` and a note in the body explaining the un-traceable origin.
- `log.md` contains four chronological `## [<date>] ingest | <slug>` entries (one per ingested URL).
- `.repo-context-meta.json` arrays match the on-disk content after the last ingest (and the final manual `meta-syncer` run for the James writes).

After acceptance, tag `v0.2.0` from `main` on the `sherpa` repo, push the tag, and create a GitHub Release using the tag annotation.

## Out of scope (reiterated)

- Re-ingest semantics: deferred to v0.2.0.x.
- Raw-text input: deferred to v0.2.0.1.
- File-path / PDF input: deferred to v0.3.
- JS-rendered / paywalled URL fetching: deferred to v0.3.
- Lint, derived graph beyond minimal `{slug, path}`, orphan detection, contradiction surfacing/resolution beyond inline flag, reinforcement-aware grouping: deferred to v0.2.1.
- Natural-language activation: deferred to v0.2.0.x.
- Article-analyzer extracting entities or named concepts beyond claims: deferred to v0.3+.
- Author/title extraction improvements: ongoing; v0.2.0 ships best-effort.
