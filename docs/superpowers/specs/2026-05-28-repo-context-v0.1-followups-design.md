# repo-context v0.1 dogfood followups — design

Three small but real gaps surfaced when the v0.1 dogfooding scenario was run end-to-end on 2026-05-28 (see [`plans/2026-05-27-repo-context-v0.1.md`](../plans/2026-05-27-repo-context-v0.1.md) for the band that this completes). The scenario passed its three documented acceptance criteria, but the produced wiki was internally inconsistent in ways that the tag should not ship with. This spec closes the gaps so the wiki the plugin emits actually matches its own schema, before tagging `v0.1.0`.

The followups are bundled into a single spec rather than chased independently because they overlap operationally (all three are touched by `/context-init` and/or `context-onboard-satellite`) and the band is small enough to merit one plan, not three.

## Findings addressed

1. **`.repo-context-meta.json` is described as a "derived graph index" in the wiki schema, but nothing derives it.** Onboarding left the file with empty `topics/decisions/principles` arrays even after accepted seeds landed on disk. The file is self-inconsistent with the wiki content next to it.
2. **Empty content directories don't survive clone-as-submodule.** `/context-init` `mkdir`s `topics/ decisions/ principles/ raw/` and commits, but git skips empty dirs. When the wiki is added as a submodule and cloned, only dirs that received content survive. The wiki schema doc (`templates/CLAUDE.md`) still describes the missing dirs as part of the layout — self-inconsistency.
3. **Slug derivation falls back to `basename $(pwd)` when no origin remote is configured.** Spec-correct per the current `repo-scanner` agent. But satellites are commonly initialized before a remote is added, and the resulting slug (e.g. `satellite` instead of `billing-service`) is unrelated to the project's actual identity. The wiki ends up tagged with a slug nobody recognizes.

A fourth dogfooding finding — the `protocol.file.allow=always` workaround for local-path submodule URLs — is **out of scope**. It only manifests when the wiki "remote" is a local file path, which is a dogfood-setup artifact, not how real users will consume the plugin. No production fix needed.

## Goal

Make the wiki the plugin produces match its own schema, end-to-end, after a clean run of the v0.1 scenario. Concretely:

- `.repo-context-meta.json` reflects on-disk content immediately after any wiki-mutating command.
- Every directory the wiki schema names actually exists after clone.
- The satellite slug in `repos:` front-matter corresponds to the satellite's recognizable identity (project name when no remote is configured), with user confirmation when the slug is uncertain.

## Non-goals

- Backporting these fixes to the existing pre-tag commits via rebase. The fixes ship as new commits on `main`; the tag captures the post-fix state.
- Designing the v0.2 derived graph index. The meta-syncer here covers only the minimal `{slug, path}` shape needed for v0.1 honesty; the richer graph (cross-references, orphan detection, status filtering) is v0.2 territory and benefits from being designed with `context-lint` in scope.
- `file://` submodule URL handling (see "Findings addressed" above).

## Approach

Three components, each scoped to one finding:

1. A new sub-agent, **`meta-syncer`**, owns the derivation of `.repo-context-meta.json` from on-disk content. Every command/skill that finishes by committing changes to the wiki invokes it before `git add`. Markdown-only by design — preserves the v0.1 "no runtime code" rule and adds zero end-user dependencies. Sub-agent was picked over a bash/node script after weighing determinism (script wins) against portability and zero-dependency footprint (sub-agent wins). Portability won.
2. `/context-init` writes a `.gitkeep` file in each of the four content directories at scaffold time. Two-line change in the command spec; the four content dirs survive clone.
3. `repo-scanner` gains a documented slug-fallback chain (origin → manifest name → dir basename) and marks the result `(unconfirmed)` when origin is absent. `context-onboard-satellite` reads the unconfirmed marker and prompts the user to confirm or override before the slug propagates into any `repos:` front-matter.

The chosen mechanisms preserve the plugin's "markdown only, no end-user dependency beyond git" baseline for v0.1.

## Components

### `meta-syncer` sub-agent

**Location:** `plugins/repo-context/agents/meta-syncer.md`.

**Purpose.** Derive `.repo-context-meta.json` deterministically from on-disk wiki content. Single source of truth for the file's shape during v0.1.

**Inputs.** A wiki root path (absolute or relative; agent normalizes).

**Output file shape.** Replaces the file at `<wiki-root>/.repo-context-meta.json` with:

```json
{
  "kind": "repo-context-store",
  "schema_version": 1,
  "topics":     [{"slug": "<basename-without-ext>", "path": "topics/<file>"}, ...],
  "decisions":  [{"slug": "<basename-without-ext>", "path": "decisions/<file>"}, ...],
  "principles": [{"slug": "<basename-without-ext>", "path": "principles/<file>"}, ...],
  "updated": "<today ISO>"
}
```

**Derivation rules.**

- Scan only `topics/`, `decisions/`, `principles/` at depth 1. Ignore `.gitkeep`, dot-files, and anything not matching `*.md`.
- `raw/` is **not** scanned. It's evidence, not catalogue material; `index.md` doesn't track it either; including it would create churn on every ingest without making the file more useful.
- Entries within each array are sorted by `slug`, ascending.
- `slug` is the filename without the `.md` extension. No normalization (filenames are already kebab-case per the wiki's conventions; if a file violates that, it's a wiki-content bug, not meta-syncer's concern).
- `path` is relative to the wiki root, forward-slash separated.
- `updated` is today's ISO date (YYYY-MM-DD).

**Critical rules (in the agent's `Critical rules` section).**

- **Read-only on wiki content.** Reads `.md` filenames only. Never opens or modifies a content page.
- **Single writable file.** The only file this agent writes is `<wiki-root>/.repo-context-meta.json`. Direct overwrite is fine — no concurrent writers exist in v0.1's flow.
- **Deterministic ordering.** Sort by slug, ascending. Same on-disk state → byte-identical output (modulo `updated:`, which moves daily).
- **Idempotent.** Running twice in a row with no on-disk change produces the same file (date aside).
- **No git mutation.** Does not stage, commit, push, or otherwise touch the working tree state outside `.repo-context-meta.json`. Calling commands handle staging and committing.
- **No principle-sources audit.** This agent does not validate that principles cite sources. That's a `context-lint` concern (v0.2), not meta-syncer's.

**Invocation points (v0.1).**

- `/context-init`, as the last step before `git add . && git commit`. Replaces the inline JSON literal currently in the command spec.
- `context-onboard-satellite`, after the user has accepted/edited/rejected seeds and the accepted pages are written, before `git add` inside the wiki submodule.

**Output format (for the agent's own response to its caller).** A short JSON-like confirmation:

```
meta-syncer: synced <wiki-root>/.repo-context-meta.json
  topics: <N>, decisions: <M>, principles: <K>, updated: <date>
```

### `/context-init`: `.gitkeep` files

In the existing `commands/context-init.md` spec, between the current `mkdir -p` step and the `.repo-context-meta.json` write:

> **Drop `.gitkeep` placeholders.** Write empty files at `<target>/topics/.gitkeep`, `<target>/decisions/.gitkeep`, `<target>/principles/.gitkeep`, `<target>/raw/.gitkeep`. This ensures the four content directories survive a `git clone` (git does not track empty directories).

Replace the inline JSON-literal step for `.repo-context-meta.json` with:

> **Sync `.repo-context-meta.json`.** Invoke the `meta-syncer` sub-agent with the target directory. It writes the initial file (empty arrays for `topics/decisions/principles`, today's date).

The commit step is unchanged; the `.gitkeep` files and the meta file are staged by the existing `git add .`.

### `repo-scanner`: slug fallback chain

Edit the `Satellite identifier` block of `agents/repo-scanner.md` so the slug derivation explicitly enumerates three steps:

1. **Origin remote** *(unchanged from today)*. Last path component of `git remote get-url origin`, strip trailing `.git`, lowercase, non-alphanumeric → `-`. If origin is configured, this is the answer and the field is **confirmed**.
2. **Manifest name** *(new)*. If no origin remote, check manifests in order and use the first match:
   - `package.json:name` — strip npm scope (`@org/foo` → `foo`)
   - `pyproject.toml:[project].name`, falling back to `[tool.poetry].name` if the former is absent
   - `Cargo.toml:[package].name`
   - `go.mod` first line: `module <path>` — take the last `/`-separated segment
   - Apply the same lowercase + non-alphanumeric → `-` normalization.
3. **Directory basename** *(unchanged as last resort)*. `basename $(pwd)`, same normalization.

When the slug comes from step 2 or 3, the orientation map's `Satellite identifier` section must add a `derived_from:` field and mark the slug `(unconfirmed)`:

```markdown
## Satellite identifier
- **slug**: billing-service (unconfirmed)
- **derived_from**: package.json
- **remote URL**: (none)
```

`context-onboard-satellite` reads `derived_from:`. If present and not equal to `origin`, before proposing any seed pages it prompts the user:

> No origin remote on this satellite. Use slug `billing-service` (derived from `package.json`)? Reply `y` to accept, `n` to abort, or type a different slug to override.

User input wins; a typed override is normalized (lowercase, non-alphanumeric → `-`) and used as the slug for the remainder of the run. If the user replies `n`, onboarding aborts cleanly with no wiki mutation.

## Tests

### New: `meta-syncer` agent test

In `tests/agents.test.ts`, mirror the existing `repo-scanner` test block:

- File exists at `plugins/repo-context/agents/meta-syncer.md`.
- Front-matter has `name: meta-syncer` and a non-empty `description`.
- Body has the six required sections: `Identity`, `Mission`, `Critical rules`, `Output format`, `Workflow process`. (Same checklist `repo-scanner` uses.)
- `Critical rules` section asserts: `Read-only`, `Single writable file`, `Deterministic ordering`, `Idempotent`, `No git mutation`.
- `Output format` section specifies the JSON shape with `{slug, path}` entries.
- No placeholder leftovers (`TBD`, `TODO:`, etc.).

### Updated: `/context-init` test

In `tests/commands.test.ts`, add cases:

- Body references `.gitkeep` four times (once per content dir) OR references all four `<dir>/.gitkeep` paths.
- Body invokes `meta-syncer` (string match) somewhere after the `mkdir -p` step.
- Body no longer contains the inline JSON literal for `.repo-context-meta.json` (the existing test checking `"principles":\s*\[\]` should be removed since the file is now sub-agent-derived, not literal).

### Updated: `repo-scanner` test

In `tests/agents.test.ts`:

- `Critical rules` (or a new `Slug derivation` section, agent-author's call) asserts the three-step fallback chain: `origin`, manifest names listed (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`), `basename`.
- Output format documents the `derived_from:` field as required when slug is not from origin.

### Updated: `context-onboard-satellite` test

In `tests/skills.test.ts`, add a case:

- Skill body contains an instruction to read `derived_from:` from the repo-scanner output and prompt the user when it's not `origin`.
- Skill body documents the abort behavior on `n`.

## Acceptance gate

This band is done when:

1. All vitest tests pass.
2. The v0.1 dogfooding scenario from `README.md` re-runs end-to-end against a fresh `~/playground/llm-wiki-impl-dogfood/v0.1.0/` workspace, producing a wiki where:
   - `.repo-context-meta.json` lists every accepted topic and decision under their respective arrays.
   - Cloning the wiki submodule into the satellite restores all four content directories (`topics/`, `decisions/`, `principles/`, `raw/`).
   - The satellite slug used in topic-page `repos:` front-matter is `billing-service` (after the onboarding prompt-and-confirm flow), not `satellite`.
3. The three original v0.1 acceptance criteria still pass.

After (3), tag `v0.1.0` from `main`.

## Out of scope (reiterated)

- `file://` submodule URL handling (dogfood-setup artifact).
- v0.2 derived graph index, `context-lint`, principle-sources auditing, orphan detection.
- Backporting fixes via rebase — new commits on `main`, tag captures post-fix state.
- Any other gap not surfaced by v0.1 dogfooding on 2026-05-28.
