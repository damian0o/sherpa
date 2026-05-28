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
