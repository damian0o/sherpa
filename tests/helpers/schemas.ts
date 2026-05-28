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
