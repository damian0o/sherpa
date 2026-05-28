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

  it("body's meta file template includes a principles array", () => {
    const { body } = loadMarkdown(path);
    expect(body).toMatch(/"principles":\s*\[\]/);
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
