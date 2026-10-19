---
name: verification-loop
description: Run the WhoRuled quality gate (lint, typecheck, tests, build, diff review) before declaring work done or opening a PR.
---
<!-- Adapted from worldflowai/everything-claude-code (MIT). -->
# Verification loop

Run in order; stop and fix on the first failure. Report only results actually observed.

1. `npm run lint`
2. `npm run typecheck`
3. `npm test`
4. `npm run build`
5. Review `git diff --stat` and the diff itself: unrelated edits, missing error handling, edge cases, new dependencies (need justification), secrets.
6. Never mark a task done, or say tests passed, without having run them.

Report format: Lint / Types / Tests / Build / Diff, each PASS or FAIL with counts, then READY or NOT READY.
