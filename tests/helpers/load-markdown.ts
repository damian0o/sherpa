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
