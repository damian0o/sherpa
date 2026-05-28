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
