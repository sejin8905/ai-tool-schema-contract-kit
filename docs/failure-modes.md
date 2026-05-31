# Failure Modes

This is a small starter kit. It has important limits.

It can miss:

- Semantic tool behavior changes
- Provider-specific tool-calling quirks
- Runtime permission bugs
- Broken business logic inside the tool implementation
- Schema features outside this starter's small subset
- Unsafe prompts that call the correct tool for the wrong reason

It can false-positive:

- Intentional breaking changes
- Internal-only tools with short descriptions
- High-risk tools controlled by another approval system
- Schema changes that are safe in your specific app

Use the report as a review artifact, not as an automatic safety guarantee.
