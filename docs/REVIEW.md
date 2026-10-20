# Recording a review (ADR-019)

A page is indexable when every claim on it has a source (the schema enforces this). A recorded `review` adds a "Reviewed by" badge but is not required to publish. The agent never writes one.

## Guard check

`.github/workflows/review-guard.yml` runs `pipeline/review-guard.ts` from the base branch on every pull request.
If the pull request changes any `review` record, or touches `.github/`, `.claude/`, `src/data/` or `CLAUDE.md`, every
commit in it must show GitHub's "Verified" badge. The agent holds no signing key, so it cannot satisfy this.

## One-time setup (owner)

1. Create an SSH signing key and add it on GitHub under Settings → SSH and GPG keys → New SSH key, type "Signing Key".
2. `git config gpg.format ssh && git config user.signingkey ~/.ssh/<key>.pub && git config commit.gpgsign true`
3. Make the check required: repository Settings → Rules → the `main` ruleset → required status checks → add `guard`.
   Until then it reports a failure but does not block merging.

## Recording a review

On a branch, add to the polity's JSON: `"review": {"by": "<you>", "date": "YYYY-MM-DD", "contentHash": "<64 hex>"}`,
commit with your signing key and open a pull request. The `contentHash` format is checked by the schema
(`src/data/schema.ts`); computing and verifying it against page content is not built yet.
