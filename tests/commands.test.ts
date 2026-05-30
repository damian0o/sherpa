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

  it("body creates the four content-category directories", () => {
    const { body } = loadMarkdown(path);
    for (const d of ["topics/", "decisions/", "principles/", "raw/"]) {
      expect(body).toContain(d);
    }
  });

  it("body specifies writing the marker .repo-context-meta.json", () => {
    const { body } = loadMarkdown(path);
    expect(body).toContain(".repo-context-meta.json");
  });

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

  it("has no placeholder leftovers", () => {
    const { raw } = loadMarkdown(path);
    expect(noPlaceholders(raw)).toEqual([]);
  });
});

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
