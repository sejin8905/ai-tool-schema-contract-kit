# Tool Contract Design

A useful AI tool contract should make the tool understandable before an agent uses it.

Recommended fields:

- `name`: stable machine-readable name
- `description`: clear human-readable behavior
- `version`: contract version
- `owner`: team or person responsible for changes
- `risk`: low, medium, high, or critical
- `requiresApproval`: whether human or policy approval is required
- `inputSchema`: JSON-schema-like input shape
- `outputSchema`: optional output shape
- `exampleInput`: realistic example
- `exampleOutput`: optional output example

Keep names stable. Changing names breaks callers, tests, docs, and previous traces.

Use approval requirements for tools that can create tickets, send messages, spend money, delete data, update accounts, trigger external actions, or expose private information.
