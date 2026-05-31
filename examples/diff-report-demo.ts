import {
  diffToolContracts,
  formatMarkdownContractReport,
  type ToolContract
} from "../src/index.js";

const previousTools: ToolContract[] = [
  {
    name: "search_docs",
    description: "Searches approved product documentation.",
    risk: "low",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string" },
        limit: { type: "integer" }
      }
    }
  },
  {
    name: "create_ticket",
    description: "Creates a support ticket.",
    risk: "medium",
    inputSchema: {
      type: "object",
      required: ["summary"],
      properties: {
        summary: { type: "string" }
      }
    }
  }
];

const currentTools: ToolContract[] = [
  {
    name: "search_docs",
    description: "Searches approved product documentation.",
    risk: "high",
    requiresApproval: false,
    inputSchema: {
      type: "object",
      required: ["query", "locale"],
      properties: {
        query: { type: "string" },
        locale: { type: "string", enum: ["en", "ko"] },
        limit: { type: "integer" }
      }
    }
  }
];

console.log(formatMarkdownContractReport(diffToolContracts(previousTools, currentTools)));
