# Production Checklist

Before using this pattern with real users:

- Review every high-risk and critical tool manually.
- Confirm approval gates are enforced at runtime, not only documented.
- Confirm tool implementations validate input again at runtime.
- Confirm sensitive data is not logged in full.
- Confirm tool names are stable and versioned.
- Confirm old traces or prompts are checked after breaking changes.
- Confirm provider-specific tool schemas are generated from reviewed contracts.
- Add tests for your own tool behavior, not only schema shape.
- Add rollback instructions for broken tool changes.
- Add human review for destructive, financial, privacy-sensitive, or external side-effect tools.
