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

  it("has no placeholder leftovers", () => {
    const { raw } = loadMarkdown(path);
    expect(noPlaceholders(raw)).toEqual([]);
  });
});

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
