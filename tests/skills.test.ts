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

  it("body routes question kinds to appropriate categories", () => {
    const { body } = loadMarkdown(path);
    expect(body).toMatch(/principle/i);
    expect(body).toMatch(/topic/i);
    expect(body).toMatch(/decision/i);
  });

  it("has no placeholder leftovers", () => {
    const { raw } = loadMarkdown(path);
    expect(noPlaceholders(raw)).toEqual([]);
  });
});
