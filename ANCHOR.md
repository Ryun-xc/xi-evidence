# Git Anchor

The manifest is signed, but a signed export can be replaced with an older valid export.

The Git anchor gives the head an external ordering point.

```bash
node bin/anchor.mjs anchor --export data/demo/export --repo data/anchor
node bin/anchor.mjs verify --export data/demo/export --repo data/anchor
```

The anchor repo stores `anchor.json` with:

```text
headHash
recordCount
publicKeyFingerprint
exportedAt
anchoredAt
```

The verifier reads `git show HEAD:anchor.json` and compares it with the export manifest.

This protects against a rewritten ledger only if the anchor repo is stored somewhere the attacker does not control. A local anchor is still only a local trust point. For stronger anchoring:

```text
push the anchor repo to a remote
or use RFC3161
or use a transparency log
```

`anchor.json` does not include the private key.