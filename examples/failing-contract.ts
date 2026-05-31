import {
  formatMarkdownContractReport,
  validateToolRegistry,
  type ToolContract
} from "../src/index.js";

const tools: ToolContract[] = [
  {
    name: "deleteUser",
    description: "Deletes a user account.",
    risk: "critical",
    requiresApproval: false,
    inputSchema: {
      type: "object",
      required: ["userId", "confirmation"],
      additionalProperties: false,
      properties: {
        userId: { type: "string" }
      }
    },
    exampleInput: {
      userId: "usr_123",
      extra: true
    }
  },
  {
    name: "deleteUser",
    description: "Duplicate name that should be caught.",
    risk: "low",
    inputSchema: {
      type: "object",
      required: ["ticketId"],
      properties: {
        ticketId: { type: "string", pattern: "[" }
      }
    },
    exampleInput: {
      ticketId: "TCK-123"
    }
  }
];

const report = validateToolRegistry(tools, {
  forbiddenToolNames: ["deleteUser"],
  requireOwner: true,
  requireVersion: true
});

console.log(formatMarkdownContractReport(report));
