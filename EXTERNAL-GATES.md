# External Gates

These are intentionally not marked complete by local tests.

## G1 — Live DSH integration

Required evidence:

```text
real DSH pre-tool hook pauses the tool
transaction appears awaiting_approval
approval issues a permit
host executes only with permit
host result is recorded
```

Current: reference adapter/contract only.

## G2 — OpenClaw adapter

Current: interface only.

## G3 — Independent security audit

An unrelated security/compliance reviewer must inspect:

```text
threat model
canonical JSON
signature and hash chain
manifest signature
WAL/crash recovery
permit enforcement
export artifacts
```

Publish findings and dispositions.

## G4 — Real pilots

At least 2–3 users must run the approval loop on real changes without exposing secrets.

## G5 — Clean machine verification

Run the exported verifier on a machine with no repository, no service, and no database.

## G6 — External anchor

Implemented as an optional Git anchor:

```text
node bin/anchor.mjs anchor --export <dir> --repo <anchor-repo>
node bin/anchor.mjs verify --export <dir> --repo <anchor-repo>
```

For higher assurance, push the anchor repo to a remote or add RFC3161/transparency log/TPM. A purely local anchor is only a local trust point.

Until then, the export detects modification but not replacement by an older valid export.