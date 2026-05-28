# repo-context v0.1 Followups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close three gaps surfaced by the 2026-05-28 v0.1 dogfooding session so the wiki the plugin produces matches its own schema, then tag `v0.1.0`. Spec: [`docs/superpowers/specs/2026-05-28-repo-context-v0.1-followups-design.md`](../specs/2026-05-28-repo-context-v0.1-followups-design.md).

**Architecture:** Three independent additions on the existing markdown-only plugin: a new `meta-syncer` sub-agent that derives `.repo-context-meta.json` from on-disk content; a `.gitkeep` step in `/context-init` so the four content directories survive clone; a documented slug-fallback chain in `repo-scanner` (origin → manifest → basename) with `context-onboard-satellite` prompting the user to confirm when the slug isn't from origin. No new runtime dependencies; v0.1's "markdown only" posture is preserved.

**Tech Stack:** No new tech. Existing vitest + gray-matter + ajv test runner for shape-checking; markdown plus YAML front-matter for plugin content; bash invoked by Claude for filesystem mutations at runtime.

**Scope (v0.1.x → v0.1.0 tag):**

- New: `plugins/repo-context/agents/meta-syncer.md`.
- Modify: `plugins/repo-context/commands/context-init.md` — `.gitkeep` step + meta-syncer invocation (replacing inline `.repo-context-meta.json` literal).
- Modify: `plugins/repo-context/agents/repo-scanner.md` — three-step slug fallback chain + `derived_from:` output field.
- Modify: `plugins/repo-context/skills/context-onboard-satellite/SKILL.md` — read `derived_from:`, prompt user to confirm when not `origin`.
- Modify: `tests/commands.test.ts` — `.gitkeep` × 4 reference; meta-syncer reference; remove inline-JSON assertion.
- Modify: `tests/agents.test.ts` — new `meta-syncer` describe block; new `repo-scanner` assertions for fallback chain + `derived_from:`.
- Modify: `tests/skills.test.ts` — new `context-onboard-satellite` assertion for slug-confirmation prompt.

**Out of scope:**

- `protocol.file.allow` workaround for `file://` submodule URLs (dogfood-setup artifact, not a plugin gap).
- v0.2 derived-graph index, `context-lint`, principle-source auditing.
- Rebase / backport — fixes ship as new commits on `main`; the tag captures the post-fix state.

**File structure produced/touched by this plan:**

```
plugins/repo-context/
  agents/
    meta-syncer.md            (NEW)
    repo-scanner.md           (MODIFY)
  commands/
    context-init.md           (MODIFY)
  skills/
    context-onboard-satellite/
      SKILL.md                (MODIFY)
tests/
  agents.test.ts              (MODIFY — add meta-syncer block, extend repo-scanner)
  commands.test.ts            (MODIFY — extend context-init)
  skills.test.ts              (MODIFY — extend context-onboard-satellite)
docs/superpowers/
  specs/
    2026-05-28-repo-context-v0.1-followups-design.md   (already exists)
  plans/
    2026-05-28-repo-context-v0.1-followups.md          (this file)
```

**Testing philosophy:**

- *What gets tested:* the shape of new/modified markdown — front-matter, required sections, key strings the dispatching skill or command relies on.
- *What does not get tested in v0.1.x:* the *behavior* of the meta-syncer sub-agent (no test harness can invoke a sub-agent deterministically). That's covered by the manual dogfooding re-run gate in Task 6.
- *TDD discipline:* every task updates tests first (red), then implements (green), then commits.

---

## Task 1: New `meta-syncer` sub-agent

**Files:**

- Modify: `/Users/damianospara/playground/llm-wiki-impl/tests/agents.test.ts`
- Create: `/Users/damianospara/playground/llm-wiki-impl/plugins/repo-context/agents/meta-syncer.md`

- [ ] **Step 1: Append a failing test block for meta-syncer**

Open `tests/agents.test.ts` and append a new `describe` block after the existing `repo-scanner` block. The full appended content is:

```ts
describe("agents/meta-syncer.md", () => {
  const path = resolve(agentsDir, "meta-syncer.md");

  it("exists", () => {
    expect(existsSync(path)).toBe(true);
  });

  it("front-matter has name and description", () => {
    const { frontMatter } = loadMarkdown(path);
    expect(frontMatter.name).toBe("meta-syncer");
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

  it("Critical rules enforce read-only on content, single writable file, deterministic, idempotent, no git mutation", () => {
    const { body } = loadMarkdown(path);
    expect(body).toMatch(/Read-only on wiki content/);
    expect(body).toMatch(/Single writable file/);
    expect(body).toMatch(/Deterministic ordering/);
    expect(body).toMatch(/Idempotent/);
    expect(body).toMatch(/No git mutation/);
  });

  it("Output format documents the {slug, path} entry shape", () => {
    const { body } = loadMarkdown(path);
    expect(body).toMatch(/"slug"/);
    expect(body).toMatch(/"path"/);
    expect(body).toMatch(/"kind":\s*"repo-context-store"/);
    expect(body).toMatch(/"schema_version":\s*1/);
  });

  it("Workflow process scans topics/decisions/principles (not raw/)", () => {
    const { body } = loadMarkdown(path);
    expect(body).toMatch(/topics\//);
    expect(body).toMatch(/decisions\//);
    expect(body).toMatch(/principles\//);
    expect(body).toMatch(/raw\/.*(skip|ignore|not scanned|excluded)/i);
  });

  it("has no placeholder leftovers", () => {
    const { raw } = loadMarkdown(path);
    expect(noPlaceholders(raw)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- agents`
Expected: previous `repo-scanner` tests still pass; **all seven new `meta-syncer` tests FAIL** because the agent file doesn't exist yet (the `exists` test will fail first; the other tests may also fail with file-read errors).

- [ ] **Step 3: Create `plugins/repo-context/agents/meta-syncer.md`**

Full file content:

````markdown
---
name: meta-syncer
description: Use when a command or skill has just finished mutating wiki content and the derived .repo-context-meta.json index needs to be brought back in sync with what's on disk. Read-only on content; the only file written is .repo-context-meta.json.
---

# meta-syncer

## Identity

You are `meta-syncer`, a deterministic, read-only-on-content sub-agent. You inspect filenames in a `repo-context` wiki and produce a single derived JSON index. You do not read page contents, do not modify pages, do not run git operations. You write exactly one file: `.repo-context-meta.json`.

## Mission

Bring `<wiki-root>/.repo-context-meta.json` back in sync with what is actually on disk under `topics/`, `decisions/`, and `principles/`. The dispatching command/skill invokes you after writing or deleting wiki pages but before staging the commit.

## Critical rules

- **Read-only on wiki content.** You may list directory contents and read filenames. You must not open, parse, or modify any `.md` page under the wiki.
- **Single writable file.** The only file you write is `<wiki-root>/.repo-context-meta.json`. Direct overwrite is fine — no concurrent writers exist in v0.1's flow.
- **Deterministic ordering.** Entries within each array are sorted by `slug`, ascending. Same on-disk state → byte-identical output (modulo the `updated:` date).
- **Idempotent.** Running twice in a row with no on-disk change produces the same file (date aside).
- **No git mutation.** You do not run `git add`, `git commit`, `git status`, or any other git command. The dispatching caller handles staging and committing.
- **Scope control.** Do not validate principles' sources, do not warn about empty wikis, do not propose content changes. You only sync the file.

## Output format

After writing the file, return a single confirmation line to the caller in this exact shape:

```
meta-syncer: synced <wiki-root>/.repo-context-meta.json
  topics: <N>, decisions: <M>, principles: <K>, updated: <date>
```

The file you write at `<wiki-root>/.repo-context-meta.json` has this shape:

```json
{
  "kind": "repo-context-store",
  "schema_version": 1,
  "topics": [
    {"slug": "<filename-without-extension>", "path": "topics/<filename>"}
  ],
  "decisions": [
    {"slug": "<filename-without-extension>", "path": "decisions/<filename>"}
  ],
  "principles": [
    {"slug": "<filename-without-extension>", "path": "principles/<filename>"}
  ],
  "updated": "<YYYY-MM-DD>"
}
```

Each array's entries are sorted by `slug`, ascending. Empty arrays are represented as `[]`. `path` is forward-slash separated, relative to the wiki root.

## Workflow process

1. Receive `<wiki-root>` from the caller. Normalise to an absolute path.
2. For each of `topics/`, `decisions/`, `principles/` (in that order), list direct child entries at depth 1 only:
   - Use the Bash tool: `ls -1 <wiki-root>/<dir>/`.
   - Filter to entries matching `*.md`. Exclude `.gitkeep`, dot-files, and anything that is not a regular file (no descent into subdirectories — depth 1 only).
3. `raw/` is intentionally skipped. It holds evidence/source ingests, not catalogue material; `index.md` does not track `raw/` either.
4. For each remaining `.md` filename, derive `slug` as the filename minus the trailing `.md`. Derive `path` as `<dir>/<filename>` with forward slashes.
5. Sort each array by `slug`, ascending. Empty arrays stay `[]`.
6. Compose the JSON document with `kind: "repo-context-store"`, `schema_version: 1`, the three arrays, and `updated:` set to today's ISO date (YYYY-MM-DD). Use the Bash tool to obtain the date: `date +%F`.
7. Write the document to `<wiki-root>/.repo-context-meta.json`, overwriting any existing file. Use the Write tool.
8. Return the confirmation line from "Output format" above.

You are done when the file has been written and the confirmation line has been returned. You never stage, never commit, never push.
````

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- agents`
Expected: all `repo-scanner` tests pass AND all seven `meta-syncer` tests pass.

- [ ] **Step 5: Commit**

```bash
git add plugins/repo-context/agents/meta-syncer.md tests/agents.test.ts
git commit -m "Add meta-syncer sub-agent (derives .repo-context-meta.json from disk)"
```

---

## Task 2: `/context-init` — `.gitkeep` step + meta-syncer invocation

**Files:**

- Modify: `/Users/damianospara/playground/llm-wiki-impl/tests/commands.test.ts`
- Modify: `/Users/damianospara/playground/llm-wiki-impl/plugins/repo-context/commands/context-init.md`

- [ ] **Step 1: Update tests/commands.test.ts**

Two edits in the `describe("commands/context-init.md", ...)` block:

(a) **Remove** the now-obsolete inline-JSON assertion (it tests an implementation detail that's about to be replaced):

```ts
  it("body's meta file template includes a principles array", () => {
    const { body } = loadMarkdown(path);
    expect(body).toMatch(/"principles":\s*\[\]/);
  });
```

(b) **Add** two new `it(...)` cases anywhere inside the same describe block (e.g. before the `has no placeholder leftovers` test):

```ts
  it("body writes .gitkeep to each of the four content-category directories", () => {
    const { body } = loadMarkdown(path);
    for (const d of ["topics", "decisions", "principles", "raw"]) {
      expect(body).toContain(`${d}/.gitkeep`);
    }
  });

  it("body invokes the meta-syncer sub-agent for the marker file", () => {
    const { body } = loadMarkdown(path);
    expect(body).toMatch(/meta-syncer/);
  });
```

- [ ] **Step 2: Run the tests to verify the new ones fail**

Run: `npm test -- commands`
Expected: the two new tests FAIL (command body doesn't mention `.gitkeep` or `meta-syncer` yet). All other context-init/context-connect tests still pass.

- [ ] **Step 3: Update `plugins/repo-context/commands/context-init.md`**

In the `## Steps` section, **replace** existing steps 5–6 with three new steps. The full replacement spans from the line beginning `5. **Create directories.**` through the closing fence of the JSON block in step 6. Replace with:

````markdown
5. **Create directories.** Create the four content-category directories under `<target>`: `topics/`, `decisions/`, `principles/`, `raw/`. Run `mkdir -p <target>/topics/ <target>/decisions/ <target>/principles/ <target>/raw/`.
6. **Drop `.gitkeep` placeholders.** Write empty files at `<target>/topics/.gitkeep`, `<target>/decisions/.gitkeep`, `<target>/principles/.gitkeep`, and `<target>/raw/.gitkeep`. Use the Bash tool: `touch <target>/topics/.gitkeep <target>/decisions/.gitkeep <target>/principles/.gitkeep <target>/raw/.gitkeep`. These placeholders ensure the four content directories survive `git clone` (git does not track empty directories).
7. **Sync `.repo-context-meta.json` via `meta-syncer`.** Use the Task tool with `subagent_type: "meta-syncer"`. Pass `<target>` as the wiki root. The sub-agent writes the initial marker file (empty `topics/decisions/principles` arrays, today's ISO date).
````

Then renumber the remaining steps. The original step 7 ("Initial commit") becomes step 8; the original step 8 ("Prompt the user to push") becomes step 9. The full edits to the file are:

- Replace the block from the start of original step 5 to the end of original step 6 (the JSON code fence) with the new steps 5–7 above.
- Change the original `7. **Initial commit.**` line to `8. **Initial commit.**`.
- Change the original `8. **Prompt the user to push.**` line to `9. **Prompt the user to push.**`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- commands`
Expected: all context-init and context-connect tests PASS. The "creates the four content-category directories" test still passes (the `mkdir` line still mentions all four). The "specifies writing the marker .repo-context-meta.json" test still passes (the new meta-syncer step still mentions the filename). The two new tests pass.

- [ ] **Step 5: Commit**

```bash
git add plugins/repo-context/commands/context-init.md tests/commands.test.ts
git commit -m "context-init: drop .gitkeep in content dirs; delegate marker to meta-syncer"
```

---

## Task 3: `repo-scanner` — three-step slug fallback chain

**Files:**

- Modify: `/Users/damianospara/playground/llm-wiki-impl/tests/agents.test.ts`
- Modify: `/Users/damianospara/playground/llm-wiki-impl/plugins/repo-context/agents/repo-scanner.md`

- [ ] **Step 1: Add failing tests for the new behavior**

In `tests/agents.test.ts`, **inside** the existing `describe("agents/repo-scanner.md", ...)` block (e.g. just before the `has no placeholder leftovers` test), add:

```ts
  it("documents the three-step slug fallback chain (origin -> manifest -> basename)", () => {
    const { body } = loadMarkdown(path);
    expect(body).toMatch(/origin/i);
    for (const m of ["package.json", "pyproject.toml", "Cargo.toml", "go.mod"]) {
      expect(body).toContain(m);
    }
    expect(body).toMatch(/basename/);
  });

  it("Output format requires derived_from field when slug is not from origin", () => {
    const { body } = loadMarkdown(path);
    expect(body).toMatch(/derived_from/);
    expect(body).toMatch(/unconfirmed/);
  });

  it("npm scope handling: @org/foo -> foo is documented", () => {
    const { body } = loadMarkdown(path);
    expect(body).toMatch(/@org\/foo|npm scope|strip scope|scoped package/i);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- agents`
Expected: existing `meta-syncer` and `repo-scanner` tests still pass; the three new `repo-scanner` tests FAIL because the agent file doesn't yet document the fallback chain.

- [ ] **Step 3: Update `plugins/repo-context/agents/repo-scanner.md`**

Two edits.

**Edit A** — replace the `Satellite identifier` bullet block at the top of the `## Output format` section. The current block is:

```markdown
## Satellite identifier
- **slug**: <kebab-case identifier, stable across clones of the same satellite.
  From `git remote get-url origin`: take the **last path component** (after the final `/` or `:`),
  strip a trailing `.git` suffix, lowercase, normalise any non-alphanumeric character to `-`.
  Examples: `https://github.com/foo/bar.git` → `bar`; `git@gitlab.com:org/my-proj.git` → `my-proj`;
  `https://gitlab.com/group/sub/Proj` → `proj`. If no origin remote is configured, fall back to
  `basename $(pwd)` with the same lowercase + non-alnum→`-` normalisation. The slug must be the
  same whether the satellite was cloned via HTTPS or SSH.>
- **remote URL**: <verbatim output of `git remote get-url origin`, or `(none)` if no origin remote configured>
```

Replace with:

````markdown
## Satellite identifier
- **slug**: <kebab-case identifier derived via the three-step fallback chain below. Apply the same
  lowercase + non-alphanumeric → `-` normalisation at every step.>
- **derived_from**: <one of `origin`, `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`,
  `basename` — the source that produced the slug. Required field. When the value is anything other
  than `origin`, append the literal string ` (unconfirmed)` to the slug above.>
- **remote URL**: <verbatim output of `git remote get-url origin`, or `(none)` if no origin remote configured>

### Slug fallback chain
Use the first step that yields a value. Apply lowercase + non-alphanumeric → `-` normalisation to the final result.

1. **Origin remote.** `git remote get-url origin`: take the last path component (after the final
   `/` or `:`), strip a trailing `.git`. Examples: `https://github.com/foo/bar.git` → `bar`;
   `git@gitlab.com:org/my-proj.git` → `my-proj`. If origin is configured, this is the answer and
   `derived_from: origin`.
2. **Manifest name** (only if origin is absent). Check files in this order and use the first match:
   - `package.json`: read the `name` field. For scoped npm names like `@org/foo`, strip the scope
     prefix → `foo`. Result: `derived_from: package.json`.
   - `pyproject.toml`: read `[project].name`, falling back to `[tool.poetry].name` if the former
     is absent. Result: `derived_from: pyproject.toml`.
   - `Cargo.toml`: read `[package].name`. Result: `derived_from: Cargo.toml`.
   - `go.mod`: read the first line `module <path>`; take the last `/`-separated segment of
     `<path>`. Result: `derived_from: go.mod`.
3. **Directory basename** (last resort). `basename $(pwd)`. Result: `derived_from: basename`.

The slug must be the same whether the satellite was cloned via HTTPS or SSH (step 1 guarantees this
when origin is set; steps 2 and 3 are origin-independent by construction).
````

**Edit B** — update the `## Workflow process` section's step 1 to reference the chain. Find the existing step 1:

```markdown
1. Determine the satellite slug and remote URL: run `git remote get-url origin 2>/dev/null` and `pwd` to derive the slug.
```

Replace with:

```markdown
1. Determine the satellite slug and remote URL by walking the three-step fallback chain in the Output format section: try `git remote get-url origin 2>/dev/null` first; if empty, check manifests in the documented order (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`); if none match, use `basename $(pwd)`. Set `derived_from` to the step that succeeded and mark the slug `(unconfirmed)` in your output if `derived_from` is anything other than `origin`.
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- agents`
Expected: all `meta-syncer` tests pass, all original `repo-scanner` tests still pass, the three new `repo-scanner` tests now PASS.

- [ ] **Step 5: Commit**

```bash
git add plugins/repo-context/agents/repo-scanner.md tests/agents.test.ts
git commit -m "repo-scanner: document origin -> manifest -> basename slug fallback with derived_from"
```

---

## Task 4: `context-onboard-satellite` — slug confirmation prompt

**Files:**

- Modify: `/Users/damianospara/playground/llm-wiki-impl/tests/skills.test.ts`
- Modify: `/Users/damianospara/playground/llm-wiki-impl/plugins/repo-context/skills/context-onboard-satellite/SKILL.md`

- [ ] **Step 1: Add a failing test for the prompt behavior**

In `tests/skills.test.ts`, **inside** the existing `describe("skills/context-onboard-satellite/SKILL.md", ...)` block (e.g. just before the `has no placeholder leftovers` test), add:

```ts
  it("body reads derived_from and prompts to confirm slug when not from origin", () => {
    const { body } = loadMarkdown(path);
    expect(body).toMatch(/derived_from/);
    expect(body).toMatch(/confirm|prompt/i);
    expect(body).toMatch(/abort|stop|refuse/i);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- skills`
Expected: the new test FAILS (SKILL.md doesn't reference `derived_from` yet). All other skill tests still pass.

- [ ] **Step 3: Update `plugins/repo-context/skills/context-onboard-satellite/SKILL.md`**

Replace the entire `## Procedure` step 2 ("Extract the satellite slug"). The current step is:

```markdown
2. **Extract the satellite slug.** From `repo-scanner`'s "Satellite identifier" section, read `slug`. This is the value you will put into `repos:` front-matter on every seed page.
```

Replace with:

```markdown
2. **Extract and confirm the satellite slug.** From `repo-scanner`'s "Satellite identifier" section, read `slug` and `derived_from`.
   - If `derived_from: origin`, use the slug as-is. No prompt needed.
   - If `derived_from` is anything else (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, or `basename`), the slug is unconfirmed. Before proposing any seed pages, prompt the user:

     > No origin remote on this satellite. Use slug `<slug>` (derived from `<derived_from>`)? Reply `y` to accept, `n` to abort, or type a different slug to override.

   - On `y`: use the slug as-is.
   - On `n`: abort the onboarding cleanly. Do not write any wiki pages. Surface to the user that onboarding was aborted at their request and no changes were made.
   - On any other reply: treat it as a user-typed override. Normalise it (lowercase, non-alphanumeric → `-`) and use that as the slug for the remainder of this run.

   The confirmed (or overridden) slug is the value you put into `repos:` front-matter on every seed page.
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- skills`
Expected: all `context-onboard-satellite` tests pass (including the new one), all other skill tests still pass.

- [ ] **Step 5: Commit**

```bash
git add plugins/repo-context/skills/context-onboard-satellite/SKILL.md tests/skills.test.ts
git commit -m "context-onboard-satellite: confirm slug with user when derived_from != origin"
```

---

## Task 5: Full test suite green

**Files:** none modified — verification only.

- [ ] **Step 1: Run the full vitest suite**

Run: `npm test`
Expected: all suites PASS. The line count should be the previous 84 plus the new tests added: 7 (meta-syncer) + 2 (context-init) + 3 (repo-scanner) + 1 (context-onboard-satellite) = **13 new tests**, minus 1 removed (inline-JSON assertion) = **12 net new**. Expected total: **96 tests, all passing**.

If a test fails:
- Re-read the failing assertion against the file it tests.
- Fix the file (not the assertion — the assertions encode the spec).
- Re-run until green.

- [ ] **Step 2: Sanity-check the diff**

Run:

```bash
git log --oneline 47d94ad..HEAD
```

Expected: four commits, one per Task 1–4:

```
<sha> context-onboard-satellite: confirm slug with user when derived_from != origin
<sha> repo-scanner: document origin -> manifest -> basename slug fallback with derived_from
<sha> context-init: drop .gitkeep in content dirs; delegate marker to meta-syncer
<sha> Add meta-syncer sub-agent (derives .repo-context-meta.json from disk)
```

No verification commit is needed; this is a checkpoint task.

---

## Task 6: Manual dogfooding re-run

**Files:** none modified — execution gate.

This task validates the implementation against the spec's acceptance gate. The re-run is user-driven; this checklist enumerates what to verify and what each finding's "fixed" looks like.

- [ ] **Step 1: Prep a fresh dogfood workspace**

The user (or you, assisting) creates:

```
~/playground/llm-wiki-impl-dogfood/v0.1.0/
  wiki-store/        (empty)
  satellite/         (toy git repo — same shape as 2026-05-28 run: README, package.json with name "billing-service", Dockerfile, src/, etc., one initial commit, NO origin remote)
  wiki-remote.git/   (bare repo: git init --bare)
```

The "no origin on satellite" choice is intentional — it exercises the new slug-fallback chain. The package.json `name` must be `billing-service` (different from the dir basename) so the test of finding-4 is meaningful.

- [ ] **Step 2: Reinstall the plugin from this commit**

In a Claude Code session:

```
/plugin marketplace remove repo-context-marketplace
/plugin marketplace add /Users/damianospara/playground/llm-wiki-impl
/plugin install repo-context@repo-context-marketplace
```

(The remove/re-add cycle is needed because the local marketplace was already installed and Claude Code caches the plugin's content.)

- [ ] **Step 3: Re-run the five-step scenario from README.md §"Dogfooding (v0.1 acceptance)"**

Drive each of the five steps end-to-end. While running, **verify each finding is closed**:

**Finding #1 (meta-json sync).** After `/context-init` in wiki-store, then again after `/context-connect` writes seeds, inspect `.repo-context-meta.json`:

```bash
cat /Users/damianospara/playground/llm-wiki-impl-dogfood/v0.1.0/wiki-store/.repo-context-meta.json
# AND, after onboarding adds seeds inside the submodule:
cat /Users/damianospara/playground/llm-wiki-impl-dogfood/v0.1.0/satellite/wiki/.repo-context-meta.json
```

Expected after `/context-init`: empty arrays, `updated` = today.
Expected after onboarding seeds land: arrays populated with `{slug, path}` entries matching the files on disk, sorted alphabetically by slug, `updated` = today.

**Finding #3 / #5 (content dirs survive clone).** After `/context-connect` clones the wiki submodule, inspect:

```bash
ls -A /Users/damianospara/playground/llm-wiki-impl-dogfood/v0.1.0/satellite/wiki/
```

Expected: `.git CLAUDE.md decisions index.md log.md principles raw topics .repo-context-meta.json` — **all four content directories present** (each contains a `.gitkeep`).

**Finding #4 (slug confirmation).** During `/context-connect`, `context-onboard-satellite` should prompt:

> No origin remote on this satellite. Use slug `billing-service` (derived from `package.json`)? Reply `y` to accept, `n` to abort, or type a different slug to override.

Reply `y`. Then inspect a topic page:

```bash
head -5 /Users/damianospara/playground/llm-wiki-impl-dogfood/v0.1.0/satellite/wiki/topics/<some-topic>.md
```

Expected `repos:` front-matter: `repos: [billing-service]` — not `[satellite]`.

- [ ] **Step 4: Confirm the original three v0.1 acceptance criteria still pass**

From README §"Acceptance criteria":

1. ≥1 topic page tagged with the satellite's slug in `repos:` front-matter ✅
2. `log.md` contains `init`, `connect`, `onboard` entries in chronological order ✅
3. Satellite `CLAUDE.md` has `BEGIN/END repo-context` block ✅

If any of these three regress, the implementation broke something — go fix and re-run.

- [ ] **Step 5: Tear down the dogfood workspace**

```bash
rm -rf /Users/damianospara/playground/llm-wiki-impl-dogfood/v0.1.0
```

Per [`feedback_dogfood_layout`](../../../../.claude/projects/-Users-damianospara-playground-llm-wiki-impl/memory/feedback_dogfood_layout.md) the workspace is disposable; the spec and plan capture what we learned.

- [ ] **Step 6: Record the outcome in memory**

Update or append to `~/.claude/projects/-Users-damianospara-playground-llm-wiki-impl/memory/project_v0.1_dogfood_outcome.md` with a final-result note: "Re-run on YYYY-MM-DD: findings 1, 3, 4, 5 closed; v0.1.0 tagged at commit <sha>."

No commit task — memory is outside the repo.

---

## Task 7: Tag v0.1.0

**Files:** none modified — git tag operation only.

- [ ] **Step 1: Confirm the tree is clean**

Run:

```bash
git status
```

Expected: `nothing to commit, working tree clean`.

If not clean, do not tag. Investigate the dirty state with the user.

- [ ] **Step 2: Confirm tests are green**

Run: `npm test`
Expected: 96 tests pass.

- [ ] **Step 3: Tag**

```bash
git tag -a v0.1.0 -m "v0.1.0 — initial skeleton (skeletal smoke test): install path, /context-init, /context-connect, context-onboard-satellite (repo-scanner only). Dogfood-verified on 2026-05-28 followup spec."
git tag -l v0.1.0 -n9
```

Expected: tag created, `git tag -l` shows the annotation.

- [ ] **Step 4: Confirm with the user before any push**

```bash
git log --oneline -1
echo "Tag v0.1.0 is local-only. Push when you're ready with:"
echo "  git push origin main"
echo "  git push origin v0.1.0"
```

Do **not** push automatically. Pushes to shared remotes are user-authorized actions; the user pushes (or asks you to push) when they're ready.
