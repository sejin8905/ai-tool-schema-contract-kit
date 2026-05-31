# Breaking Change Guide

This starter treats these as blocking changes:

- A tool was removed.
- An input property was removed.
- An input type changed.
- A new required input was added.
- Tool risk increased without approval enabled.

This is intentionally conservative. It is better to review a flagged change than silently ship a broken tool contract.

This checker does not understand every possible schema compatibility case. Review reports manually before relying on them in production.
