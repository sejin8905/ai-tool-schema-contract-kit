export type ToolRisk = "low" | "medium" | "high" | "critical";
export type SchemaPrimitiveType = "string" | "number" | "integer" | "boolean" | "object" | "array" | "null";
export type ContractSeverity = "info" | "warn" | "blocker";
export type ContractStatus = "pass" | "warn" | "fail";

export interface SchemaNode {
  type?: SchemaPrimitiveType | SchemaPrimitiveType[];
  description?: string;
  required?: string[];
  properties?: Record<string, SchemaNode>;
  items?: SchemaNode;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  additionalProperties?: boolean;
}

export interface ToolContract {
  name: string;
  title?: string;
  description?: string;
  version?: string;
  owner?: string;
  risk?: ToolRisk;
  requiresApproval?: boolean;
  inputSchema: SchemaNode;
  outputSchema?: SchemaNode;
  exampleInput?: unknown;
  exampleOutput?: unknown;
  tags?: string[];
}

export interface ContractPolicy {
  requireDescriptions?: boolean;
  requireOwner?: boolean;
  requireVersion?: boolean;
  requireExampleInput?: boolean;
  requireExampleOutput?: boolean;
  approvalRequiredForRisks?: ToolRisk[];
  allowedRiskLevels?: ToolRisk[];
  maxToolNameLength?: number;
  toolNamePattern?: string;
  forbiddenToolNames?: string[];
}

export interface ContractFinding {
  code: string;
  message: string;
  severity: ContractSeverity;
  path?: string;
  toolName?: string;
}

export interface RegistryReport {
  status: ContractStatus;
  checkedToolCount: number;
  findings: ContractFinding[];
  summary: {
    blockerCount: number;
    warningCount: number;
    infoCount: number;
  };
}

export interface ContractDiffReport {
  status: ContractStatus;
  previousToolCount: number;
  currentToolCount: number;
  findings: ContractFinding[];
  summary: {
    blockerCount: number;
    warningCount: number;
    infoCount: number;
  };
}

const DEFAULT_POLICY: Required<ContractPolicy> = {
  requireDescriptions: true,
  requireOwner: false,
  requireVersion: false,
  requireExampleInput: true,
  requireExampleOutput: false,
  approvalRequiredForRisks: ["high", "critical"],
  allowedRiskLevels: ["low", "medium", "high", "critical"],
  maxToolNameLength: 64,
  toolNamePattern: "^[a-z][a-z0-9_:-]{1,63}$",
  forbiddenToolNames: []
};

const RISK_ORDER: Record<ToolRisk, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};

const VALID_SCHEMA_TYPES: SchemaPrimitiveType[] = ["string", "number", "integer", "boolean", "object", "array", "null"];

export function getDefaultContractPolicy(overrides: ContractPolicy = {}): Required<ContractPolicy> {
  return {
    ...DEFAULT_POLICY,
    ...overrides,
    approvalRequiredForRisks: overrides.approvalRequiredForRisks ?? DEFAULT_POLICY.approvalRequiredForRisks,
    allowedRiskLevels: overrides.allowedRiskLevels ?? DEFAULT_POLICY.allowedRiskLevels,
    forbiddenToolNames: overrides.forbiddenToolNames ?? DEFAULT_POLICY.forbiddenToolNames
  };
}

export function validateToolRegistry(tools: ToolContract[], policyInput: ContractPolicy = {}): RegistryReport {
  const policy = getDefaultContractPolicy(policyInput);
  const findings: ContractFinding[] = [];
  const seen = new Map<string, number>();

  if (!Array.isArray(tools) || tools.length === 0) {
    findings.push({
      code: "empty_registry",
      severity: "blocker",
      message: "Tool registry is empty. Add at least one tool contract before shipping."
    });
  }

  for (const [index, tool] of tools.entries()) {
    const path = `tools[${index}]`;
    if (tool?.name) {
      seen.set(tool.name, (seen.get(tool.name) ?? 0) + 1);
    }
    findings.push(...validateToolContract(tool, policy, path));
  }

  for (const [name, count] of seen.entries()) {
    if (count > 1) {
      findings.push({
        code: "duplicate_tool_name",
        severity: "blocker",
        message: `Tool name "${name}" appears ${count} times. Tool names must be unique.`,
        toolName: name
      });
    }
  }

  return createRegistryReport(tools.length, findings);
}

export function validateToolContract(
  tool: ToolContract,
  policyInput: ContractPolicy = {},
  path = "tool"
): ContractFinding[] {
  const policy = getDefaultContractPolicy(policyInput);
  const findings: ContractFinding[] = [];

  if (!tool || typeof tool !== "object") {
    return [{
      code: "invalid_tool_contract",
      severity: "blocker",
      message: "Tool contract must be an object.",
      path
    }];
  }

  if (!tool.name || typeof tool.name !== "string") {
    findings.push({
      code: "missing_tool_name",
      severity: "blocker",
      message: "Tool contract is missing a string name.",
      path: `${path}.name`
    });
  } else {
    const namePattern = new RegExp(policy.toolNamePattern);
    if (tool.name.length > policy.maxToolNameLength || !namePattern.test(tool.name)) {
      findings.push({
        code: "invalid_tool_name",
        severity: "blocker",
        message: `Tool name "${tool.name}" does not match the allowed naming policy.`,
        path: `${path}.name`,
        toolName: tool.name
      });
    }

    if (policy.forbiddenToolNames.includes(tool.name)) {
      findings.push({
        code: "forbidden_tool_name",
        severity: "blocker",
        message: `Tool name "${tool.name}" is forbidden by policy.`,
        path: `${path}.name`,
        toolName: tool.name
      });
    }
  }

  if (policy.requireDescriptions && !hasUsefulText(tool.description)) {
    findings.push({
      code: "missing_tool_description",
      severity: "warn",
      message: `Tool "${tool.name || path}" is missing a useful description.`,
      path: `${path}.description`,
      toolName: tool.name
    });
  }

  if (policy.requireOwner && !hasAnyText(tool.owner)) {
    findings.push({
      code: "missing_tool_owner",
      severity: "warn",
      message: `Tool "${tool.name || path}" is missing an owner.`,
      path: `${path}.owner`,
      toolName: tool.name
    });
  }

  if (policy.requireVersion && !hasAnyText(tool.version)) {
    findings.push({
      code: "missing_tool_version",
      severity: "warn",
      message: `Tool "${tool.name || path}" is missing a version.`,
      path: `${path}.version`,
      toolName: tool.name
    });
  }

  const risk = tool.risk ?? "medium";
  if (!policy.allowedRiskLevels.includes(risk)) {
    findings.push({
      code: "invalid_tool_risk",
      severity: "blocker",
      message: `Tool "${tool.name || path}" has invalid risk "${String(tool.risk)}".`,
      path: `${path}.risk`,
      toolName: tool.name
    });
  }

  if (policy.approvalRequiredForRisks.includes(risk) && tool.requiresApproval !== true) {
    findings.push({
      code: "approval_required",
      severity: "blocker",
      message: `Tool "${tool.name || path}" is ${risk} risk and must require approval.`,
      path: `${path}.requiresApproval`,
      toolName: tool.name
    });
  }

  if (!tool.inputSchema) {
    findings.push({
      code: "missing_input_schema",
      severity: "blocker",
      message: `Tool "${tool.name || path}" is missing inputSchema.`,
      path: `${path}.inputSchema`,
      toolName: tool.name
    });
  } else {
    findings.push(...validateSchemaDefinition(tool.inputSchema, `${path}.inputSchema`, tool.name));
  }

  if (tool.outputSchema) {
    findings.push(...validateSchemaDefinition(tool.outputSchema, `${path}.outputSchema`, tool.name));
  }

  if (policy.requireExampleInput && tool.exampleInput === undefined) {
    findings.push({
      code: "missing_example_input",
      severity: "warn",
      message: `Tool "${tool.name || path}" is missing exampleInput.`,
      path: `${path}.exampleInput`,
      toolName: tool.name
    });
  }

  if (tool.exampleInput !== undefined && tool.inputSchema) {
    findings.push(...validateExampleAgainstSchema(tool.inputSchema, tool.exampleInput, `${path}.exampleInput`, tool.name, "example_input_invalid"));
  }

  if (policy.requireExampleOutput && tool.exampleOutput === undefined) {
    findings.push({
      code: "missing_example_output",
      severity: "warn",
      message: `Tool "${tool.name || path}" is missing exampleOutput.`,
      path: `${path}.exampleOutput`,
      toolName: tool.name
    });
  }

  if (tool.exampleOutput !== undefined && tool.outputSchema) {
    findings.push(...validateExampleAgainstSchema(tool.outputSchema, tool.exampleOutput, `${path}.exampleOutput`, tool.name, "example_output_invalid"));
  }

  return findings;
}

export function diffToolContracts(previousTools: ToolContract[], currentTools: ToolContract[]): ContractDiffReport {
  const findings: ContractFinding[] = [];
  const previousByName = new Map(previousTools.map((tool) => [tool.name, tool]));
  const currentByName = new Map(currentTools.map((tool) => [tool.name, tool]));

  for (const previousTool of previousTools) {
    const currentTool = currentByName.get(previousTool.name);
    if (!currentTool) {
      findings.push({
        code: "breaking_tool_removed",
        severity: "blocker",
        message: `Tool "${previousTool.name}" existed before but is missing in the current registry.`,
        toolName: previousTool.name
      });
      continue;
    }

    findings.push(...compareSchemas(previousTool.inputSchema, currentTool.inputSchema, `tools.${previousTool.name}.inputSchema`, previousTool.name));

    const oldRequired = new Set(previousTool.inputSchema?.required ?? []);
    const newRequired = new Set(currentTool.inputSchema?.required ?? []);
    for (const requiredName of newRequired) {
      if (!oldRequired.has(requiredName)) {
        findings.push({
          code: "breaking_required_input_added",
          severity: "blocker",
          message: `Tool "${previousTool.name}" added new required input "${requiredName}".`,
          path: `tools.${previousTool.name}.inputSchema.required`,
          toolName: previousTool.name
        });
      }
    }

    const previousRisk = previousTool.risk ?? "medium";
    const currentRisk = currentTool.risk ?? "medium";
    if (RISK_ORDER[currentRisk] > RISK_ORDER[previousRisk] && currentTool.requiresApproval !== true) {
      findings.push({
        code: "risk_increased_without_approval",
        severity: "blocker",
        message: `Tool "${previousTool.name}" risk increased from ${previousRisk} to ${currentRisk} without approval enabled.`,
        path: `tools.${previousTool.name}.risk`,
        toolName: previousTool.name
      });
    }
  }

  for (const currentTool of currentTools) {
    if (!previousByName.has(currentTool.name)) {
      findings.push({
        code: "tool_added",
        severity: "info",
        message: `Tool "${currentTool.name}" is new in the current registry.`,
        toolName: currentTool.name
      });
    }
  }

  return {
    status: statusFromFindings(findings),
    previousToolCount: previousTools.length,
    currentToolCount: currentTools.length,
    findings,
    summary: summarizeFindings(findings)
  };
}

export function validateSchemaDefinition(schema: SchemaNode, path = "schema", toolName?: string): ContractFinding[] {
  const findings: ContractFinding[] = [];

  if (!schema || typeof schema !== "object") {
    return [{
      code: "invalid_schema",
      severity: "blocker",
      message: "Schema must be an object.",
      path,
      toolName
    }];
  }

  const schemaTypes = normalizeTypes(schema.type);
  for (const schemaType of schemaTypes) {
    if (!VALID_SCHEMA_TYPES.includes(schemaType)) {
      findings.push({
        code: "invalid_schema_type",
        severity: "blocker",
        message: `Schema type "${String(schemaType)}" is not supported by this starter checker.`,
        path: `${path}.type`,
        toolName
      });
    }
  }

  if (schemaTypes.includes("object")) {
    const properties = schema.properties ?? {};
    if (schema.required && !Array.isArray(schema.required)) {
      findings.push({
        code: "invalid_required_list",
        severity: "blocker",
        message: "Schema required field must be an array of strings.",
        path: `${path}.required`,
        toolName
      });
    }
    for (const requiredName of schema.required ?? []) {
      if (!properties[requiredName]) {
        findings.push({
          code: "required_property_missing_from_schema",
          severity: "blocker",
          message: `Required property "${requiredName}" is not defined under properties.`,
          path: `${path}.required`,
          toolName
        });
      }
    }
    for (const [propertyName, propertySchema] of Object.entries(properties)) {
      findings.push(...validateSchemaDefinition(propertySchema, `${path}.properties.${propertyName}`, toolName));
    }
  }

  if (schemaTypes.includes("array")) {
    if (!schema.items) {
      findings.push({
        code: "array_schema_missing_items",
        severity: "warn",
        message: "Array schema is missing items. Add item schema to avoid accepting anything.",
        path: `${path}.items`,
        toolName
      });
    } else {
      findings.push(...validateSchemaDefinition(schema.items, `${path}.items`, toolName));
    }
  }

  if (schema.pattern) {
    try {
      new RegExp(schema.pattern);
    } catch {
      findings.push({
        code: "invalid_schema_pattern",
        severity: "blocker",
        message: `Schema pattern "${schema.pattern}" is not a valid regular expression.`,
        path: `${path}.pattern`,
        toolName
      });
    }
  }

  return findings;
}

export function validateExampleAgainstSchema(
  schema: SchemaNode,
  value: unknown,
  path = "value",
  toolName?: string,
  code = "schema_value_invalid"
): ContractFinding[] {
  const findings: ContractFinding[] = [];
  const actualType = getValueType(value);
  const allowedTypes = normalizeTypes(schema.type);

  if (allowedTypes.length > 0 && !allowedTypes.some((type) => valueMatchesType(value, type))) {
    findings.push({
      code,
      severity: "blocker",
      message: `${path} has type ${actualType}, expected ${allowedTypes.join(" or ")}.`,
      path,
      toolName
    });
    return findings;
  }

  if (schema.enum && !schema.enum.some((item) => Object.is(item, value))) {
    findings.push({
      code,
      severity: "blocker",
      message: `${path} is not one of the allowed enum values.`,
      path,
      toolName
    });
  }

  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      findings.push({ code, severity: "blocker", message: `${path} is shorter than minLength ${schema.minLength}.`, path, toolName });
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      findings.push({ code, severity: "blocker", message: `${path} is longer than maxLength ${schema.maxLength}.`, path, toolName });
    }
    if (schema.pattern) {
      const pattern = safeRegExp(schema.pattern);
      if (!pattern) {
        findings.push({ code, severity: "blocker", message: `${path} cannot be validated because schema pattern is invalid.`, path, toolName });
      } else if (!pattern.test(value)) {
        findings.push({ code, severity: "blocker", message: `${path} does not match required pattern.`, path, toolName });
      }
    }
  }

  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) {
      findings.push({ code, severity: "blocker", message: `${path} is below minimum ${schema.minimum}.`, path, toolName });
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      findings.push({ code, severity: "blocker", message: `${path} is above maximum ${schema.maximum}.`, path, toolName });
    }
  }

  if (schema.type === "object" && value && typeof value === "object" && !Array.isArray(value)) {
    const objectValue = value as Record<string, unknown>;
    for (const requiredName of schema.required ?? []) {
      if (!(requiredName in objectValue)) {
        findings.push({ code, severity: "blocker", message: `${path}.${requiredName} is required but missing.`, path: `${path}.${requiredName}`, toolName });
      }
    }
    for (const [propertyName, propertySchema] of Object.entries(schema.properties ?? {})) {
      if (propertyName in objectValue) {
        findings.push(...validateExampleAgainstSchema(propertySchema, objectValue[propertyName], `${path}.${propertyName}`, toolName, code));
      }
    }
    if (schema.additionalProperties === false) {
      for (const propertyName of Object.keys(objectValue)) {
        if (!schema.properties?.[propertyName]) {
          findings.push({ code, severity: "blocker", message: `${path}.${propertyName} is not allowed by this schema.`, path: `${path}.${propertyName}`, toolName });
        }
      }
    }
  }

  if (schema.type === "array" && Array.isArray(value) && schema.items) {
    for (const [index, item] of value.entries()) {
      findings.push(...validateExampleAgainstSchema(schema.items, item, `${path}[${index}]`, toolName, code));
    }
  }

  return findings;
}

export function formatMarkdownContractReport(report: RegistryReport | ContractDiffReport): string {
  const lines = [
    "# AI Tool Schema Contract Report",
    "",
    `Status: ${report.status}`,
    `Blockers: ${report.summary.blockerCount}`,
    `Warnings: ${report.summary.warningCount}`,
    `Info: ${report.summary.infoCount}`,
    ""
  ];

  if (report.findings.length === 0) {
    lines.push("No findings.");
    return lines.join("\n");
  }

  lines.push("## Findings", "");
  for (const finding of report.findings) {
    const location = finding.path ? ` (${finding.path})` : "";
    lines.push(`- [${finding.severity}] ${finding.code}${location}: ${finding.message}`);
  }
  return lines.join("\n");
}

export function createJsonContractReport(report: RegistryReport | ContractDiffReport): string {
  return JSON.stringify(report, null, 2);
}

export function getContractCliExitCode(report: RegistryReport | ContractDiffReport): 0 | 1 {
  return report.status === "fail" ? 1 : 0;
}

export function createToolManifest(tools: ToolContract[]) {
  return tools.map((tool) => ({
    name: tool.name,
    version: tool.version ?? "unversioned",
    risk: tool.risk ?? "medium",
    requiresApproval: tool.requiresApproval === true,
    hasExampleInput: tool.exampleInput !== undefined,
    hasExampleOutput: tool.exampleOutput !== undefined
  }));
}

function compareSchemas(previous: SchemaNode, current: SchemaNode, path: string, toolName?: string): ContractFinding[] {
  const findings: ContractFinding[] = [];
  const previousTypes = normalizeTypes(previous?.type).join("|");
  const currentTypes = normalizeTypes(current?.type).join("|");
  if (previousTypes !== currentTypes) {
    findings.push({
      code: "breaking_schema_type_changed",
      severity: "blocker",
      message: `Schema type changed from "${previousTypes || "unspecified"}" to "${currentTypes || "unspecified"}".`,
      path: `${path}.type`,
      toolName
    });
  }

  if (previous?.type === "object" && current?.type === "object") {
    const previousProperties = previous.properties ?? {};
    const currentProperties = current.properties ?? {};
    for (const [propertyName, previousProperty] of Object.entries(previousProperties)) {
      const currentProperty = currentProperties[propertyName];
      if (!currentProperty) {
        findings.push({
          code: "breaking_input_property_removed",
          severity: "blocker",
          message: `Input property "${propertyName}" was removed.`,
          path: `${path}.properties.${propertyName}`,
          toolName
        });
      } else {
        findings.push(...compareSchemas(previousProperty, currentProperty, `${path}.properties.${propertyName}`, toolName));
      }
    }
  }

  return findings;
}

function createRegistryReport(checkedToolCount: number, findings: ContractFinding[]): RegistryReport {
  return {
    status: statusFromFindings(findings),
    checkedToolCount,
    findings,
    summary: summarizeFindings(findings)
  };
}

function statusFromFindings(findings: ContractFinding[]): ContractStatus {
  if (findings.some((finding) => finding.severity === "blocker")) return "fail";
  if (findings.some((finding) => finding.severity === "warn")) return "warn";
  return "pass";
}

function summarizeFindings(findings: ContractFinding[]) {
  return {
    blockerCount: findings.filter((finding) => finding.severity === "blocker").length,
    warningCount: findings.filter((finding) => finding.severity === "warn").length,
    infoCount: findings.filter((finding) => finding.severity === "info").length
  };
}

function hasUsefulText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length >= 12;
}

function hasAnyText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeTypes(type: SchemaNode["type"]): SchemaPrimitiveType[] {
  if (!type) return [];
  return Array.isArray(type) ? type : [type];
}

function getValueType(value: unknown): string {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  if (Number.isInteger(value)) return "integer";
  return typeof value;
}

function valueMatchesType(value: unknown, type: SchemaPrimitiveType): boolean {
  if (type === "array") return Array.isArray(value);
  if (type === "null") return value === null;
  if (type === "integer") return Number.isInteger(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  return typeof value === type;
}

function safeRegExp(pattern: string): RegExp | null {
  try {
    return new RegExp(pattern);
  } catch {
    return null;
  }
}
