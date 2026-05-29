# `/context-ingest` v0.2.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/context-ingest <url>` end-to-end — a slash command that fetches a web article, runs `article-analyzer` to extract verbatim claims, presents proposals to the user, writes `raw/<slug>.md` plus accepted principle/topic pages with citations, syncs `.repo-context-meta.json` via the existing `meta-syncer`, and commits. Spec: [`docs/superpowers/specs/2026-05-29-context-ingest-design.md`](../specs/2026-05-29-context-ingest-design.md).

**Architecture:** Three new markdown artifacts (`templates/raw.md`, `agents/article-analyzer.md`, `commands/context-ingest.md`) plus a one-field extension to the existing `templates/topic.md`. No runtime code beyond what v0.1 already needs — markdown plus vitest shape-checks. The `article-analyzer` sub-agent uses Claude Code's built-in WebFetch tool to retrieve source content; the slash command reuses `meta-syncer` (v0.1) unchanged.

**Tech Stack:** Existing vitest + gray-matter + ajv test runner; markdown + YAML front-matter for plugin content; Bash invoked by Claude for filesystem mutations; WebFetch tool for the source fetch step at runtime.

**Scope (v0.2.0):**

- New: `plugins/repo-context/templates/raw.md`.
- New: `plugins/repo-context/agents/article-analyzer.md`.
- New: `plugins/repo-context/commands/context-ingest.md`.
- Modify: `plugins/repo-context/templates/topic.md` — add `sources: []` to front-matter.
- Modify: `tests/templates.test.ts` — extend with raw.md describe block + assert `sources:` on topic.md.
- Modify: `tests/agents.test.ts` — add `article-analyzer` describe block.
- Modify: `tests/commands.test.ts` — add `/context-ingest` describe block.
- Modify: `.claude-plugin/marketplace.json` and `plugins/repo-context/.claude-plugin/plugin.json` — bump `version` to `0.2.0`. Bump `package.json` `version` for consistency.

**Out of scope** (deferred per spec):

- Re-ingest semantics (v0.2.0.x), raw-text input (v0.2.0.1), file-path input (v0.3), JS-rendered/paywalled fetch (v0.3).
- `/context-lint`, derived graph beyond minimal `{slug,path}`, SessionStart hook (all v0.2.1 / v0.2.2).
- Entity/named-concept extraction by analyzer (v0.3+).

**File structure produced/touched by this plan:**

```
plugins/repo-context/
  templates/
    raw.md                       (NEW)
    topic.md                     (MODIFY — add sources: to front-matter)
  agents/
    article-analyzer.md          (NEW)
  commands/
    context-ingest.md            (NEW)
tests/
  templates.test.ts              (MODIFY — raw block + topic sources assertion)
  agents.test.ts                 (MODIFY — article-analyzer block)
  commands.test.ts               (MODIFY — context-ingest block)
.claude-plugin/
  marketplace.json               (MODIFY — version bump)
plugins/repo-context/.claude-plugin/
  plugin.json                    (MODIFY — version bump)
package.json                     (MODIFY — version bump)
docs/superpowers/
  specs/2026-05-29-context-ingest-design.md   (already exists)
  plans/2026-05-29-context-ingest.md          (this file)
```

**Testing philosophy:** v0.1's pattern — vitest validates manifest JSON shape, markdown front-matter, and required-section presence. Behavior (Claude executing a slash command, sub-agent dispatch, WebFetch results) is unit-untestable; that's covered by the manual dogfood gate in Task 5.

**TDD discipline:** every code-change task updates tests first (red), then implements (green), then commits.

---

## Task 1: Templates — new `raw.md` + add `sources:` to `topic.md`

**Files:**

- Modify: `/Users/damianospara/playground/sherpa/tests/templates.test.ts`
- Create: `/Users/damianospara/playground/sherpa/plugins/repo-context/templates/raw.md`
- Modify: `/Users/damianospara/playground/sherpa/plugins/repo-context/templates/topic.md`

- [ ] **Step 1: Add failing tests to `tests/templates.test.ts`**

Two changes:

(a) **Append** a new `describe` block at the bottom of the file for the raw template:

```ts
describe("templates/raw.md", () => {
  const path = resolve(templatesDir, "raw.md");
  it("exists", () => expect(existsSync(path)).toBe(true));
  it("has YAML front-matter with required fields", () => {
    const { frontMatter } = loadMarkdown(path);
    for (const field of ["source_url", "fetched_on", "ingested_on", "title"]) {
      expect(frontMatter).toHaveProperty(field);
    }
  });
  it("has the {{title}} substitution marker on the H1", () => {
    const { raw } = loadMarkdown(path);
    expect(raw).toMatch(/^# \{\{title\}\}/m);
  });
  it("has Summary and Claims sections", () => {
    const { body } = loadMarkdown(path);
    expect(hasSections(body, ["Summary", "Claims"])).toEqual([]);
  });
  it("references the source_url field in the body for traceability", () => {
    const { raw } = loadMarkdown(path);
    expect(raw).toMatch(/\{\{source_url\}\}/);
  });
  it("has no banned placeholder strings", () => {
    const { raw } = loadMarkdown(path);
    expect(noPlaceholders(raw)).toEqual([]);
  });
});
```

(b) **Add** a new `it` case inside the existing `describe("templates/topic.md", ...)` block (e.g. right after the existing `repos: parses as an array (not null)` test):

```ts
  it("has a sources: field that parses as an array", () => {
    const { frontMatter } = loadMarkdown(path);
    expect(frontMatter).toHaveProperty("sources");
    expect(Array.isArray(frontMatter.sources)).toBe(true);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- templates`
Expected: the 6 new `templates/raw.md` tests FAIL (file missing); the new `sources:` assertion on `templates/topic.md` FAILS (field missing). All other template tests still pass.

- [ ] **Step 3: Create `plugins/repo-context/templates/raw.md`**

Full file content:

```markdown
---
source_url: {{source_url}}
fetched_on: {{date}}
ingested_on: {{date}}
title: "{{title}}"
author: {{author}}
---
# {{title}}

> Source: {{source_url}}, fetched {{date}}

## Summary

## Claims
```

- [ ] **Step 4: Modify `plugins/repo-context/templates/topic.md`**

Edit the front-matter to add a `sources: []` line. Replace the existing front-matter block with:

```markdown
---
updated: {{date}}
status: active
repos: []
sources: []
---
```

(Body — H1 and the five sections — stays unchanged.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- templates`
Expected: all template tests PASS (35 total: 29 existing + 6 new for raw.md + 1 new for topic.md sources, minus 0 removed = 36 total in this file).

- [ ] **Step 6: Commit**

```bash
git add plugins/repo-context/templates/raw.md plugins/repo-context/templates/topic.md tests/templates.test.ts
git commit -m "templates: add raw.md (ingest summary) + sources: field on topic.md"
```

---

## Task 2: `article-analyzer` sub-agent

**Files:**

- Modify: `/Users/damianospara/playground/sherpa/tests/agents.test.ts`
- Create: `/Users/damianospara/playground/sherpa/plugins/repo-context/agents/article-analyzer.md`

- [ ] **Step 1: Append a failing test block for `article-analyzer`**

Append a new `describe` block at the bottom of `tests/agents.test.ts`:

```ts
describe("agents/article-analyzer.md", () => {
  const path = resolve(agentsDir, "article-analyzer.md");

  it("exists", () => {
    expect(existsSync(path)).toBe(true);
  });

  it("front-matter has name and description", () => {
    const { frontMatter } = loadMarkdown(path);
    expect(frontMatter.name).toBe("article-analyzer");
    expect(typeof frontMatter.description).toBe("string");
    expect((frontMatter.description as string).length).toBeGreaterThan(20);
  });

  it("has the five required agent sections", () => {
    const { body } = loadMarkdown(path);
    expect(hasSections(body, [
      "Identity",
      "Mission",
      "Critical rules",
      "Output format",
      "Workflow process",
    ])).toEqual([]);
  });

  it("Critical rules enforce read-only on source, single YAML output, no git mutation, verbatim quotes, scope control", () => {
    const { body } = loadMarkdown(path);
    expect(body).toMatch(/Read-only on source/);
    expect(body).toMatch(/Verbatim quotes required/);
    expect(body).toMatch(/Single YAML output/);
    expect(body).toMatch(/No git mutation/);
    expect(body).toMatch(/Scope control/);
  });

  it("Output format documents the claims/quotes/candidate shape with a YAML example", () => {
    const { body } = loadMarkdown(path);
    expect(body).toMatch(/claims:/);
    expect(body).toMatch(/quotes:/);
    expect(body).toMatch(/candidate:/);
    expect(body).toMatch(/proposed_slug|target/);
    expect(body).toMatch(/new-principle/);
    expect(body).toMatch(/extend-topic/);
  });

  it("Workflow process names the WebFetch tool for source retrieval", () => {
    const { body } = loadMarkdown(path);
    expect(body).toMatch(/WebFetch/);
  });

  it("has no placeholder leftovers", () => {
    const { raw } = loadMarkdown(path);
    expect(noPlaceholders(raw)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- agents`
Expected: previous agent tests (repo-scanner, meta-syncer) still pass; **all seven new `article-analyzer` tests FAIL** because the agent file doesn't exist yet.

- [ ] **Step 3: Create `plugins/repo-context/agents/article-analyzer.md`**

Full file content:

````markdown
---
name: article-analyzer
description: Use when /context-ingest needs to extract claims from a web source. Fetches the URL via WebFetch and returns a YAML document with a source-level summary plus a list of claims, each with verbatim quotes and a candidate destination (principle or topic). Read-only on the source; writes nothing to disk.
---

# article-analyzer

## Identity

You are `article-analyzer`, a careful, evidence-first sub-agent. You read one web source via the WebFetch tool and produce a structured YAML extraction the dispatching skill consumes. You never modify files. You never run git. You quote the source exactly when citing a claim.

## Mission

For a given URL, produce one YAML document containing:

- A `slug` (passed in by the caller, or derived from the URL).
- The `source_url` and today's `fetched_on` date.
- Best-effort `title` and `author`.
- A 2–4 sentence prose `summary` of the source's overall argument.
- A list of `claims` — atomic assertions the source makes, each accompanied by 1–3 verbatim quotes pulled exactly from the source text, plus a `candidate` destination that proposes where the claim should live in the wiki.

The dispatching skill turns your output into wiki page proposals presented to the user. You are not the decider — you are the careful reader.

## Critical rules

- **Read-only on source.** Use the WebFetch tool to retrieve the URL. Do not write files, do not run git, do not perform additional fetches beyond the supplied URL.
- **Verbatim quotes required.** Every claim must cite at least one quote pulled exactly from the source text. No paraphrased quotes, no edited quotes. If you cannot find a verbatim quote to support a claim, do not emit the claim.
- **Single YAML output.** Return one well-formed YAML document and nothing else. No prose preface, no commentary after, no markdown wrappers. The calling skill parses the YAML directly.
- **No git mutation.** You do not run `git add`, `git commit`, `git status`, or any other git command.
- **Scope control.** Do not propose `decisions/` pages — decisions are our own point-in-time choices, not assertions made by article authors. Do not extract entities or named concepts as standalone outputs in v0.2.0. Do not propose `raw/` pages — the dispatching skill writes those from your summary.

## Output format

Return exactly this YAML structure (replace placeholder values with actual extraction):

```yaml
slug: <slug-from-caller>
source_url: <verbatim URL the caller passed>
fetched_on: <today's ISO date, YYYY-MM-DD>
title: "<best-effort source title>"
author: <best-effort author name, or the literal string "(not detected)">
summary: |
  <2-4 sentence prose summary of the source's overall argument>
claims:
  - text: "<one-sentence claim statement in your own words>"
    quotes:
      - "<verbatim quote from source, no editing>"
    candidate: <new-principle | new-topic | extend-principle | extend-topic>
    proposed_slug: <kebab-case slug for new-* candidates>
    target: <existing-page-slug for extend-* candidates>
```

`candidate` is one of exactly four values: `new-principle`, `new-topic`, `extend-principle`, `extend-topic`.

- For `new-principle` and `new-topic`, emit a `proposed_slug` field (kebab-case, lowercase, non-alphanumeric → `-`). Omit `target`.
- For `extend-principle` and `extend-topic`, emit a `target` field naming an existing page slug you believe this claim attaches to. Omit `proposed_slug`.

Quotes are an array; one quote is sufficient when the claim rests on a single line, two or three when the claim synthesizes adjacent sentences.

If the source yields no extractable claims (paywalled, fetch failed, no substantive content), emit a YAML document with `claims: []` and a one-sentence summary explaining why. The dispatching skill treats this as a failed extraction and stops.

## Workflow process

1. Receive the URL and slug from the caller.
2. **Fetch the source.** Use the WebFetch tool with the URL and a prompt asking for the full article text, headers preserved.
3. **Read the fetched content fully.** Identify the source's thesis, its major claims, and the verbatim sentences that support each claim.
4. **Classify each claim.** A claim about *how we should work* or *what we believe is true durably* is principle-shaped (`candidate: new-principle` if no existing page fits; `extend-principle` if it strengthens an existing principle slug). A claim about *current state, conventions, or operational concerns* is topic-shaped (`new-topic` or `extend-topic`). When uncertain between principle and topic, prefer topic — principles are rarer.
5. **Pick proposed slugs.** For `new-*` candidates, the slug should be short, kebab-case, and evocative of the claim (e.g. `engineer-the-harness`, `spec-driven-verification`).
6. **Emit the YAML.** Single document, no surrounding prose.

You are done when the YAML document has been emitted. You never write files, stage, commit, or push.
````

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- agents`
Expected: all repo-scanner + meta-syncer tests still pass; all seven `article-analyzer` tests now PASS.

- [ ] **Step 5: Commit**

```bash
git add plugins/repo-context/agents/article-analyzer.md tests/agents.test.ts
git commit -m "Add article-analyzer sub-agent (URL → YAML claims with verbatim quotes)"
```

---

## Task 3: `/context-ingest` slash command

**Files:**

- Modify: `/Users/damianospara/playground/sherpa/tests/commands.test.ts`
- Create: `/Users/damianospara/playground/sherpa/plugins/repo-context/commands/context-ingest.md`

- [ ] **Step 1: Append a failing test block for `/context-ingest`**

Append a new `describe` block at the bottom of `tests/commands.test.ts`:

```ts
describe("commands/context-ingest.md", () => {
  const path = resolve(commandsDir, "context-ingest.md");

  it("exists", () => {
    expect(existsSync(path)).toBe(true);
  });

  it("front-matter has name, description, and argument-hint", () => {
    const { frontMatter } = loadMarkdown(path);
    expect(frontMatter.name).toBe("context-ingest");
    expect(typeof frontMatter.description).toBe("string");
    expect((frontMatter.description as string).length).toBeGreaterThan(20);
    expect(frontMatter).toHaveProperty("argument-hint");
  });

  it("body has Preconditions, Steps, and Idempotency sections", () => {
    const { body } = loadMarkdown(path);
    expect(hasSections(body, ["Preconditions", "Steps", "Idempotency"])).toEqual([]);
  });

  it("body documents slug derivation from the URL", () => {
    const { body } = loadMarkdown(path);
    expect(body).toMatch(/slug/i);
    expect(body).toMatch(/last.*path|path.*component|URL/i);
  });

  it("body dispatches the article-analyzer sub-agent", () => {
    const { body } = loadMarkdown(path);
    expect(body).toMatch(/article-analyzer/);
    expect(body).toMatch(/subagent_type/);
  });

  it("body invokes meta-syncer and verifies the confirmation line", () => {
    const { body } = loadMarkdown(path);
    expect(body).toMatch(/meta-syncer/);
    expect(body).toMatch(/meta-syncer: synced/);
  });

  it("body specifies refusal when raw/<slug>.md already exists", () => {
    const { body } = loadMarkdown(path);
    expect(body).toMatch(/raw\/.*\.md.*exists|exists.*raw\//i);
    expect(body).toMatch(/refuse|stop|abort/i);
  });

  it("body writes a log entry with the ingest kind", () => {
    const { body } = loadMarkdown(path);
    expect(body).toMatch(/log\.md/);
    expect(body).toMatch(/ingest \|/);
  });

  it("has no placeholder leftovers", () => {
    const { raw } = loadMarkdown(path);
    expect(noPlaceholders(raw)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- commands`
Expected: previous context-init + context-connect tests still pass; **all nine new `context-ingest` tests FAIL** because the command file doesn't exist yet.

- [ ] **Step 3: Create `plugins/repo-context/commands/context-ingest.md`**

Full file content:

````markdown
---
name: context-ingest
description: Ingest a web source into a repo-context coordination wiki. Fetches the URL, extracts verbatim claims via article-analyzer, presents wiki-page proposals (new principles/topics or extensions of existing ones), writes accepted pages with citations, syncs the meta marker, and commits inside the wiki repo. Run from a context-store directory.
argument-hint: "<source-url>"
---

# /context-ingest

Ingest a web source into the current `repo-context` wiki. Writes a `raw/<slug>.md` summary, proposes principle and topic pages from the source's claims, lets you accept/edit/reject each, then commits inside the wiki repository.

## Preconditions

1. Working directory contains `.repo-context-meta.json` whose `kind` is `repo-context-store`. If not present or `kind` differs, STOP and tell the user this isn't a context-store.
2. `<source-url>` was provided as the argument. If not, ask the user for it.
3. `git` is available in the shell.

## Steps

Execute these steps in order. Each step that mutates the filesystem or git state must use the Bash tool or Write tool. Each sub-agent dispatch uses the Task tool.

1. **Verify preconditions.** Use the Bash tool to confirm `.repo-context-meta.json` exists at the working directory and contains `"kind": "repo-context-store"`. If not, STOP and surface the situation.

2. **Derive the slug from the URL.** Take the last meaningful path component of the URL (after the last `/`, before any `?` or `#`). Strip a trailing slash. If the result is empty (e.g. for `https://example.com/`), fall back to the hostname. Normalize: lowercase, replace non-alphanumeric characters with `-`, collapse runs of `-`, strip leading/trailing `-`. Show the derived slug to the user and offer them the chance to override before continuing.

3. **Refuse if a raw page already exists for this slug.** If `raw/<slug>.md` exists, STOP. Surface the existing file's `source_url` (read its front-matter) so the user can confirm whether they meant to re-ingest. Re-ingest semantics are intentionally not implemented in v0.2.0.

4. **Dispatch `article-analyzer`.** Use the Task tool with `subagent_type: "article-analyzer"`. In the prompt, include the URL and the derived slug. Wait for the sub-agent's YAML output. If the agent returns `claims: []` (failed extraction), STOP and surface the agent's summary so the user knows why.

5. **Read existing wiki state.** Open `index.md`. For each claim in the analyzer's output whose `candidate` is `extend-principle` or `extend-topic`, also open the target page to know what already exists.

6. **Build the proposal list.** Per claim from the analyzer:
   - If `candidate: new-principle`: propose `+ new principles/<proposed_slug>.md`.
   - If `candidate: new-topic`: propose `+ new topics/<proposed_slug>.md`.
   - If `candidate: extend-principle` and `principles/<target>.md` exists: propose `extend principles/<target>.md`. If the target does not exist, treat as `+ new principles/<target>.md`.
   - If `candidate: extend-topic` and `topics/<target>.md` exists: propose `extend topics/<target>.md`. If the target does not exist, treat as `+ new topics/<target>.md`.
   - Always also: propose `+ new raw/<slug>.md`.

   **Detect slug collisions.** For every `+ new` proposal whose target slug matches an existing wiki page of any kind (topic, decision, or principle), mark the proposal as a collision and prompt the user to pick a different slug or convert it to an `extend` against the existing page.

7. **Present the proposal list to the user.** Format as numbered bullets, e.g.:

   ```
   Ingest proposal from <slug> (<title>):
   1. + new raw/<slug>.md
   2. + new principles/engineer-the-harness.md
   3. extend topics/agent-tooling.md (add 2 claims)
   4. + new principles/spec-driven-verification.md
   ```

   The user can reply `y` (accept all), `n` (abort), a comma-separated list of numbers (accept these), or per-item edits ("accept 2 with slug `harness-engineering`"). Proceed to step 8 only with the resolved set.

8. **Write accepted pages.**

   For each accepted new principle or topic: render `plugins/repo-context/templates/principle.md` or `templates/topic.md` with `{{date}}` substituted to today's ISO date and `{{title}}` substituted to a sentence-cased version of the claim text. Set the front-matter `sources:` array to `[<slug>]` (pointing at the raw page being written this run).

   For each accepted extension: open the target page; add a section or bullet citing the new claim; append the raw slug to its `sources:` array if not already present. The new content must include the verbatim quote(s) from the analyzer's output, blockquoted, and a `[[<slug>]]` link to the raw page.

   For any claim that contradicts an existing page (the analyzer marks this implicitly when the existing page's text disagrees — detect by reading the target page during step 5), inline a contradiction flag immediately before the new claim: `> ⚠️ contradicts [[other-page]]: <one-line summary>`.

9. **Write the raw page.** Render `plugins/repo-context/templates/raw.md` with substitutions: `{{slug}}`, `{{source_url}}`, `{{date}}` (today's ISO date), `{{title}}` (from analyzer output), `{{author}}` (from analyzer output or `(not detected)`). Write the analyzer's `summary` into the `## Summary` section. Write the full claim list (all claims, whether accepted or not — the raw page is the evidence layer, not the proposal layer) into the `## Claims` section. For each claim, render an H3 with the claim text, the verbatim quote(s) blockquoted, and a `→ See [[<slug>]] (<kind>).` pointer to the principle/topic that consumed it (or `→ Not promoted in this ingest.` for rejected claims).

10. **Update `index.md`.** Add an entry per new page under its section header (Topics, Decisions, Principles, Sources) with a one-line summary and a `[[wikilink]]`. The raw page entry goes under Sources.

11. **Append to `log.md`.** Add this entry at the bottom:

    ```
    ## [<today>] ingest | <slug>
    - + raw/<slug>.md
    - <one bullet per accepted new or extend>
    ```

12. **Sync `.repo-context-meta.json` via `meta-syncer`.** Use the Task tool with `subagent_type: "meta-syncer"`. Pass the working directory as the wiki root. The sub-agent walks `topics/`, `decisions/`, `principles/` and rewrites the marker file. Verify the sub-agent returns a line matching `meta-syncer: synced <wiki-root>/.repo-context-meta.json` before proceeding to the commit.

13. **Commit.** Run `git add . && git commit -m "Ingest <slug>: <N> claims"` where `<N>` is the number of accepted proposals (excluding the raw page itself). Do not push. Tell the user the wiki commit is staged locally and they must push the wiki repo to share the new content.

## Idempotency

`/context-ingest` is intentionally non-idempotent: re-running with a URL whose slug already has a `raw/<slug>.md` is refused at step 3. To re-ingest, the user must remove the existing `raw/<slug>.md` (and decide manually what to do with the principles/topics the original ingest produced).

## Behavioral baseline

Follow the four operational principles from this plugin's contributor `CLAUDE.md` — think before acting (verify the URL is reachable; confirm the slug before fetching), simplicity first (don't propose decisions; don't extract entities; minimum content), surgical changes (extensions add a section or bullet, never rewrite the whole page), goal-driven (verify each sub-agent returns its confirmation line; verify the meta file landed; only commit if both pass).
````

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- commands`
Expected: all context-init + context-connect tests still pass; all nine new `context-ingest` tests now PASS.

- [ ] **Step 5: Commit**

```bash
git add plugins/repo-context/commands/context-ingest.md tests/commands.test.ts
git commit -m "Add /context-ingest command (URL → wiki via article-analyzer + meta-syncer)"
```

---

## Task 4: Version bumps + full test suite green checkpoint

**Files:**

- Modify: `/Users/damianospara/playground/sherpa/.claude-plugin/marketplace.json`
- Modify: `/Users/damianospara/playground/sherpa/plugins/repo-context/.claude-plugin/plugin.json`
- Modify: `/Users/damianospara/playground/sherpa/package.json`

- [ ] **Step 1: Bump `marketplace.json` plugin entry to 0.2.0**

In `.claude-plugin/marketplace.json`, find the line:

```json
      "version": "0.1.0",
```

inside the single plugin entry, and change it to:

```json
      "version": "0.2.0",
```

- [ ] **Step 2: Bump `plugin.json` to 0.2.0**

In `plugins/repo-context/.claude-plugin/plugin.json`, change:

```json
  "version": "0.1.0",
```

to:

```json
  "version": "0.2.0",
```

- [ ] **Step 3: Bump `package.json` to 0.2.0**

In `package.json`, change:

```json
  "version": "0.1.0",
```

to:

```json
  "version": "0.2.0",
```

- [ ] **Step 4: Regenerate `package-lock.json`**

Run: `npm install`
Expected: silent success or a small notice; `grep '"version": "0.2.0"' package-lock.json` returns 2 matching lines.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: every suite PASSES. Test counts add up to:
- v0.1.0 baseline: 97 tests.
- Task 1 adds 7 new templates tests (6 raw block + 1 sources assertion on topic).
- Task 2 adds 7 new agent tests (article-analyzer block).
- Task 3 adds 9 new command tests (context-ingest block).
- Total: **120 tests passing**.

If a test fails, re-read the failing assertion against the file it tests, fix the file (not the assertion — the assertions encode the spec), and re-run.

- [ ] **Step 6: Commit**

```bash
git add .claude-plugin/marketplace.json plugins/repo-context/.claude-plugin/plugin.json package.json package-lock.json
git commit -m "Bump to v0.2.0 (marketplace, plugin, package)"
```

- [ ] **Step 7: Sanity-check the diff since the spec landed**

Run:

```bash
git log --oneline 1d14116..HEAD
```

Expected: four commits, one per Task 1–4:

```
<sha> Bump to v0.2.0 (marketplace, plugin, package)
<sha> Add /context-ingest command (URL → wiki via article-analyzer + meta-syncer)
<sha> Add article-analyzer sub-agent (URL → YAML claims with verbatim quotes)
<sha> templates: add raw.md (ingest summary) + sources: field on topic.md
```

---

## Task 5: Manual dogfood — stand up `sherpa-wiki` + ingest 3 backbone URLs + file James manually

**Files:** none modified — user-driven scenario.

This task is the v0.2.0 acceptance gate per the spec. It exercises the full `/context-ingest` path against three real backbone sources and produces the living seed content for sherpa's own development wiki.

- [ ] **Step 1: Reinstall the plugin to pick up v0.2.0**

In a Claude Code session:

```
/plugin marketplace update sherpa
/plugin install repo-context@sherpa
/reload-plugins
```

This is the upgrade path documented in the CHANGELOG. Verify `/context-ingest` appears in `/help` after the reload.

- [ ] **Step 2: Stand up `~/playground/sherpa-wiki/`**

```bash
mkdir -p ~/playground/sherpa-wiki
cd ~/playground/sherpa-wiki
```

Then in the prompt:

```
/context-init
```

Verify the result with `ls -A`:
- Expected: `.git`, `CLAUDE.md`, `index.md`, `log.md`, `.repo-context-meta.json`, four content dirs each with a `.gitkeep`.

- [ ] **Step 3: Create the GitHub repo and push**

```bash
gh repo create sherpa-wiki --private --source=. --remote=origin --push
```

(The active gh CLI account for this project is `damian0o`; SSH-protocol pushes should work cleanly. If push fails with `Repository not found`, switch the remote to HTTPS with `git remote set-url origin https://github.com/damian0o/sherpa-wiki.git` and retry. The rationale lives in the project's auto-memory: a damianhico account also exists in the same gh keyring, and the SSH key resolves to damian0o, which is why mixing the active account causes push failures.)

- [ ] **Step 4: Ingest backbone URL #1 — Mitchell Hashimoto's "Engineer the harness"**

Still inside `~/playground/sherpa-wiki/`, in Claude Code:

```
/context-ingest https://mitchellh.com/writing/my-ai-adoption-journey
```

Expected behavior:
- Slug derives to something like `my-ai-adoption-journey`. Override if you prefer a shorter slug (e.g. `engineer-the-harness`).
- `article-analyzer` runs, fetches the article, returns 4–8 claims.
- Proposals include at least one `+ new principle/<slug>.md` for the harness-engineering thesis and at least one `extend-topic` candidate.
- Accept the proposals that look right (reply `y` or pick specific numbers).
- Verify the meta-syncer confirmation line appears.
- Verify the commit lands: `git log --oneline` should show one new commit `Ingest <slug>: <N> claims`.

- [ ] **Step 5: Ingest backbone URL #2 — Commit messages**

```
/context-ingest https://medium.com/@iambonitheuri/the-art-of-writing-meaningful-git-commit-messages-a56887a4cb49
```

Expected: a `topics/commit-conventions.md` (status: stable) candidate; possibly extensions or a `topics/commit-hygiene.md`. Accept the substantive ones.

- [ ] **Step 6: Ingest backbone URL #3 — Aviator spec-driven verification**

```
/context-ingest https://www.aviator.co/blog/what-if-code-review-happened-before-the-code-was-written/
```

Expected: a `principles/spec-driven-verification.md` candidate (or similarly named) plus a `topics/agent-workflow.md` candidate covering the two-agent (impl + verify) pattern. Accept and verify the commit.

- [ ] **Step 7: File the 3 James principles manually**

These have no URL to fetch. Create them by hand under `~/playground/sherpa-wiki/principles/`:

(a) **`principles/conceptualisation-over-syntax.md`**:

```markdown
---
adopted: 2026-05-29
status: active
sources: []
---
# Software is conceptualisation, not syntax

## What this means in practice

The hard part of software development is forming the right model of the problem and the solution — syntax, libraries, and frameworks are interchangeable details. Career advice for the AI era: invest in conceptual clarity; let the agent handle syntax.

## What this does not mean

This does not mean syntax does not matter or that any code is acceptable as long as the concept is right. It means time spent disambiguating the model returns more than time spent polishing the implementation.

## Sources

Captured 2026-05-29 from a conversation with James (ex-Dropbox). No URL.
```

(b) **`principles/teams-by-problem.md`**:

```markdown
---
adopted: 2026-05-29
status: active
sources: []
---
# Name teams by the problem they own, not the system they maintain

## What this means in practice

Team incentives follow the team's name. A team named after a system optimizes for system metrics; a team named after a problem optimizes for outcomes. Naming choices shape what gets built and what gets ignored.

## What this does not mean

This does not mean ignoring system maintenance. It means the team's identity should anchor on what it is trying to achieve for users, not on the artifacts it currently happens to own.

## Sources

Captured 2026-05-29 from a conversation with James (ex-Dropbox). No URL.
```

(c) **`principles/simple-systems.md`**:

```markdown
---
adopted: 2026-05-29
status: active
sources: []
---
# Simple systems are the goal

## What this means in practice

Prefer fewer moving parts over clever architecture. Example: Dropbox once ran its metadata layer on around 1000 MySQL nodes rather than adopting a more "scalable" custom store, because the operational simplicity of a known boring system outweighed the theoretical benefits of a complex one.

## What this does not mean

This does not mean refusing all complexity. It means complexity must be justified by a concrete need, not by anticipation.

## Sources

Captured 2026-05-29 from a conversation with James (ex-Dropbox). No URL.
```

- [ ] **Step 8: Manually sync meta-json after the James writes**

The James principles bypassed `/context-ingest`, so `.repo-context-meta.json` doesn't yet reflect them. In the same Claude Code session, dispatch `meta-syncer` manually:

```
Use the meta-syncer sub-agent to sync ~/playground/sherpa-wiki/.repo-context-meta.json
```

(Or invoke the agent via the Task tool directly with `subagent_type: "meta-syncer"`.) Verify the confirmation line.

Then commit:

```bash
cd ~/playground/sherpa-wiki
git add . && git commit -m "Add 3 James principles + sync meta"
```

- [ ] **Step 9: Verify the acceptance criteria**

From `~/playground/sherpa-wiki/`:

```bash
echo "=== raw entries ===" && ls -1 raw/
echo "=== principles ===" && ls -1 principles/
echo "=== topics ===" && ls -1 topics/
echo "=== meta-json shape ===" && cat .repo-context-meta.json
echo "=== log ===" && grep "^## \[" log.md
echo "=== checking each ingest principle has a sources: array ===" && \
  for f in principles/*.md; do printf "%s: " "$f"; head -10 "$f" | grep "^sources:"; done
```

Acceptance criteria from the spec:
- Three `raw/` entries, one per backbone URL, each with verbatim quotes in front-matter and body.
- At least five principles total (3 James + at least 2 from ingest).
- At least one topic page per ingested article (so ≥3 topic pages from ingest, plus any extensions).
- Every principle whose source was a URL ingest has `sources:` pointing at the matching raw slug. James principles have `sources: []`.
- `log.md` has 3 ingest entries plus the `init` entry, chronologically.
- `.repo-context-meta.json` arrays match on-disk content (run `meta-syncer` once more if the counts look off).

- [ ] **Step 10: Push the wiki**

```bash
cd ~/playground/sherpa-wiki
git push origin main
```

Verify on GitHub: `gh repo view damian0o/sherpa-wiki --web` (opens in browser).

- [ ] **Step 11: Record outcome in memory**

Update `~/.claude/projects/-Users-damianospara-playground-sherpa/memory/reference_seed_sources.md` to note: "Ingested on 2026-05-29 into `damian0o/sherpa-wiki`." Or append a new project memory describing what landed and where.

---

## Task 6: Tag v0.2.0 and publish the release

**Files:** none modified — git tag + GitHub release operations only.

- [ ] **Step 1: Confirm the source-repo tree is clean and tests are green**

```bash
cd /Users/damianospara/playground/sherpa
git status
npm test 2>&1 | tail -5
```

Expected: `nothing to commit, working tree clean` (untracked `TODO.md` is OK), 120 tests pass.

- [ ] **Step 2: Tag v0.2.0**

```bash
git tag -a v0.2.0 -m "v0.2.0 — /context-ingest: URL → wiki via article-analyzer + meta-syncer. Backbone seeded into damian0o/sherpa-wiki."
git tag -l v0.2.0 -n5
```

Expected: tag created with annotation.

- [ ] **Step 3: Push main and tag**

```bash
git push origin main
git push origin v0.2.0
```

- [ ] **Step 4: Create the GitHub Release**

```bash
gh release create v0.2.0 --title "v0.2.0 — /context-ingest" --notes-from-tag
gh release view v0.2.0
```

Expected: release page populated with the tag annotation.

- [ ] **Step 5: Update the CHANGELOG**

Edit `CHANGELOG.md`:
- Move the relevant items from `[Unreleased]` to a new `[0.2.0] — 2026-05-29` section.
- Add details: new artifacts (raw.md template, article-analyzer agent, /context-ingest command), the topic.md sources field, the upgrade-path note (`/plugin marketplace update sherpa`).
- Keep the remaining `[Unreleased]` entries (v0.2.1 lint, v0.2.2 hook) as planned.

Then commit:

```bash
git add CHANGELOG.md && git commit -m "CHANGELOG: v0.2.0 entry"
git push origin main
```

Note: the release at `v0.2.0` will point at the tag commit, not the post-CHANGELOG commit. That's fine — the release notes come from the tag annotation, and the CHANGELOG update is documentation that moves the floor for v0.2.1 work.
