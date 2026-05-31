# AI Tool Schema Contract Kit

Free TypeScript starter kit for checking AI tool definitions before agents use them.

Use it to sanity-check tool names, input schemas, output examples, risk metadata, approval requirements, and breaking contract changes.

This is source code, not a hosted SaaS.

## What This Helps You Check

- Duplicate or invalid tool names
- Missing descriptions, owners, versions, or examples
- High-risk tools without approval enabled
- JSON-schema-like input and output examples
- Required fields that are not defined in schema properties
- Breaking changes between previous and current tool registries
- Markdown or JSON reports for local review and CI

## What This Is Not

- Not a full JSON Schema validator
- Not an OpenAPI replacement
- Not a complete agent security system
- Not a compliance, privacy, or safety certification tool
- Not a provider-native tool-calling validator replacement
- Not a guarantee that AI agents will use tools correctly

## Quickstart

```bash
npm install
npm test
npm run typecheck
npm run build
npm run dev
npm run demo:fail
npm run demo:diff
```

Run the CLI against the sample registry:

```bash
npm run cli:pass
npm run cli:diff
```

## Basic Usage

```ts
import { validateToolRegistry } from "ai-tool-schema-contract-kit";

const report = validateToolRegistry(tools, {
  requireOwner: true,
  requireVersion: true,
  approvalRequiredForRisks: ["high", "critical"]
});

if (report.status === "fail") {
  throw new Error("Tool registry has blocking contract issues.");
}
```

## Included

- TypeScript tool contract checker
- Small JSON-schema-like value validator
- Approval policy checks for high-risk tools
- Duplicate tool-name detection
- Missing metadata checks
- Example input and output validation
- Breaking-change diff checker
- Markdown and JSON report helpers
- CLI runner
- Passing, failing, and diff demos
- JSON tool registry fixtures
- Next.js route reference
- GitHub Actions workflow reference
- Vitest test suite
- Docs, buyer checklist, package contents, MIT license, and refund policy

## Requirements

- Node.js 20 or newer recommended
- npm
- Basic TypeScript knowledge
- No AI provider API key required

## Safety Notes

This kit helps you review tool contracts before they reach your agent runtime. It does not prove that an AI agent will behave safely, call the right tool, or comply with your internal policies.

Review, test, and adapt the code before using it with real users, production data, regulated workflows, destructive tools, payments, or high-risk actions.

## License

MIT License. You may use and adapt this free kit for personal, internal, commercial, or client projects.

Do not imply ArchiNode certifies, reviews, operates, or monitors your production agent workflow.
