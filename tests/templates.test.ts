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

  it("Layout section names principles/ alongside topics/ decisions/ raw/", () => {
    const { body } = loadMarkdown(path);
    for (const dir of ["topics/", "decisions/", "principles/", "raw/"]) {
      expect(body).toContain(dir);
    }
  });

  it("Content categories section names four kinds (topics, decisions, principles, sources)", () => {
    const { body } = loadMarkdown(path);
    for (const kind of ["Topics", "Decisions", "Principles", "Sources"]) {
      expect(body).toMatch(new RegExp(`\\*\\*?${kind}`));
    }
  });

  it("has no placeholder leftovers", () => {
    const { raw } = loadMarkdown(path);
    expect(noPlaceholders(raw)).toEqual([]);
  });
});

describe("templates/index.md", () => {
  const path = resolve(templatesDir, "index.md");
  it("exists", () => expect(existsSync(path)).toBe(true));
  it("has Topics, Decisions, Principles, Sources headings", () => {
    const { body } = loadMarkdown(path);
    expect(hasSections(body, ["Topics", "Decisions", "Principles", "Sources"])).toEqual([]);
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
  it("repos: parses as an array (not null)", () => {
    const { frontMatter } = loadMarkdown(path);
    expect(Array.isArray(frontMatter.repos)).toBe(true);
  });
  it("has the {{title}} substitution marker on the H1", () => {
    const { raw } = loadMarkdown(path);
    expect(raw).toMatch(/^# \{\{title\}\}/m);
  });
  it("has the standard topic sections", () => {
    const { body } = loadMarkdown(path);
    expect(hasSections(body, ["Summary", "Current state", "Decisions referenced", "Open questions", "Sources"])).toEqual([]);
  });
  it("has no banned placeholder strings", () => {
    const { raw } = loadMarkdown(path);
    expect(noPlaceholders(raw)).toEqual([]);
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
  it("has the {{title}} substitution marker on the H1", () => {
    const { raw } = loadMarkdown(path);
    expect(raw).toMatch(/^# \{\{title\}\}/m);
  });
  it("has Context / Decision / Consequences sections", () => {
    const { body } = loadMarkdown(path);
    expect(hasSections(body, ["Context", "Decision", "Consequences"])).toEqual([]);
  });
  it("has no banned placeholder strings", () => {
    const { raw } = loadMarkdown(path);
    expect(noPlaceholders(raw)).toEqual([]);
  });
});

describe("templates/principle.md", () => {
  const path = resolve(templatesDir, "principle.md");
  it("exists", () => expect(existsSync(path)).toBe(true));
  it("has YAML front-matter with adopted, status, sources", () => {
    const { frontMatter } = loadMarkdown(path);
    expect(frontMatter).toHaveProperty("adopted");
    expect(frontMatter).toHaveProperty("status");
    expect(frontMatter).toHaveProperty("sources");
  });
  it("sources: parses as an array (not null)", () => {
    const { frontMatter } = loadMarkdown(path);
    expect(Array.isArray(frontMatter.sources)).toBe(true);
  });
  it("has the {{title}} substitution marker on the H1", () => {
    const { raw } = loadMarkdown(path);
    expect(raw).toMatch(/^# \{\{title\}\}/m);
  });
  it("has 'What this means in practice' and 'What this does not mean' sections", () => {
    const { body } = loadMarkdown(path);
    expect(hasSections(body, ["What this means in practice", "What this does not mean", "Sources"])).toEqual([]);
  });
  it("does not have a repos: field (principles are not satellite-scoped)", () => {
    const { frontMatter } = loadMarkdown(path);
    expect(frontMatter).not.toHaveProperty("repos");
  });
  it("has no banned placeholder strings", () => {
    const { raw } = loadMarkdown(path);
    expect(noPlaceholders(raw)).toEqual([]);
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
