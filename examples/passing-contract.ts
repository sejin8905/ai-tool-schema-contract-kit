import {
  createToolManifest,
  formatMarkdownContractReport,
  validateToolRegistry,
  type ToolContract
} from "../src/index.js";

const tools: ToolContract[] = [
  {
    name: "search_docs",
    title: "Search Docs",
    description: "Searches approved product documentation before answering customer questions.",
    version: "1.0.0",
    owner: "support-platform",
    risk: "low",
    requiresApproval: false,
    inputSchema: {
      type: "object",
      required: ["query"],
      additionalProperties: false,
      properties: {
        query: { type: "string", minLength: 3, maxLength: 200 },
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
            required: ["title", "url"],
            properties: {
              title: { type: "string" },
              url: { type: "string" }
            }
          }
        }
      }
    },
    exampleInput: { query: "refund policy", limit: 3 },
    exampleOutput: { results: [{ title: "Refund Policy", url: "https://example.com/refunds" }] }
  },
  {
    name: "create_refund_review",
    title: "Create Refund Review",
    description: "Creates a manual refund-review ticket without automatically refunding the customer.",
    version: "1.0.0",
    owner: "billing-ops",
    risk: "high",
    requiresApproval: true,
    inputSchema: {
      type: "object",
      required: ["orderId", "reason"],
      additionalProperties: false,
      properties: {
        orderId: { type: "string", pattern: "^ORD-[0-9]{4,}$" },
        reason: { type: "string", minLength: 10 },
        evidenceUrls: { type: "array", items: { type: "string" } }
      }
    },
    exampleInput: {
      orderId: "ORD-10001",
      reason: "Customer reports duplicate purchase."
    }
  }
];

const report = validateToolRegistry(tools, {
  requireOwner: true,
  requireVersion: true
});

console.log(formatMarkdownContractReport(report));
console.log(JSON.stringify(createToolManifest(tools), null, 2));
