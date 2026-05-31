import { describe, expect, it } from "vitest";
import {
  createJsonContractReport,
  createToolManifest,
  diffToolContracts,
  formatMarkdownContractReport,
  getContractCliExitCode,
  validateExampleAgainstSchema,
  validateSchemaDefinition,
  validateToolRegistry,
  type ToolContract
} from "../src/index.js";

function baseTool(overrides: Partial<ToolContract> = {}): ToolContract {
  return {
    name: "search_docs",
    description: "Search approved product documentation before answering support questions.",
    version: "1.0.0",
    owner: "support-platform",
    risk: "low",
    requiresApproval: false,
    inputSchema: {
      type: "object",
      required: ["query"],
      additionalProperties: false,
      properties: {
        query: { type: "string", minLength: 3 },
        limit: { type: "integer", minimum: 1, maximum: 10 }
      }
    },
    outputSchema: {
      type: "object",
      required: ["results"],
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            required: ["title"],
            properties: {
              title: { type: "string" }
            }
          }
        }
      }
    },
    exampleInput: { query: "refund policy", limit: 3 },
    exampleOutput: { results: [{ title: "Refund Policy" }] },
    ...overrides
  };
}

describe("validateToolRegistry", () => {
  it("passes a valid registry", () => {
    const report = validateToolRegistry([baseTool()], { requireOwner: true, requireVersion: true });
    expect(report.status).toBe("pass");
    expect(report.summary.blockerCount).toBe(0);
  });

  it("fails an empty registry", () => {
    const report = validateToolRegistry([]);
    expect(report.status).toBe("fail");
    expect(report.findings[0]?.code).toBe("empty_registry");
  });

  it("fails duplicate tool names", () => {
    const report = validateToolRegistry([baseTool(), baseTool({ title: "Duplicate" })]);
    expect(report.status).toBe("fail");
    expect(report.findings.some((finding) => finding.code === "duplicate_tool_name")).toBe(true);
  });

  it("fails invalid tool names", () => {
    const report = validateToolRegistry([baseTool({ name: "Delete User!" })]);
    expect(report.findings.some((finding) => finding.code === "invalid_tool_name")).toBe(true);
  });

  it("fails forbidden tool names", () => {
    const report = validateToolRegistry([baseTool({ name: "delete_user" })], {
      forbiddenToolNames: ["delete_user"]
    });
    expect(report.findings.some((finding) => finding.code === "forbidden_tool_name")).toBe(true);
  });

  it("warns for missing useful descriptions", () => {
    const report = validateToolRegistry([baseTool({ description: "short" })]);
    expect(report.status).toBe("warn");
    expect(report.findings.some((finding) => finding.code === "missing_tool_description")).toBe(true);
  });

  it("warns for required owner and version metadata", () => {
    const report = validateToolRegistry([baseTool({ owner: undefined, version: undefined })], {
      requireOwner: true,
      requireVersion: true
    });
    expect(report.status).toBe("warn");
    expect(report.findings.map((finding) => finding.code)).toContain("missing_tool_owner");
    expect(report.findings.map((finding) => finding.code)).toContain("missing_tool_version");
  });

  it("fails high risk tools without approval", () => {
    const report = validateToolRegistry([baseTool({ risk: "high", requiresApproval: false })]);
    expect(report.findings.some((finding) => finding.code === "approval_required")).toBe(true);
  });

  it("passes critical tools with approval", () => {
    const report = validateToolRegistry([baseTool({ risk: "critical", requiresApproval: true })]);
    expect(report.status).toBe("pass");
  });

  it("warns when example input is required but missing", () => {
    const report = validateToolRegistry([baseTool({ exampleInput: undefined })], {
      requireExampleInput: true
    });
    expect(report.status).toBe("warn");
    expect(report.findings.some((finding) => finding.code === "missing_example_input")).toBe(true);
  });

  it("fails invalid example input missing required fields", () => {
    const report = validateToolRegistry([baseTool({ exampleInput: { limit: 3 } })]);
    expect(report.status).toBe("fail");
    expect(report.findings.some((finding) => finding.code === "example_input_invalid")).toBe(true);
  });

  it("fails invalid example input with unexpected fields when additionalProperties is false", () => {
    const report = validateToolRegistry([baseTool({ exampleInput: { query: "refund", extra: true } })]);
    expect(report.findings.some((finding) => finding.path?.endsWith(".extra"))).toBe(true);
  });

  it("fails pattern mismatch in example input", () => {
    const tool = baseTool({
      inputSchema: {
        type: "object",
        required: ["orderId"],
        properties: {
          orderId: { type: "string", pattern: "^ORD-[0-9]+$" }
        }
      },
      exampleInput: { orderId: "BAD-1" }
    });
    const report = validateToolRegistry([tool]);
    expect(report.status).toBe("fail");
  });

  it("fails enum mismatch in example input", () => {
    const report = validateToolRegistry([
      baseTool({
        inputSchema: {
          type: "object",
          required: ["locale"],
          properties: {
            locale: { type: "string", enum: ["en", "ko"] }
          }
        },
        exampleInput: { locale: "fr" }
      })
    ]);
    expect(report.status).toBe("fail");
  });

  it("fails non-integer values for integer schemas", () => {
    const findings = validateExampleAgainstSchema({ type: "integer" }, 1.5, "value");
    expect(findings.length).toBe(1);
  });

  it("validates arrays with item schemas", () => {
    const findings = validateExampleAgainstSchema({ type: "array", items: { type: "string" } }, ["ok", 1], "items");
    expect(findings.length).toBe(1);
  });

  it("warns when an array schema has no item schema", () => {
    const findings = validateSchemaDefinition({ type: "array" });
    expect(findings.some((finding) => finding.code === "array_schema_missing_items")).toBe(true);
  });

  it("fails invalid schema regex patterns", () => {
    const findings = validateSchemaDefinition({ type: "string", pattern: "[" });
    expect(findings.some((finding) => finding.code === "invalid_schema_pattern")).toBe(true);
  });

  it("does not throw when validating an example against an invalid pattern", () => {
    const findings = validateExampleAgainstSchema({ type: "string", pattern: "[" }, "ORD-1", "value");
    expect(findings.length).toBe(1);
  });

  it("fails required properties that are not defined under properties", () => {
    const findings = validateSchemaDefinition({ type: "object", required: ["query"], properties: {} });
    expect(findings.some((finding) => finding.code === "required_property_missing_from_schema")).toBe(true);
  });

  it("fails unknown schema types", () => {
    const findings = validateSchemaDefinition({ type: "date" as never });
    expect(findings.some((finding) => finding.code === "invalid_schema_type")).toBe(true);
  });
});

describe("diffToolContracts", () => {
  it("fails removed tools", () => {
    const report = diffToolContracts([baseTool()], []);
    expect(report.status).toBe("fail");
    expect(report.findings.some((finding) => finding.code === "breaking_tool_removed")).toBe(true);
  });

  it("marks added tools as info", () => {
    const report = diffToolContracts([], [baseTool()]);
    expect(report.status).toBe("pass");
    expect(report.findings.some((finding) => finding.code === "tool_added")).toBe(true);
  });

  it("fails input schema type changes", () => {
    const report = diffToolContracts([
      baseTool({ inputSchema: { type: "object", properties: { query: { type: "string" } } } })
    ], [
      baseTool({ inputSchema: { type: "object", properties: { query: { type: "number" } } } })
    ]);
    expect(report.findings.some((finding) => finding.code === "breaking_schema_type_changed")).toBe(true);
  });

  it("fails newly required input fields", () => {
    const report = diffToolContracts([
      baseTool({ inputSchema: { type: "object", required: ["query"], properties: { query: { type: "string" } } } })
    ], [
      baseTool({ inputSchema: { type: "object", required: ["query", "locale"], properties: { query: { type: "string" }, locale: { type: "string" } } } })
    ]);
    expect(report.findings.some((finding) => finding.code === "breaking_required_input_added")).toBe(true);
  });

  it("fails removed input properties", () => {
    const report = diffToolContracts([
      baseTool({ inputSchema: { type: "object", properties: { query: { type: "string" }, limit: { type: "integer" } } } })
    ], [
      baseTool({ inputSchema: { type: "object", properties: { query: { type: "string" } } } })
    ]);
    expect(report.findings.some((finding) => finding.code === "breaking_input_property_removed")).toBe(true);
  });

  it("fails risk increases without approval", () => {
    const report = diffToolContracts([
      baseTool({ risk: "low", requiresApproval: false })
    ], [
      baseTool({ risk: "high", requiresApproval: false })
    ]);
    expect(report.findings.some((finding) => finding.code === "risk_increased_without_approval")).toBe(true);
  });
});

describe("reports", () => {
  it("generates markdown reports", () => {
    const report = validateToolRegistry([baseTool()]);
    expect(formatMarkdownContractReport(report)).toContain("AI Tool Schema Contract Report");
  });

  it("generates JSON reports", () => {
    const report = validateToolRegistry([baseTool()]);
    expect(JSON.parse(createJsonContractReport(report)).status).toBe("pass");
  });

  it("returns CLI exit code 0 for pass", () => {
    expect(getContractCliExitCode(validateToolRegistry([baseTool()]))).toBe(0);
  });

  it("returns CLI exit code 1 for fail", () => {
    expect(getContractCliExitCode(validateToolRegistry([]))).toBe(1);
  });

  it("creates a safe tool manifest", () => {
    const manifest = createToolManifest([baseTool()]);
    expect(manifest[0]).toMatchObject({
      name: "search_docs",
      risk: "low",
      hasExampleInput: true
    });
  });
});
