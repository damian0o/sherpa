# repo-context v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working skeleton of the `repo-context` Claude Code plugin — install path validated end-to-end, `/context-init` scaffolds a context-store, `/context-connect` adds the wiki as a submodule + invokes `context-onboard-satellite`, which proposes seeds via `repo-scanner` only.

**Architecture:** Markdown-only plugin in a multi-plugin marketplace layout. No TypeScript runtime code yet (v0.3+ adds `lib/`). Tests use vitest to lint plugin markdown shapes and validate JSON manifests; the integration test is a documented dogfooding scenario the user runs after install.

**Tech Stack:** Node.js (for tests only), vitest, gray-matter (front-matter parsing), ajv (JSON schema validation), TypeScript-aware vitest. Plugin content is markdown + JSON. No production JS/TS in this band.

**Scope (v0.1):**

- Marketplace catalogue: `.claude-plugin/marketplace.json`.
- Plugin manifest: `plugins/repo-context/.claude-plugin/plugin.json`.
- Commands: `/context-init`, `/context-connect`.
- Skills: `context-onboard-satellite`, `context-query`, `context-satellite`.
- Sub-agents: `repo-scanner` only.
- Templates: `CLAUDE.md`, `index.md`, `log.md`, `topic.md`, `decision.md`, `satellite-CLAUDE.md`.
- Root: contributor `CLAUDE.md`, `AGENTS.md` + `GEMINI.md` symlinks, `README.md`, `LICENSE`, `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`.

**Out of scope (deferred to later bands):**

- v0.2: `context-ingest`, `context-lint`, derived graph in meta JSON, `article-analyzer`, `lint-reporter`, `graph-reviewer`, SessionStart hook.
- v0.3: `context-diff`, `lib/fingerprint.ts`, `lib/ast-extract.ts`, `contracts-analyzer`, PostToolUse hook.
- v0.4: `architecture-analyzer`, `domain-analyzer`.
- v0.5: `context-tour`, `tour-builder`.
- v1.0: `packages/dashboard/`.
- v1.1: `context-present`, Slidev support.

**File structure produced by v0.1:**

```
llm-wiki-impl/
  .claude-plugin/
    marketplace.json
  plugins/
    repo-context/
      .claude-plugin/plugin.json
      commands/
        context-init.md
        context-connect.md
      skills/
        context-onboard-satellite/SKILL.md
        context-query/SKILL.md
        context-satellite/SKILL.md
      agents/
        repo-scanner.md
      templates/
        CLAUDE.md
        index.md
        log.md
        satellite-CLAUDE.md
        topic.md
        decision.md
  tests/
    helpers/
      load-markdown.ts
      schemas.ts
    manifests.test.ts
    commands.test.ts
    skills.test.ts
    agents.test.ts
    templates.test.ts
  docs/superpowers/
    specs/2026-05-27-repo-context-plugin-design.md   (already exists)
    plans/2026-05-27-repo-context-v0.1.md            (this file)
  CLAUDE.md
  AGENTS.md                                          (symlink → CLAUDE.md)
  GEMINI.md                                          (symlink → CLAUDE.md)
  README.md
  LICENSE
  package.json
  tsconfig.json
  vitest.config.ts
  .gitignore
```

**Testing philosophy:**

- *What we test in v0.1:* JSON manifest validity, markdown front-matter shape, required sections present in skills/agents/commands/templates.
- *What we don't test in v0.1:* the *behavior* of slash commands (Claude's interpretation of the markdown isn't unit-testable). That's verified by the manual dogfooding scenario at the end.
- *TDD discipline:* every task writes a failing test first, then creates the artifact, then sees the test pass.

---

## Task 1: Project scaffolding and test runner

**Files:**

- Create: `/Users/damianospara/playground/llm-wiki-impl/package.json`
- Create: `/Users/damianospara/playground/llm-wiki-impl/tsconfig.json`
- Create: `/Users/damianospara/playground/llm-wiki-impl/vitest.config.ts`
- Create: `/Users/damianospara/playground/llm-wiki-impl/.gitignore`
- Create: `/Users/damianospara/playground/llm-wiki-impl/tests/smoke.test.ts`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "repo-context-marketplace",
  "version": "0.1.0",
  "description": "Claude Code marketplace hosting the repo-context plugin",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "ajv": "^8.17.1",
    "ajv-formats": "^3.0.1",
    "gray-matter": "^4.0.3",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["tests/**/*.ts"]
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    globals: true,
  },
});
```

- [ ] **Step 4: Create `.gitignore`**

```
node_modules/
dist/
.DS_Store
*.log
.vitest-cache/
```

- [ ] **Step 5: Create `tests/smoke.test.ts`**

```ts
import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("test runner works", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Install dependencies and run smoke test**

Run:

```bash
npm install
npm test
```

Expected output: vitest reports `1 passed` for `tests/smoke.test.ts`.

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts .gitignore tests/smoke.test.ts
git commit -m "Set up project scaffolding and vitest test runner"
```

---

## Task 2: LICENSE and README

**Files:**

- Create: `/Users/damianospara/playground/llm-wiki-impl/LICENSE`
- Create: `/Users/damianospara/playground/llm-wiki-impl/README.md`

- [ ] **Step 1: Create `LICENSE`** (MIT)

```
MIT License

Copyright (c) 2026 <your name>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

(Replace `<your name>` with the actual author name before committing.)

- [ ] **Step 2: Create `README.md`**

```markdown
# repo-context

A Claude Code plugin that maintains a shared coordination wiki across multiple satellite repositories (frontend, backend, infra, etc.) connected via git submodule.

This repo is a single-plugin Claude Code marketplace. The plugin's full design lives in [`docs/superpowers/specs/2026-05-27-repo-context-plugin-design.md`](docs/superpowers/specs/2026-05-27-repo-context-plugin-design.md).

## Status

**v0.1 (skeletal smoke test):** install path, `/context-init`, `/context-connect`, `context-onboard-satellite` with only the `repo-scanner` analyzer. The wiki content produced is README-shaped, not contract-shaped. v0.2+ deliver the headline cross-cutting context value.

## Install

```bash
/plugin marketplace add <this-repo-url>
/plugin install repo-context@repo-context-marketplace
```

For local development:

```bash
/plugin marketplace add /path/to/this/repo
/plugin install repo-context@repo-context-marketplace
```

## Quick start

1. `/context-init` in an empty directory to scaffold a context-store. Push it to a remote.
2. `/context-connect <store-url>` inside a satellite repo. The plugin adds the wiki as a submodule at `./wiki/` and runs onboarding to propose seed pages.

## Recommended companions

The plugin works standalone, but integrates with these companions when available:

- [`superpowers`](https://github.com/obra/superpowers) — workflow discipline (verification, parallel dispatch, planning).
- [`agency-agents`](https://github.com/msitarzewski/agency-agents) — engineering personas (code review, onboarding, git workflow).
- [`karpathy-guidelines`](https://github.com/multica-ai/andrej-karpathy-skills) — behavioral baseline for LLM coding.

And MCP servers (configured in `~/.claude/settings.json`): Figma, Playwright, GitHub, Slack, Jira / GitHub Projects / Linear.

## Development

```bash
npm install
npm test
```

See [`docs/superpowers/plans/`](docs/superpowers/plans/) for current implementation plans.
```

- [ ] **Step 3: Commit**

```bash
git add LICENSE README.md
git commit -m "Add LICENSE and README"
```

---

## Task 3: Contributor CLAUDE.md and multi-platform aliases

**Files:**

- Create: `/Users/damianospara/playground/llm-wiki-impl/CLAUDE.md`
- Create (symlink): `/Users/damianospara/playground/llm-wiki-impl/AGENTS.md`
- Create (symlink): `/Users/damianospara/playground/llm-wiki-impl/GEMINI.md`
- Create: `/Users/damianospara/playground/llm-wiki-impl/tests/root-files.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/root-files.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { existsSync, lstatSync, readlinkSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

describe("root files", () => {
  it("CLAUDE.md exists and is a regular file", () => {
    const p = resolve(root, "CLAUDE.md");
    expect(existsSync(p)).toBe(true);
    expect(lstatSync(p).isFile()).toBe(true);
  });

  it("CLAUDE.md mentions key contributor sections", () => {
    const content = readFileSync(resolve(root, "CLAUDE.md"), "utf8");
    expect(content).toMatch(/## Philosophy/);
    expect(content).toMatch(/## How this repo is organised/);
    expect(content).toMatch(/## Behavioral baseline/);
  });

  for (const alias of ["AGENTS.md", "GEMINI.md"]) {
    it(`${alias} is a symlink to CLAUDE.md`, () => {
      const p = resolve(root, alias);
      expect(lstatSync(p).isSymbolicLink()).toBe(true);
      expect(readlinkSync(p)).toBe("CLAUDE.md");
    });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- root-files`
Expected: FAIL — files don't exist yet.

- [ ] **Step 3: Create `CLAUDE.md`**

```markdown
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
```

- [ ] **Step 4: Create symlinks `AGENTS.md` and `GEMINI.md`**

Run:

```bash
ln -s CLAUDE.md /Users/damianospara/playground/llm-wiki-impl/AGENTS.md
ln -s CLAUDE.md /Users/damianospara/playground/llm-wiki-impl/GEMINI.md
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- root-files`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md AGENTS.md GEMINI.md tests/root-files.test.ts
git commit -m "Add contributor CLAUDE.md + AGENTS.md/GEMINI.md symlinks"
```

---

## Task 4: JSON schemas and manifest tests

**Files:**

- Create: `/Users/damianospara/playground/llm-wiki-impl/tests/helpers/schemas.ts`
- Create: `/Users/damianospara/playground/llm-wiki-impl/tests/manifests.test.ts`

- [ ] **Step 1: Write the schema helper**

Create `tests/helpers/schemas.ts`:

```ts
import Ajv, { type JSONSchemaType } from "ajv";
import addFormats from "ajv-formats";

export const ajv = addFormats(new Ajv({ allErrors: true, strict: false }));

export interface MarketplaceManifest {
  $schema?: string;
  name: string;
  description: string;
  owner: { name: string; email?: string };
  plugins: Array<{
    name: string;
    description: string;
    version: string;
    source: string;
    category?: string;
  }>;
}

export const marketplaceSchema: JSONSchemaType<MarketplaceManifest> = {
  type: "object",
  properties: {
    $schema: { type: "string", nullable: true },
    name: { type: "string", minLength: 1 },
    description: { type: "string", minLength: 1 },
    owner: {
      type: "object",
      properties: {
        name: { type: "string", minLength: 1 },
        email: { type: "string", format: "email", nullable: true },
      },
      required: ["name"],
    },
    plugins: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1 },
          description: { type: "string", minLength: 1 },
          version: { type: "string", pattern: "^\\d+\\.\\d+\\.\\d+" },
          source: { type: "string", minLength: 1 },
          category: { type: "string", nullable: true },
        },
        required: ["name", "description", "version", "source"],
      },
    },
  },
  required: ["name", "description", "owner", "plugins"],
};

export interface PluginManifest {
  name: string;
  description: string;
  version: string;
  author?: { name: string; email?: string };
  homepage?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
}

export const pluginSchema: JSONSchemaType<PluginManifest> = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 1 },
    description: { type: "string", minLength: 1 },
    version: { type: "string", pattern: "^\\d+\\.\\d+\\.\\d+" },
    author: {
      type: "object",
      nullable: true,
      properties: {
        name: { type: "string", minLength: 1 },
        email: { type: "string", format: "email", nullable: true },
      },
      required: ["name"],
    },
    homepage: { type: "string", nullable: true },
    repository: { type: "string", nullable: true },
    license: { type: "string", nullable: true },
    keywords: { type: "array", items: { type: "string" }, nullable: true },
  },
  required: ["name", "description", "version"],
};
```

- [ ] **Step 2: Write the failing test**

Create `tests/manifests.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { ajv, marketplaceSchema, pluginSchema } from "./helpers/schemas.js";

const root = resolve(import.meta.dirname, "..");

describe("marketplace.json", () => {
  const path = resolve(root, ".claude-plugin/marketplace.json");

  it("exists", () => {
    expect(existsSync(path)).toBe(true);
  });

  it("is valid JSON matching the marketplace schema", () => {
    const json = JSON.parse(readFileSync(path, "utf8"));
    const validate = ajv.compile(marketplaceSchema);
    const valid = validate(json);
    if (!valid) console.error(validate.errors);
    expect(valid).toBe(true);
  });

  it("lists exactly one plugin named repo-context", () => {
    const json = JSON.parse(readFileSync(path, "utf8"));
    expect(json.plugins).toHaveLength(1);
    expect(json.plugins[0].name).toBe("repo-context");
    expect(json.plugins[0].source).toBe("./plugins/repo-context");
  });
});

describe("plugin.json", () => {
  const path = resolve(root, "plugins/repo-context/.claude-plugin/plugin.json");

  it("exists", () => {
    expect(existsSync(path)).toBe(true);
  });

  it("is valid JSON matching the plugin schema", () => {
    const json = JSON.parse(readFileSync(path, "utf8"));
    const validate = ajv.compile(pluginSchema);
    const valid = validate(json);
    if (!valid) console.error(validate.errors);
    expect(valid).toBe(true);
  });

  it("name is repo-context", () => {
    const json = JSON.parse(readFileSync(path, "utf8"));
    expect(json.name).toBe("repo-context");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- manifests`
Expected: FAIL — manifest files don't exist yet.

- [ ] **Step 4: Create `.claude-plugin/marketplace.json`**

```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "repo-context-marketplace",
  "description": "Cross-repo coordination wiki for Claude Code agents",
  "owner": {
    "name": "<user>",
    "email": "<email>"
  },
  "plugins": [
    {
      "name": "repo-context",
      "description": "Shared coordination wiki across multiple satellite repos",
      "version": "0.1.0",
      "source": "./plugins/repo-context",
      "category": "knowledge-management"
    }
  ]
}
```

(Substitute real owner name and email before committing the v0.1.0 release.)

- [ ] **Step 5: Create `plugins/repo-context/.claude-plugin/plugin.json`**

```json
{
  "name": "repo-context",
  "description": "Shared coordination wiki across multiple satellite repos (frontend, backend, infra). Maintained by Claude Code agents, integrated via git submodule.",
  "version": "0.1.0",
  "license": "MIT",
  "keywords": [
    "wiki",
    "coordination",
    "multi-repo",
    "submodule",
    "knowledge-management"
  ]
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- manifests`
Expected: PASS (5 tests).

- [ ] **Step 7: Commit**

```bash
git add .claude-plugin/marketplace.json plugins/repo-context/.claude-plugin/plugin.json tests/helpers/schemas.ts tests/manifests.test.ts
git commit -m "Add marketplace.json + plugin.json with schema validation"
```

---

## Task 5: Markdown lint helpers

**Files:**

- Create: `/Users/damianospara/playground/llm-wiki-impl/tests/helpers/load-markdown.ts`

- [ ] **Step 1: Create the markdown loader helper**

```ts
import { readFileSync } from "node:fs";
import matter from "gray-matter";

export interface ParsedMarkdown {
  frontMatter: Record<string, unknown>;
  body: string;
  raw: string;
}

export function loadMarkdown(path: string): ParsedMarkdown {
  const raw = readFileSync(path, "utf8");
  const parsed = matter(raw);
  return {
    frontMatter: parsed.data,
    body: parsed.content,
    raw,
  };
}

export function hasSections(body: string, headings: string[]): string[] {
  const missing: string[] = [];
  for (const h of headings) {
    const re = new RegExp(`^#+\\s+${h.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\s*$`, "m");
    if (!re.test(body)) missing.push(h);
  }
  return missing;
}

export function noPlaceholders(text: string): string[] {
  const banned = ["TBD", "TODO:", "FIXME", "XXX:", "fill in", "placeholder"];
  const found: string[] = [];
  for (const b of banned) {
    if (text.includes(b)) found.push(b);
  }
  return found;
}
```

- [ ] **Step 2: Quick smoke check on the helper**

(No file to create yet — just verify the import resolves.) Run:

```bash
node --input-type=module -e "import('./tests/helpers/load-markdown.ts').catch(e => { console.error('Import failed:', e); process.exit(1); }); console.log('OK')"
```

Expected: prints `OK` (TS files imported via tsx-aware runner in vitest; if this fails the next test task will surface it).

- [ ] **Step 3: Commit**

```bash
git add tests/helpers/load-markdown.ts
git commit -m "Add markdown lint helpers (load, section-check, placeholder-scan)"
```

---

## Task 6: Templates — wiki schema CLAUDE.md

**Files:**

- Create: `/Users/damianospara/playground/llm-wiki-impl/plugins/repo-context/templates/CLAUDE.md`
- Create: `/Users/damianospara/playground/llm-wiki-impl/tests/templates.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/templates.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadMarkdown, hasSections, noPlaceholders } from "./helpers/load-markdown.js";

const root = resolve(import.meta.dirname, "..");
const templatesDir = resolve(root, "plugins/repo-context/templates");

describe("templates/CLAUDE.md (wiki schema)", () => {
  const path = resolve(templatesDir, "CLAUDE.md");

  it("exists", () => {
    expect(existsSync(path)).toBe(true);
  });

  it("contains the required schema sections", () => {
    const { body } = loadMarkdown(path);
    const missing = hasSections(body, [
      "What this repo is",
      "Layout",
      "Conventions",
      "Workflows",
      "Content categories",
      "Wiki maintenance discipline",
    ]);
    expect(missing).toEqual([]);
  });

  it("has no placeholder leftovers", () => {
    const { raw } = loadMarkdown(path);
    expect(noPlaceholders(raw)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- templates`
Expected: FAIL — file doesn't exist.

- [ ] **Step 3: Create `plugins/repo-context/templates/CLAUDE.md`**

```markdown
# CLAUDE.md — repo-context wiki schema

You are working inside a `repo-context` coordination wiki. This file is the schema doc: it tells agents what this repo is, how it's laid out, what the conventions are, and how to maintain it.

## What this repo is

A shared, LLM-maintained wiki across multiple satellite repositories (e.g. frontend, backend, infrastructure). The wiki carries *cross-cutting* knowledge — decisions, contracts, conventions, active work — that no single satellite repo's README captures on its own. Each satellite includes this wiki as a git submodule at `./wiki/`.

## Layout

- `index.md` — the catalogue. Lists every topic, decision, and source page with a one-line summary. Updated whenever new pages are added.
- `log.md` — append-only chronological record. Entry prefix: `## [YYYY-MM-DD] <kind> | <title>` where `<kind>` is one of `init`, `connect`, `onboard`, `ingest`, `satellite-update`, `lint`, `query`.
- `topics/` — cross-cutting topic pages. One page per concern (e.g. `api-contract.md`, `auth.md`, `deployment.md`).
- `decisions/` — accepted architectural / process decisions (ADRs). One page per decision.
- `raw/` — verbatim or near-verbatim source ingests (article summaries, meeting notes, etc.).
- `.repo-context-meta.json` — generated marker file plus derived graph index. Never edit by hand.

## Conventions

- **Front-matter (YAML)** on every topic and decision page. Required: `updated:` (YYYY-MM-DD), `status:`, `repos:` (array of satellite slugs).
- **Cross-references** use `[[wikilink]]` syntax matching the target file's basename without extension.
- **Log entry prefix** as above: `## [YYYY-MM-DD] <kind> | <title>`. Consistent prefix lets `grep "^## \[" log.md | tail` show recent activity.

## Workflows

- **Ingesting a source:** read the source → write a summary in `raw/` → update or create relevant topic pages with new claims and cross-references → flag contradictions inline → append a log entry → update `index.md`.
- **Querying:** read `index.md` first → drill into relevant pages → answer with `[[link]]` citations → optionally file the answer back as a new topic or decision page.
- **Linting (health check):** look for contradictions, stale claims, orphan pages, missing cross-references, decisions whose referenced topic no longer reflects them.

## Content categories

- **Topics** (`topics/`): living documents about cross-cutting concerns. A topic page can be `status: active` (in flight), `status: stable` (settled), or `status: stale` (likely outdated). Active work is a `status:` field, not a separate file.
- **Decisions** (`decisions/`): point-in-time accepted choices. ADR-style. `status: proposed | accepted | superseded`.
- **Sources** (`raw/`): verbatim or near-verbatim ingested material. The source of truth for what was claimed where.

## Wiki maintenance discipline

These five rules are not optional. They are how the wiki stays trustworthy as it grows.

- **Surgical page edits.** When updating an existing topic or decision page, change only what's needed. Don't restructure adjacent sections. Match the page's existing voice.
- **Minimum content.** No placeholder padding. If a topic page section would be empty, leave it empty until there's real material to put in it. A wiki page that says less honestly is more useful than one that pads with speculation.
- **State assumptions when ingesting.** When extracting from a source, name the assumed audience and intent at the top of the resulting `raw/<slug>.md` summary. Don't bury interpretive choices.
- **Every proposed change cites its source.** A new claim on a topic page references either a specific `raw/` summary line or a specific code symbol from a satellite (with `repo:path:symbol`). No uncited additions.
- **Push back on ambiguity.** If a proposed wiki update would assert something the source doesn't actually say, stop. Surface the gap to the user rather than writing the more confident version.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- templates`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add plugins/repo-context/templates/CLAUDE.md tests/templates.test.ts
git commit -m "Add wiki schema template (templates/CLAUDE.md)"
```

---

## Task 7: Templates — index.md, log.md, topic.md, decision.md, satellite-CLAUDE.md

**Files:**

- Create: `/Users/damianospara/playground/llm-wiki-impl/plugins/repo-context/templates/index.md`
- Create: `/Users/damianospara/playground/llm-wiki-impl/plugins/repo-context/templates/log.md`
- Create: `/Users/damianospara/playground/llm-wiki-impl/plugins/repo-context/templates/topic.md`
- Create: `/Users/damianospara/playground/llm-wiki-impl/plugins/repo-context/templates/decision.md`
- Create: `/Users/damianospara/playground/llm-wiki-impl/plugins/repo-context/templates/satellite-CLAUDE.md`
- Modify: `/Users/damianospara/playground/llm-wiki-impl/tests/templates.test.ts` — extend with checks for the new templates.

- [ ] **Step 1: Extend the failing test**

Append to `tests/templates.test.ts`:

```ts
describe("templates/index.md", () => {
  const path = resolve(templatesDir, "index.md");
  it("exists", () => expect(existsSync(path)).toBe(true));
  it("has Topics, Decisions, Sources headings", () => {
    const { body } = loadMarkdown(path);
    expect(hasSections(body, ["Topics", "Decisions", "Sources"])).toEqual([]);
  });
});

describe("templates/log.md", () => {
  const path = resolve(templatesDir, "log.md");
  it("exists", () => expect(existsSync(path)).toBe(true));
  it("seeds with an init entry placeholder", () => {
    const { raw } = loadMarkdown(path);
    expect(raw).toMatch(/^# Log/m);
    expect(raw).toMatch(/^## \[\{\{date\}\}\] init \|/m);
  });
});

describe("templates/topic.md", () => {
  const path = resolve(templatesDir, "topic.md");
  it("exists", () => expect(existsSync(path)).toBe(true));
  it("has YAML front-matter with required fields", () => {
    const { frontMatter } = loadMarkdown(path);
    expect(frontMatter).toHaveProperty("updated");
    expect(frontMatter).toHaveProperty("status");
    expect(frontMatter).toHaveProperty("repos");
  });
  it("has the standard topic sections", () => {
    const { body } = loadMarkdown(path);
    expect(hasSections(body, ["Summary", "Current state", "Decisions referenced", "Open questions", "Sources"])).toEqual([]);
  });
});

describe("templates/decision.md", () => {
  const path = resolve(templatesDir, "decision.md");
  it("exists", () => expect(existsSync(path)).toBe(true));
  it("has YAML front-matter with required fields", () => {
    const { frontMatter } = loadMarkdown(path);
    expect(frontMatter).toHaveProperty("date");
    expect(frontMatter).toHaveProperty("status");
  });
  it("has Context / Decision / Consequences sections", () => {
    const { body } = loadMarkdown(path);
    expect(hasSections(body, ["Context", "Decision", "Consequences"])).toEqual([]);
  });
});

describe("templates/satellite-CLAUDE.md", () => {
  const path = resolve(templatesDir, "satellite-CLAUDE.md");
  it("exists", () => expect(existsSync(path)).toBe(true));
  it("is wrapped in BEGIN/END markers for idempotent stitching", () => {
    const { raw } = loadMarkdown(path);
    expect(raw).toMatch(/<!-- BEGIN repo-context -->/);
    expect(raw).toMatch(/<!-- END repo-context -->/);
  });
});
```

- [ ] **Step 2: Run test to verify the new cases fail**

Run: `npm test -- templates`
Expected: previous 3 still pass, new 11 fail because files don't exist.

- [ ] **Step 3: Create `templates/index.md`**

```markdown
# Index

## Topics

(none yet)

## Decisions

(none yet)

## Sources

(none yet)
```

- [ ] **Step 4: Create `templates/log.md`**

```markdown
# Log

## [{{date}}] init | context store created
```

(`{{date}}` is substituted to today's ISO date by `/context-init`.)

- [ ] **Step 5: Create `templates/topic.md`**

```markdown
---
updated: {{date}}
status: active
repos: []
---
# {{title}}

## Summary

## Current state

## Decisions referenced

## Open questions

## Sources
```

- [ ] **Step 6: Create `templates/decision.md`**

```markdown
---
date: {{date}}
status: proposed
---
# {{title}}

## Context

## Decision

## Consequences
```

- [ ] **Step 7: Create `templates/satellite-CLAUDE.md`**

```markdown
<!-- BEGIN repo-context -->
## Shared context (repo-context wiki)

This repo is part of a coordination group. A shared wiki lives at `./wiki/` (git submodule).

- Read `./wiki/CLAUDE.md` first for conventions.
- Before significant cross-cutting work, scan `./wiki/index.md` and topic pages whose `repos:` front-matter includes this satellite.
- When you make a cross-repo decision or change a contract that affects other satellites, update the wiki (`./wiki/topics/` or `./wiki/decisions/`) and append an entry to `./wiki/log.md`.
- After commits that touch routes, schema, env vars, or container config, consider running `/context-diff` to propose wiki updates.

The `repo-context` plugin's skills (`context-satellite`, `context-diff`, `context-tour`) activate automatically while you work in this repo.
<!-- END repo-context -->
```

- [ ] **Step 8: Run test to verify everything passes**

Run: `npm test -- templates`
Expected: PASS (14 tests).

- [ ] **Step 9: Commit**

```bash
git add plugins/repo-context/templates/ tests/templates.test.ts
git commit -m "Add wiki templates (index, log, topic, decision, satellite fragment)"
```

---

## Task 8: `/context-init` command

**Files:**

- Create: `/Users/damianospara/playground/llm-wiki-impl/plugins/repo-context/commands/context-init.md`
- Create: `/Users/damianospara/playground/llm-wiki-impl/tests/commands.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/commands.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadMarkdown, hasSections, noPlaceholders } from "./helpers/load-markdown.js";

const root = resolve(import.meta.dirname, "..");
const commandsDir = resolve(root, "plugins/repo-context/commands");

describe("commands/context-init.md", () => {
  const path = resolve(commandsDir, "context-init.md");

  it("exists", () => {
    expect(existsSync(path)).toBe(true);
  });

  it("front-matter has name, description, and argument-hint", () => {
    const { frontMatter } = loadMarkdown(path);
    expect(frontMatter.name).toBe("context-init");
    expect(typeof frontMatter.description).toBe("string");
    expect((frontMatter.description as string).length).toBeGreaterThan(20);
  });

  it("body has Steps and Idempotency sections", () => {
    const { body } = loadMarkdown(path);
    expect(hasSections(body, ["Steps", "Idempotency", "Preconditions"])).toEqual([]);
  });

  it("body references the required template files", () => {
    const { body } = loadMarkdown(path);
    for (const t of ["CLAUDE.md", "index.md", "log.md"]) {
      expect(body).toContain(`templates/${t}`);
    }
  });

  it("body specifies writing the marker .repo-context-meta.json", () => {
    const { body } = loadMarkdown(path);
    expect(body).toContain(".repo-context-meta.json");
  });

  it("has no placeholder leftovers", () => {
    const { raw } = loadMarkdown(path);
    expect(noPlaceholders(raw)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- commands`
Expected: FAIL — file doesn't exist.

- [ ] **Step 3: Create `plugins/repo-context/commands/context-init.md`**

````markdown
---
name: context-init
description: Scaffold a new repo-context coordination wiki (the "context store") in the current directory. Use when the user wants to bootstrap a wiki that satellite repos will reference via git submodule.
argument-hint: "[target-directory]"
---

# /context-init

Scaffold a new `repo-context` coordination-wiki repository (the "context store") at the user's target directory.

## Preconditions

1. The target directory is either empty or only contains a `.git/` directory. If non-empty in any other way, STOP and surface the situation to the user — do not overwrite.
2. The user has `git` available in the shell.

If the user provided an argument, use that as the target directory. Otherwise, target the current working directory. Confirm with the user before writing if the target is ambiguous.

## Steps

Execute these steps in order. Each step that performs a filesystem or git mutation must use the Bash tool.

1. **Confirm target is acceptable.** Run `ls -A <target>`. If it returns anything other than `.git` (or nothing), STOP. Show the user what's there and ask what to do.
2. **Initialise git if needed.** If `<target>/.git` doesn't exist, run `git init <target>`.
3. **Copy templates.** From the plugin's `templates/` directory, copy the following files into `<target>`:
   - `templates/CLAUDE.md` → `<target>/CLAUDE.md`
   - `templates/index.md` → `<target>/index.md`
4. **Render `log.md` with today's date.** Read `templates/log.md`, replace `{{date}}` with today's ISO date (YYYY-MM-DD), and write the result to `<target>/log.md`.
5. **Create directories.** `mkdir -p <target>/topics <target>/decisions <target>/raw`.
6. **Write the marker file.** Create `<target>/.repo-context-meta.json` with this exact content (substitute `<date>` to today's ISO date):

   ```json
   {
     "kind": "repo-context-store",
     "schema_version": 1,
     "topics": [],
     "decisions": [],
     "updated": "<date>"
   }
   ```

7. **Initial commit.** Run `git -C <target> add . && git -C <target> commit -m "Initialise repo-context store"`.
8. **Prompt the user to push.** Tell the user:
   - The store has been initialised.
   - To use it from satellite repos, push it to a remote and copy the remote URL.
   - The next step from any satellite repo is `/context-connect <remote-url>`.

## Idempotency

`/context-init` is **not** idempotent: re-running it in a non-empty target intentionally refuses to proceed (step 1). To re-initialise, the user must clear or move the existing content first.

## Behavioral baseline

Follow the four operational principles from this plugin's contributor `CLAUDE.md` — think before acting (confirm the target), simplicity first (don't add content not in templates), surgical changes (only touch the target directory), goal-driven (verify each file landed before claiming success).
````

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- commands`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add plugins/repo-context/commands/context-init.md tests/commands.test.ts
git commit -m "Add /context-init command"
```

---

## Task 9: `/context-connect` command

**Files:**

- Create: `/Users/damianospara/playground/llm-wiki-impl/plugins/repo-context/commands/context-connect.md`
- Modify: `/Users/damianospara/playground/llm-wiki-impl/tests/commands.test.ts` — add tests for context-connect.

- [ ] **Step 1: Extend the failing test**

Append to `tests/commands.test.ts`:

```ts
describe("commands/context-connect.md", () => {
  const path = resolve(commandsDir, "context-connect.md");

  it("exists", () => {
    expect(existsSync(path)).toBe(true);
  });

  it("front-matter has name and description", () => {
    const { frontMatter } = loadMarkdown(path);
    expect(frontMatter.name).toBe("context-connect");
    expect(typeof frontMatter.description).toBe("string");
  });

  it("body has Steps, Preconditions, Idempotency sections", () => {
    const { body } = loadMarkdown(path);
    expect(hasSections(body, ["Steps", "Preconditions", "Idempotency"])).toEqual([]);
  });

  it("body specifies git submodule add", () => {
    const { body } = loadMarkdown(path);
    expect(body).toContain("git submodule add");
  });

  it("body invokes the context-onboard-satellite skill", () => {
    const { body } = loadMarkdown(path);
    expect(body).toMatch(/context-onboard-satellite/);
  });

  it("body specifies stitching satellite-CLAUDE.md between markers", () => {
    const { body } = loadMarkdown(path);
    expect(body).toContain("<!-- BEGIN repo-context -->");
    expect(body).toContain("<!-- END repo-context -->");
  });

  it("has no placeholder leftovers", () => {
    const { raw } = loadMarkdown(path);
    expect(noPlaceholders(raw)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- commands`
Expected: previous 6 pass, new 7 fail.

- [ ] **Step 3: Create `plugins/repo-context/commands/context-connect.md`**

````markdown
---
name: context-connect
description: Connect the current satellite repo to a repo-context wiki by adding it as a git submodule at ./wiki/. Then invoke context-onboard-satellite to propose seed pages. Use when the user wants their satellite repo (frontend, backend, infra) to participate in the shared wiki.
argument-hint: "<wiki-remote-url>"
---

# /context-connect

Connect the current satellite repository to an existing `repo-context` wiki. After this command, the wiki lives as a git submodule at `./wiki/` and the plugin's satellite-side skills activate automatically.

## Preconditions

1. Current working directory is the root of a git repository (`git rev-parse --show-toplevel` succeeds and equals `pwd`).
2. There is no existing `wiki/` directory or submodule. Re-runs require the user to remove the existing one first.
3. `<wiki-remote-url>` was provided. If not, ask the user.

## Steps

1. **Verify preconditions.** Run `git rev-parse --show-toplevel` and confirm it matches `pwd`. If `wiki` already exists as a path or submodule, STOP and tell the user.
2. **Add the submodule.** Run `git submodule add <wiki-remote-url> wiki`.
3. **Init recursive (defensive).** Run `git submodule update --init --recursive`.
4. **Verify the wiki marker.** Confirm `wiki/.repo-context-meta.json` exists and parses as JSON with `"kind": "repo-context-store"`. If not, STOP — the URL didn't point to a valid context-store.
5. **Stitch the satellite fragment into CLAUDE.md.** If the satellite has no `CLAUDE.md`, create it with just the fragment. If it does, append (or replace if already present) the section between the markers:

   ```
   <!-- BEGIN repo-context -->
   ...content from plugins/repo-context/templates/satellite-CLAUDE.md...
   <!-- END repo-context -->
   ```

   Idempotency: if the markers already exist, replace the section between them; do not duplicate.
6. **Invoke `context-onboard-satellite` skill.** This is the skill that reads the satellite's structure and proposes wiki seed pages. Pass control to it now.
7. **Append a log entry to the wiki.** After `context-onboard-satellite` returns, append a line to `wiki/log.md`:

   ```
   ## [<date>] connect | <satellite-slug>
   ```

   Where `<satellite-slug>` is the slug from `repo-scanner`'s output and `<date>` is today's ISO date. Stage but do not push.
8. **Commit the satellite repo.** Stage `wiki/`, `.gitmodules`, and the updated `CLAUDE.md`. Commit with message `Add repo-context wiki submodule`. Do not push.

## Idempotency

`/context-connect` refuses to run if `wiki/` already exists. To re-connect (e.g. to a different store), the user must `git submodule deinit wiki && git rm wiki && rm -rf .git/modules/wiki` first.

## Behavioral baseline

Same four principles from the contributor `CLAUDE.md`. In particular: do not push commits; the user reviews and pushes.
````

- [ ] **Step 4: Run test to verify everything passes**

Run: `npm test -- commands`
Expected: PASS (13 tests total in commands).

- [ ] **Step 5: Commit**

```bash
git add plugins/repo-context/commands/context-connect.md tests/commands.test.ts
git commit -m "Add /context-connect command"
```

---

## Task 10: `repo-scanner` sub-agent

**Files:**

- Create: `/Users/damianospara/playground/llm-wiki-impl/plugins/repo-context/agents/repo-scanner.md`
- Create: `/Users/damianospara/playground/llm-wiki-impl/tests/agents.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/agents.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadMarkdown, hasSections, noPlaceholders } from "./helpers/load-markdown.js";

const root = resolve(import.meta.dirname, "..");
const agentsDir = resolve(root, "plugins/repo-context/agents");

describe("agents/repo-scanner.md", () => {
  const path = resolve(agentsDir, "repo-scanner.md");

  it("exists", () => {
    expect(existsSync(path)).toBe(true);
  });

  it("front-matter has name and description", () => {
    const { frontMatter } = loadMarkdown(path);
    expect(frontMatter.name).toBe("repo-scanner");
    expect(typeof frontMatter.description).toBe("string");
  });

  it("has the six required agent sections", () => {
    const { body } = loadMarkdown(path);
    expect(hasSections(body, [
      "Identity",
      "Mission",
      "Critical rules",
      "Output format",
      "Workflow process",
    ])).toEqual([]);
  });

  it("Critical rules section enforces facts-only and read-only", () => {
    const { body } = loadMarkdown(path);
    expect(body).toMatch(/Facts only/);
    expect(body).toMatch(/Read-only/);
    expect(body).toMatch(/Quote exactly/);
    expect(body).toMatch(/Mark unknowns/);
  });

  it("Output format includes Satellite identifier with slug + remote URL", () => {
    const { body } = loadMarkdown(path);
    expect(body).toMatch(/Satellite identifier/);
    expect(body).toMatch(/slug/);
    expect(body).toMatch(/remote URL/);
  });

  it("Output format includes Repo Orientation Map standard sections", () => {
    const { body } = loadMarkdown(path);
    for (const s of ["1-line summary", "5-minute explanation", "Top-level structure", "Cross-cutting surface", "Files inspected", "Files NOT inspected"]) {
      expect(body).toContain(s);
    }
  });

  it("has no placeholder leftovers", () => {
    const { raw } = loadMarkdown(path);
    expect(noPlaceholders(raw)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- agents`
Expected: FAIL — file doesn't exist.

- [ ] **Step 3: Create `plugins/repo-context/agents/repo-scanner.md`**

````markdown
---
name: repo-scanner
description: Use when the dispatching skill (typically context-onboard-satellite) needs a deterministic, read-only inventory of a satellite repository — manifests, README, recent commits, top-level structure — producing a structured "Repo Orientation Map".
---

# repo-scanner

## Identity

You are `repo-scanner`, a methodical, evidence-first sub-agent. You read source files, manifests, and recent git history. You produce a structured inventory of a single repository — never an opinion about it. You quote what you observe. You mark what you didn't inspect. You never modify anything.

## Mission

Produce a **Repo Orientation Map** that the dispatching skill can use to seed a coordination wiki. Specifically:

- Identify the satellite's slug (a stable identifier used in wiki `repos:` front-matter) and remote URL.
- Summarise the repo's purpose, runtime, inputs, outputs, and entry points.
- Inventory the top-level structure and the cross-cutting surface (routes, schemas, env vars, deployment files).
- Enumerate which files were inspected and which were not.

## Critical rules

- **Facts only.** State only what was directly observed in the source you inspected. No inference, no speculation, no "this probably means" guesses.
- **Quote exactly.** Route paths, function names, env var names, file paths — verbatim from source.
- **Mark unknowns.** If something is not visible in the inspected source, write "not inspected" or "not present in `<file>`" — never "appears to be X".
- **Read-only.** Never modify files, never run network calls, never change repository state. You may read files and run `git log`, `git remote`, `git ls-files`.
- **Scope control.** Do not produce recommendations, refactoring suggestions, or design opinions. The dispatching skill turns your facts into proposals; you only supply facts.

## Output format

Return exactly this markdown structure. The dispatching skill parses it, so structure is a contract — do not deviate.

```markdown
# Repo Orientation Map

## Satellite identifier
- **slug**: <kebab-case identifier — derive from `git remote get-url origin` (`<org>/<repo>` → `<repo>`) when remote is present; otherwise the working directory basename>
- **remote URL**: <output of `git remote get-url origin`, or `(none)` if no origin remote configured>

## 1-line summary
<One sentence stating what this codebase is, grounded in README/manifests.>

## 5-minute explanation
- **Type**: <web app | API | monorepo | CLI | library | hybrid | other>
- **Runtime**: <e.g. Node.js 22, Python 3.12, Go 1.23>
- **Primary inputs**: <e.g. HTTP requests on PORT, CLI args, queue messages>
- **Primary outputs**: <e.g. HTTP responses, DB writes, files>
- **Entry points**:
  - `<path/to/main>`: <why it matters>
  - `<path/to/router-or-config>`: <why it matters>

## Top-level structure
| Path | Purpose | Notes |
|------|---------|-------|
| `src/` | <if present, the role> | <observations> |
<one row per top-level directory you inspected>

## Cross-cutting surface
- **API routes**: <path → handler file, verbatim, or "not present">
- **GraphQL/RPC contracts**: <file → schema name, or "not present">
- **Env vars referenced**: <name → file:line, or "not present">
- **Container/deployment files**: <paths, or "not present">
- **Schema/migration files**: <paths, or "not present">

## Files inspected
<exhaustive list of files you opened and read>

## Files NOT inspected
<everything else under top-level dirs you saw but didn't open, listed by name or glob>
```

## Workflow process

1. Determine the satellite slug and remote URL: run `git remote get-url origin 2>/dev/null` and `pwd` to derive the slug.
2. Read `README.md` if present (read once, fully).
3. Read manifest files that exist: `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `Gemfile`, `composer.json`, `pom.xml`, `build.gradle`. Note runtime / type.
4. Read any top-level `CLAUDE.md` (without the `wiki/` submodule's CLAUDE.md — that's not this satellite's).
5. Read deployment / container files that exist: `Dockerfile`, `compose.yml`, `compose.yaml`, `docker-compose.yml`, `.env.example`, `fly.toml`, `railway.toml`.
6. Run `git log --oneline -30` to skim recent activity. Note the kinds of changes happening, not specifics.
7. List top-level directories. For each, open one or two representative files only if it helps classify the directory's role (don't deep-dive — that's other analyzers' job).
8. Inventory the cross-cutting surface from what you've already read. Do not search exhaustively; surface only what you observed.
9. Fill in the Output Format. For every field where you didn't observe evidence, write "not inspected" or "not present in `<the files you read>`".

You are done when the Repo Orientation Map is complete and every field is either observed-and-cited or honestly marked as unknown.
````

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- agents`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add plugins/repo-context/agents/repo-scanner.md tests/agents.test.ts
git commit -m "Add repo-scanner sub-agent"
```

---

## Task 11: `context-onboard-satellite` skill

**Files:**

- Create: `/Users/damianospara/playground/llm-wiki-impl/plugins/repo-context/skills/context-onboard-satellite/SKILL.md`
- Create: `/Users/damianospara/playground/llm-wiki-impl/tests/skills.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/skills.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadMarkdown, hasSections, noPlaceholders } from "./helpers/load-markdown.js";

const root = resolve(import.meta.dirname, "..");
const skillsDir = resolve(root, "plugins/repo-context/skills");

describe("skills/context-onboard-satellite/SKILL.md", () => {
  const path = resolve(skillsDir, "context-onboard-satellite/SKILL.md");

  it("exists", () => {
    expect(existsSync(path)).toBe(true);
  });

  it("front-matter has name and description that starts with 'Use when'", () => {
    const { frontMatter } = loadMarkdown(path);
    expect(frontMatter.name).toBe("context-onboard-satellite");
    expect((frontMatter.description as string).startsWith("Use when")).toBe(true);
  });

  it("body has Trigger, Procedure, and Output sections", () => {
    const { body } = loadMarkdown(path);
    expect(hasSections(body, ["Trigger", "Procedure", "Output"])).toEqual([]);
  });

  it("body dispatches the repo-scanner agent", () => {
    const { body } = loadMarkdown(path);
    expect(body).toMatch(/repo-scanner/);
  });

  it("body writes the `repos:` front-matter field after user approval", () => {
    const { body } = loadMarkdown(path);
    expect(body).toMatch(/repos:/);
    expect(body).toMatch(/user approval|user accepts|user reviews/i);
  });

  it("body notes v0.1 limitation: only repo-scanner, no AST analyzers yet", () => {
    const { body } = loadMarkdown(path);
    expect(body).toMatch(/v0\.1/);
  });

  it("has no placeholder leftovers", () => {
    const { raw } = loadMarkdown(path);
    expect(noPlaceholders(raw)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- skills`
Expected: FAIL.

- [ ] **Step 3: Create `plugins/repo-context/skills/context-onboard-satellite/SKILL.md`**

````markdown
---
name: context-onboard-satellite
description: Use when /context-connect has just attached the wiki submodule to a satellite repo and the wiki needs to be seeded with what already exists in that satellite. Also use when the user explicitly asks to re-onboard a connected satellite.
---

# context-onboard-satellite

Onboard a satellite repository into a connected `repo-context` wiki. The skill scans the satellite (currently with the `repo-scanner` sub-agent only — richer analyzers arrive in v0.4), proposes seed pages, and after user approval writes them into the wiki submodule.

## Trigger

- Invoked by `/context-connect` as its second-to-last step.
- Invoked explicitly by the user with phrasings like "re-onboard this satellite into the wiki", "scan this repo and seed the wiki", or similar.
- Activate only when the current working directory is the root of a git repository AND `wiki/.repo-context-meta.json` exists (i.e. the submodule is connected and points at a valid context-store).

## Procedure

1. **Dispatch `repo-scanner`.** Use the Task tool with `subagent_type: "repo-scanner"`. Pass the current working directory as context. Wait for the Repo Orientation Map output.
2. **Extract the satellite slug.** From `repo-scanner`'s "Satellite identifier" section, read `slug`. This is the value you will put into `repos:` front-matter on every seed page.
3. **Read the existing wiki state.** Open `wiki/index.md`. List the existing topic and decision pages. For each existing topic page, read its front-matter and note its `repos:` array. This is what you reconcile against to avoid duplicating earlier-satellite content.
4. **Draft seed proposals.** Based on the Repo Orientation Map's "5-minute explanation" and "Cross-cutting surface", draft a small set of seed pages (typically 1–5 in v0.1; more analyzers arrive in v0.4). For each draft, decide:
   - **+ new topic** `wiki/topics/<slug>.md` — when the concern isn't already covered. `repos: [<satellite-slug>]`.
   - **extend existing topic** `wiki/topics/<existing-slug>.md` — when there's an existing page on the same concern from another satellite. Add `<satellite-slug>` to its `repos:` array; add a section to its body if appropriate.
   - **+ new decision** `wiki/decisions/<slug>.md` — only if the satellite's manifests or README clearly state an architectural decision (e.g. "we use Postgres", "we chose REST not GraphQL"). Be conservative.
5. **Present the proposals to the user as bullets.** Example:

   ```
   Proposed wiki seeds from <slug>:
   + new topics/runtime.md (Node.js 22 LTS, package.json:engines)
   + extend topics/api-contract.md (add <slug> to repos:; document GET /health endpoint)
   + new decisions/0001-use-fastify.md (chose Fastify over Express, per README L42)
   ```

   The user can accept all, accept some, edit individual items, or reject.

6. **Write accepted seeds in a single commit inside the wiki submodule.**
   - `cd wiki && git status --porcelain` — confirm clean.
   - Determine the wiki's default branch via `git -C wiki remote show origin | awk '/HEAD branch/ {print $NF}'`.
   - `git -C wiki checkout <default-branch>`.
   - For each accepted seed:
     - If "+ new": render the topic or decision template with `{{date}}` (today's ISO date) and `{{title}}` substituted; write the file under `wiki/topics/` or `wiki/decisions/`.
     - If "extend": surgical edit per the *Wiki maintenance discipline* in `wiki/CLAUDE.md` — only touch what's needed. Add `<satellite-slug>` to `repos:` array if not present. Add new sections only if proposed.
   - Update `wiki/index.md`: add a line per new page under the appropriate section (Topics, Decisions, or Sources).
   - Append to `wiki/log.md`: `## [<date>] onboard | <satellite-slug>` followed by 2–4 bullet lines naming the seeds you wrote.
   - `git -C wiki add . && git -C wiki commit -m "Onboard <satellite-slug>: <N> seeds"`.
7. **Return to the satellite repo.** The caller (`/context-connect`) handles the submodule pointer bump and the satellite-side commit.

## Output

A short status summary to the user:
- Satellite slug used.
- Number of seeds proposed, accepted, written.
- Commit SHA inside the wiki submodule (so the user can verify).
- Reminder: the wiki submodule commit is staged locally; the user must push the wiki repo to share it.

## Behavioral baseline

Follow the four principles in `plugins/repo-context/.claude-plugin/../../CLAUDE.md` (think before acting, simplicity first, surgical changes, goal-driven verifiable). Apply the *Wiki maintenance discipline* from `wiki/CLAUDE.md` to every page write.

## v0.1 limitation

In v0.1 only the `repo-scanner` sub-agent runs. That means seeds are based on manifests, README, and recent commits — not on AST-extracted API contracts or architectural pattern detection. The resulting wiki content is README-shaped, not contract-shaped. v0.3 adds `contracts-analyzer` (AST), v0.4 adds `architecture-analyzer` and `domain-analyzer`. Set user expectations accordingly: v0.1 onboarding is a starting point, not a finished wiki.
````

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- skills`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add plugins/repo-context/skills/context-onboard-satellite/SKILL.md tests/skills.test.ts
git commit -m "Add context-onboard-satellite skill (v0.1: repo-scanner only)"
```

---

## Task 12: `context-query` skill

**Files:**

- Create: `/Users/damianospara/playground/llm-wiki-impl/plugins/repo-context/skills/context-query/SKILL.md`
- Modify: `/Users/damianospara/playground/llm-wiki-impl/tests/skills.test.ts` — add tests for context-query.

- [ ] **Step 1: Extend the failing test**

Append to `tests/skills.test.ts`:

```ts
describe("skills/context-query/SKILL.md", () => {
  const path = resolve(skillsDir, "context-query/SKILL.md");

  it("exists", () => {
    expect(existsSync(path)).toBe(true);
  });

  it("front-matter description starts with 'Use when'", () => {
    const { frontMatter } = loadMarkdown(path);
    expect(frontMatter.name).toBe("context-query");
    expect((frontMatter.description as string).startsWith("Use when")).toBe(true);
  });

  it("body has Trigger, Procedure sections", () => {
    const { body } = loadMarkdown(path);
    expect(hasSections(body, ["Trigger", "Procedure"])).toEqual([]);
  });

  it("body mentions reading index.md first", () => {
    const { body } = loadMarkdown(path);
    expect(body).toMatch(/index\.md/);
  });

  it("body uses [[wikilink]] citation convention", () => {
    const { body } = loadMarkdown(path);
    expect(body).toMatch(/\[\[/);
  });

  it("has no placeholder leftovers", () => {
    const { raw } = loadMarkdown(path);
    expect(noPlaceholders(raw)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- skills`
Expected: previous 7 pass, new 6 fail.

- [ ] **Step 3: Create `plugins/repo-context/skills/context-query/SKILL.md`**

````markdown
---
name: context-query
description: Use when the user asks a question and the working directory is a repo-context store (has `.repo-context-meta.json` at the root) or a satellite (has `wiki/.repo-context-meta.json`). Reads the wiki to answer with cited links.
---

# context-query

Answer a user question by reading the connected coordination wiki and citing the pages used.

## Trigger

Activate when both:

1. The user is asking a question (typed query, not a command), AND
2. Detection finds either `./.repo-context-meta.json` (working inside a context-store) OR `./wiki/.repo-context-meta.json` (working inside a satellite). For satellites, all wiki paths below are prefixed with `wiki/`.

If multiple parent directories have the marker, prefer the closest one. Resolve git worktrees to their real repo root before checking.

Do not activate for commands (`/context-init`, `/context-connect`, etc.) — those have their own handlers.

## Procedure

1. **Read `index.md` first.** This is the catalogue; it lists every page with a one-line summary. Use it to identify which pages are likely relevant to the question.
2. **Drill into pages.** For each candidate page from the index, read it. Follow `[[wikilink]]` references when they're clearly relevant; do not read every linked page transitively.
3. **Synthesise the answer.** Compose a response in prose. Every claim that comes from a specific wiki page must cite the page using `[[page-slug]]` syntax. If the wiki doesn't cover the question, say so explicitly: "The wiki doesn't have a page on this; closest related pages are [[x]] and [[y]]."
4. **Offer to file the answer back.** After answering, if the answer represents reusable knowledge (a comparison, a synthesis, a connection the wiki doesn't yet make), ask the user: *"This answer might be worth filing as a new topic page or decision. Want me to draft one?"* If the user agrees, propose the page (slug, location, content) and write it after their approval, following the *Wiki maintenance discipline* in the wiki's `CLAUDE.md`.

## Citation discipline

- Every factual claim cites a wiki page via `[[slug]]`.
- If the answer combines information from multiple pages, cite each at the relevant claim.
- If the answer extrapolates beyond what any wiki page says, mark that part as your synthesis, not the wiki's claim: "Based on [[a]] and [[b]], it seems that..."

## Behavioral baseline

Follow the four operational principles from this plugin's contributor `CLAUDE.md`. In particular: push back on ambiguity. If the question is vague enough that the answer would require guessing, ask a clarifying question first.

## v0.1 limitation

No semantic search. Retrieval is index-driven — `index.md` plus directed reads. At small/medium wiki sizes this is sufficient. Larger wikis (post v1.0) may want an embedding layer; that's not in scope for v0.1.
````

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- skills`
Expected: PASS (13 tests in skills file).

- [ ] **Step 5: Commit**

```bash
git add plugins/repo-context/skills/context-query/SKILL.md tests/skills.test.ts
git commit -m "Add context-query skill"
```

---

## Task 13: `context-satellite` skill

**Files:**

- Create: `/Users/damianospara/playground/llm-wiki-impl/plugins/repo-context/skills/context-satellite/SKILL.md`
- Modify: `/Users/damianospara/playground/llm-wiki-impl/tests/skills.test.ts` — add tests for context-satellite.

- [ ] **Step 1: Extend the failing test**

Append to `tests/skills.test.ts`:

```ts
describe("skills/context-satellite/SKILL.md", () => {
  const path = resolve(skillsDir, "context-satellite/SKILL.md");

  it("exists", () => {
    expect(existsSync(path)).toBe(true);
  });

  it("front-matter description starts with 'Use when'", () => {
    const { frontMatter } = loadMarkdown(path);
    expect(frontMatter.name).toBe("context-satellite");
    expect((frontMatter.description as string).startsWith("Use when")).toBe(true);
  });

  it("body has Reading, Writing-back, Submodule discipline sections", () => {
    const { body } = loadMarkdown(path);
    expect(hasSections(body, ["Reading", "Writing-back", "Submodule discipline"])).toEqual([]);
  });

  it("body has a Red Flags table", () => {
    const { body } = loadMarkdown(path);
    expect(body).toMatch(/Red [Ff]lags/);
    expect(body).toMatch(/\| Thought/);
    expect(body).toMatch(/\| Reality/);
  });

  it("body specifies detecting the wiki submodule default branch (no hard-coded 'main')", () => {
    const { body } = loadMarkdown(path);
    expect(body).toMatch(/default branch|HEAD branch/);
    expect(body).not.toMatch(/git checkout main(?!.*detect)/);
  });

  it("body specifies the pre-check + escalation pattern", () => {
    const { body } = loadMarkdown(path);
    expect(body).toMatch(/pre-check|precondition/i);
    expect(body).toMatch(/escalat|surface|stop|refuse/i);
  });

  it("body specifies worktree-awareness", () => {
    const { body } = loadMarkdown(path);
    expect(body).toMatch(/worktree/i);
  });

  it("has no placeholder leftovers", () => {
    const { raw } = loadMarkdown(path);
    expect(noPlaceholders(raw)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- skills`
Expected: previous 13 pass, new 8 fail.

- [ ] **Step 3: Create `plugins/repo-context/skills/context-satellite/SKILL.md`**

````markdown
---
name: context-satellite
description: Use when working in a repository that has a repo-context wiki connected as a submodule at `./wiki/`. Activates two roles: reading the wiki for context before significant work, and writing back to the wiki when changes affect cross-cutting concerns.
---

# context-satellite

Operate inside a satellite repo that has the `repo-context` wiki attached at `./wiki/`. This skill has two roles — reading and writing-back — and includes the submodule discipline that prevents commits from being orphaned in detached-HEAD state.

## Trigger

Activate when **all** of these hold:

1. Working directory resolves (after worktree resolution — see *Worktree-awareness* below) to a real repo root.
2. `wiki/.repo-context-meta.json` exists at that root and contains `"kind": "repo-context-store"`.
3. The user's request is either:
   - About significant work in the satellite that may touch cross-cutting concerns (architecture, contracts, env, deployment, decisions) — invokes *Reading*.
   - About updating shared wiki content with knowledge from this satellite — invokes *Writing-back*.

Do **not** activate for routine code changes that don't touch cross-cutting concerns. Run silent.

## Reading

Before significant cross-cutting work in the satellite:

1. Scan `wiki/index.md` for relevant topics.
2. Read topic pages whose `repos:` front-matter includes this satellite's slug. (Slug is derivable the same way `repo-scanner` derives it: from `git remote get-url origin`, or working-directory basename.)
3. Read referenced `decisions/` pages when topics cite them.
4. Use the gathered context to inform the work. Cite `[[wiki-page]]` in any output to the user.

## Writing-back

When a change in the satellite touches cross-cutting concerns (an API contract, an env var, a deployment change, a real decision), the skill proposes a wiki update **before** committing the satellite change, if possible — or after, if the user invokes the skill post-commit.

1. Identify which topic / decision page(s) the change affects. Use the satellite's slug and the changed file paths.
2. Draft a surgical edit per *Wiki maintenance discipline* in `wiki/CLAUDE.md`. Cite the source (file:line) for every new claim.
3. Present the draft to the user. Wait for acceptance / edits / rejection.
4. On acceptance, perform the *Submodule discipline* sequence below to write the edit on a real branch inside the submodule, commit it, and bump the submodule pointer in the satellite.

## Submodule discipline

Edits inside the wiki submodule must happen on a real branch, never in the detached-HEAD state that `git submodule update` leaves behind. Follow this sequence exactly.

### Pre-check (always)

```bash
# 1. Confirm submodule presence and validity.
test -d wiki/.git -o -f wiki/.git || { echo "wiki/ is not a git submodule" >&2; exit 1; }
test -f wiki/.repo-context-meta.json || { echo "wiki/ is not a repo-context store" >&2; exit 1; }

# 2. Detect the wiki's default branch (do NOT hard-code 'main').
default_branch=$(git -C wiki remote show origin 2>/dev/null | awk '/HEAD branch/ {print $NF}')
test -n "$default_branch" || { echo "Cannot determine wiki default branch" >&2; exit 1; }

# 3. Confirm the submodule working tree is clean.
test -z "$(git -C wiki status --porcelain)" || { echo "wiki/ has uncommitted changes — refusing to proceed" >&2; exit 1; }
```

If any pre-check fails, **escalate to the user with the actual failure message and STOP**. Do not attempt to auto-recover from arbitrary submodule state.

### Edit (only if pre-check passed)

```bash
git -C wiki checkout "$default_branch"
git -C wiki pull --ff-only origin "$default_branch"  # optional, do only if user wants latest before editing
# ... make edits to wiki/topics/<page>.md, wiki/decisions/<page>.md, wiki/index.md, wiki/log.md ...
git -C wiki add <changed files>
git -C wiki commit -m "satellite-update <satellite-slug>: <one-line summary>"
```

### Bump the submodule pointer

```bash
# Back in the satellite repo root:
git add wiki
git commit -m "Update wiki submodule pointer: <one-line summary>"
```

Do not push. The user reviews and pushes both repos.

## Worktree-awareness

Before any of the above runs, resolve to the real repo root:

```bash
real_root=$(git -C "$(pwd)" rev-parse --show-superproject-working-tree 2>/dev/null || git -C "$(pwd)" rev-parse --show-toplevel)
```

This handles two cases: (a) you're inside a git worktree pointing at a satellite's main repo; (b) you're inside the satellite directly. In both, `real_root` is the satellite's true root, where `wiki/` would live.

## Red flags

| Thought | Reality |
|---------|---------|
| "I'll just edit `wiki/topics/x.md` from the parent repo and `git add wiki/topics/x.md`" | The parent only tracks the submodule's commit SHA, not files inside it. Your edit lands in `wiki/`'s working tree, but parent-side `git add` doesn't capture it — you need to commit inside the submodule first, then bump the pointer. |
| "The submodule is on detached HEAD — `git commit` works, so it's fine" | The commit will be orphaned the next time `git submodule update` runs. Always check out a real branch first (`git checkout "$default_branch"`). |
| "I'll just assume the wiki's branch is `main`" | Many repos use `master`, `trunk`, or other names. Detect dynamically via `git remote show origin`. |
| "The user committed cross-cutting changes; I should auto-update the wiki" | This skill writes only with explicit user acceptance of each proposed edit. Hooks emit hints; mutation needs human approval. |

## Behavioral baseline

Four operational principles from the contributor `CLAUDE.md`. Especially: every proposed change cites its source (file:line); push back on ambiguity rather than guess.
````

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- skills`
Expected: PASS (all skills tests pass, ~21 total in skills file).

- [ ] **Step 5: Commit**

```bash
git add plugins/repo-context/skills/context-satellite/SKILL.md tests/skills.test.ts
git commit -m "Add context-satellite skill (with submodule discipline + worktree-awareness)"
```

---

## Task 14: Full-suite green check and pre-release polish

**Files:**

- Modify: `/Users/damianospara/playground/llm-wiki-impl/.claude-plugin/marketplace.json` — substitute real owner name/email.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`

Expected: All tests pass (smoke, root-files, manifests, templates, commands, agents, skills). Final count approximately:
- smoke: 1
- root-files: 3
- manifests: 5
- templates: 14
- commands: 13
- agents: 7
- skills: 21
- Total: ~64 tests, all passing.

If any fail, fix inline before continuing.

- [ ] **Step 2: Update marketplace.json owner**

Replace `"<user>"` and `"<email>"` in `.claude-plugin/marketplace.json` with the real values.

- [ ] **Step 3: Run the full suite again to confirm green**

Run: `npm test`
Expected: still all green.

- [ ] **Step 4: Commit**

```bash
git add .claude-plugin/marketplace.json
git commit -m "Set marketplace owner metadata"
```

---

## Task 15: Dogfooding scenario (manual integration test)

This is the v0.1 acceptance test. It is run by hand. Document it in the README so the user can re-run.

**Files:**

- Modify: `/Users/damianospara/playground/llm-wiki-impl/README.md` — append a "Dogfooding (v0.1 acceptance)" section.

- [ ] **Step 1: Append the dogfooding section to README.md**

Append to `README.md`:

````markdown

## Dogfooding (v0.1 acceptance)

Run this sequence end-to-end to validate the install / scaffold / connect / onboard path. It exercises the full v0.1 surface.

### Prerequisites

- Claude Code installed and authenticated.
- `git` available.
- One existing git repo to use as a satellite. Any repo will do.

### Steps

```bash
# 1. Install the plugin from this local marketplace.
/plugin marketplace add /path/to/llm-wiki-impl
/plugin install repo-context@repo-context-marketplace

# 2. Create an empty directory for the wiki and scaffold it.
mkdir ~/playground/example-context-store && cd ~/playground/example-context-store
/context-init
# Verify scaffolded files:
ls -A                                              # → .git CLAUDE.md index.md log.md topics decisions raw .repo-context-meta.json
cat .repo-context-meta.json | python3 -m json.tool # → kind: repo-context-store, schema_version: 1, empty topics/decisions arrays
git log --oneline                                  # → one commit: "Initialise repo-context store"

# 3. Push it to a remote (create a new repo on github/gitlab).
git remote add origin <new-remote-url>
git push -u origin main

# 4. Inside an existing satellite repo, connect it.
cd /path/to/your/satellite-repo
/context-connect <new-remote-url>
# This should:
#   - Add wiki/ as a submodule.
#   - Stitch the repo-context section into the satellite's CLAUDE.md (creates it if missing).
#   - Invoke context-onboard-satellite, which runs repo-scanner and proposes 1–5 seed pages.
#   - You accept (or edit / reject) each. Accepted seeds are committed inside the wiki submodule.
#   - Append a log entry. Commit the satellite repo with "Add repo-context wiki submodule".
# Verify:
ls wiki/                                           # → CLAUDE.md index.md log.md topics/ decisions/ raw/ .repo-context-meta.json (plus any seeds)
cat wiki/log.md                                    # → init entry + connect entry + onboard entry
grep -A 3 "BEGIN repo-context" CLAUDE.md           # → the satellite fragment

# 5. Ask a question against the wiki.
# Type: "What does the wiki say about <something the seed page covered>?"
# Expected: Claude uses context-query, reads index.md, drills into the relevant topic, answers with [[wikilinks]].
```

### Acceptance criteria

- v0.1 passes if all five steps above complete without errors AND the wiki ends up with:
  - At least one topic page tagged with this satellite's slug in its `repos:` front-matter.
  - A `log.md` containing the `init`, `connect`, and `onboard` entries in chronological order.
  - The satellite's `CLAUDE.md` has the `BEGIN repo-context` … `END repo-context` block.

### Known v0.1 limitations (expected, not bugs)

- Onboarding seeds are README-shaped, not contract-shaped (no AST extraction yet — that's v0.3).
- No `/context-lint`, `/context-diff`, `/context-ingest`, `/context-tour` (those land in v0.2–v0.5).
- No hooks (no SessionStart reminder, no PostToolUse hint — those land in v0.2–v0.3).
- The dashboard package is not yet built (v1.0).
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "Add v0.1 dogfooding acceptance scenario to README"
```

- [ ] **Step 3: Tag v0.1.0**

```bash
git tag -a v0.1.0 -m "repo-context v0.1.0 — skeletal smoke test"
```

Do not push the tag until the dogfooding scenario actually passes.

---

## Final notes for the implementer

- Every commit is its own logical unit. Don't bundle.
- If a test fails partway through, fix the failure before moving on — don't accumulate failures across tasks.
- The slash-command markdown files are *instructions for Claude*, not executable code. There's no way to unit-test that Claude correctly follows them; the dogfooding scenario (Task 15) is the integration test that closes that gap.
- If you find ambiguity in a step that the spec doesn't resolve, push back to the spec rather than guessing inline. Update the spec; re-run the relevant task.
- After v0.1 ships and the dogfooding scenario passes, the next plan (`docs/superpowers/plans/<next-date>-repo-context-v0.2.md`) adds `context-ingest`, `context-lint`, the derived graph, and the SessionStart hook.
