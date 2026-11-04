# Status

## Local implementation

| Task | Status | Evidence |
|---|---|---|
| T-A1 vertical scenario | done | README first screen |
| T-A2 threat model | done | THREAT-MODEL.md |
| T-A3 trust anchor | done | Ed25519 + signed manifest + Git anchor; no TPM |
| T-A4 schema v1 | done | SCHEMA.md |
| T-A5 freeze xi-node | done | xi-node was not modified |
| T-B1 canonical JSON | done | src/canonical.mjs + test |
| T-B2 hash chain | done | src/ledger.mjs + test |
| T-B3 Ed25519 signatures | done | records + manifest |
| T-B4 append + fsync | done | append uses fsync |
| T-B5 export package | done | records, manifest, public key, verifier |
| T-B6 offline verifier | done | verify.mjs + verify-cli test |
| T-B7 tamper tests | done | modify/delete/reorder/truncate tests |
| T-B8 external anchor | done | Git anchor command + verifier; TPM/remote log optional |
| T-C1 state machine | done | evidence service |
| T-C2 WAL | done | append-only ledger before transitions |
| T-C3 ambiguous recovery | done | crash test |
| T-C4 risk classification | done | src/risk.mjs |
| T-C5 approval interface | done | CLI + local approval console + JSON API |
| T-identity approver signature | done | optional Ed25519 approver signature; no WebAuthn/SSO |
| T-C6 execution permit | done | permit.issued + execute |
| T-C7 result hashes | done | executor result |
| T-C8 reject path | done | evidence and crash tests |
| T-D1 host research | partial | reference contract; no live DSH hook verification |
| T-D2 DSH adapter | partial | src/host-adapter.mjs reference |
| T-D3 MCP proxy | done | src/mcp-server.mjs + test |
| T-D4 OpenClaw adapter | partial | interface adapter; live host not verified |
| T-D5 end-to-end demo | done | demo.mjs |
| T-D6 reproducible script | done | npm test / npm run demo |
| T-E1 network defaults | done | localhost + token; optional TLS cert/key |
| T-E2 clean environment verifier | done | verifier passed from a standalone export directory |
| T-E3 third-party audit | external | not attempted; AUDIT.md provides reproduction checklist |
| T-E4 real pilots | external | not attempted; PILOT.md provides pilot template |
| T-E5 governance | partial | GOVERNANCE.md and claims policy; second maintainer not appointed |
| T-E6 stop conditions | done | documented in EXTERNAL-GATES.md and GOVERNANCE.md |

## What is proven locally

```text
npm test passes
demo passes
offline verifier passes on valid export
tamper tests fail
crash during execution becomes ambiguous
no execution without approval/permit
```

## What is not proven

```text
live DSH host integration
OpenClaw integration
third-party security audit
real pilot usage
TPM / hardware root
external timestamp/anchor
```

## Honest status

```text
local evidence-layer prototype: complete
production release: not complete
external trust evidence: not complete
```