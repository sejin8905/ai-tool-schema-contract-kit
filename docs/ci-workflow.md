# CI Workflow

The included GitHub Actions workflow shows a simple pattern:

```bash
npm ci
npm test
npm run typecheck
npm run build
npm run cli:diff
```

In a real app, store the previous registry fixture in your repository and compare it with the current registry before release.

Do not treat a passing CI check as proof that the agent is safe. Treat it as a local contract sanity check.
