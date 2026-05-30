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

2. **Derive the slug from the URL.** Take the last meaningful path component of the URL (after the last `/`, before any `?` or `#`). Strip a trailing slash, then strip a recognized trailing document extension if present (`.md`, `.html`, `.htm`, `.php`, `.aspx`, `.jsp`, `.txt`). If the result is empty (e.g. for `https://example.com/`), fall back to the hostname. Normalize: lowercase, replace non-alphanumeric characters with `-`, collapse runs of `-`, strip leading/trailing `-`. Show the derived slug to the user and offer them the chance to override before continuing.

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

9. **Write the raw page.** Render `plugins/repo-context/templates/raw.md` with substitutions: `{{source_url}}`, `{{date}}` (today's ISO date), `{{title}}` (from analyzer output), `{{author}}` (from analyzer output or `(not detected)`). The slug is not a template token — it is the output filename `raw/<slug>.md` and the `[[<slug>]]` wikilink target. Write the analyzer's `summary` into the `## Summary` section. Write the full claim list (all claims, whether accepted or not — the raw page is the evidence layer, not the proposal layer) into the `## Claims` section. For each claim, render an H3 with the claim text, the verbatim quote(s) blockquoted, and a `→ See [[<slug>]] (<kind>).` pointer to the principle/topic that consumed it (or `→ Not promoted in this ingest.` for rejected claims).

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
