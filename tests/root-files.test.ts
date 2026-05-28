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
