[中文](README.md)

# XI Evidence

Local-first verifiable governance evidence layer for AI tool calls.

```text
Status: developer preview (v0.2.0)
Not production-ready. Not audited. No live host integration claimed.
```

```text
AI host proposes a tool call
→ XI Evidence classifies risk
→ human approves or rejects
→ host executes under a short-lived permit
→ result is recorded
→ append-only signed evidence
→ offline verifier
```

This is not a general agent runtime. It is a small sidecar for one job:

```text
prove who approved what, when, and whether the exported record was modified.
```

---

## What problem it solves

AI coding agents can run commands, edit files, and deploy software.

A normal log answers:

```text
something happened
```

XI Evidence answers:

```text
who proposed it
what risk was identified
who approved or rejected it
what execution was permitted
what result hash was recorded
whether the exported chain is intact
```

---

## Scope

### First vertical

```text
AI coding agent production-change approval
```

### First host

```text
DeepSeek Harness (reference adapter contract)
```

OpenClaw is a later adapter, not a first-phase commitment.

### Not included

```text
general agent runtime
QQ / WeChat / DingTalk channel adapter
browser automation
plugin marketplace
model marketplace
multi-tenant SaaS
shell execution in the evidence process
```

---

## Architecture

```text
Host / MCP client
      │
      ▼
XI Evidence HTTP sidecar
  ├─ proposal API
  ├─ risk policy
  ├─ approval state machine
  ├─ execution permit
  ├─ workspace executor (demo)
  ├─ append-only ledger
  ├─ Ed25519 signatures
  ├─ export
  └─ MCP adapter

      │
      ▼
export/
  records.jsonl
  manifest.json
  public-key.pem
  verify.mjs
  README.txt
```

The ledger is the WAL. A record is appended and fsynced before a state transition. A crash between `execution.started` and `execution.completed` becomes `ambiguous`, never silently retried.

---

## Trust model

The verifier trusts:

```text
the Ed25519 public key fingerprint distributed out of band
```

The verifier does not trust:

```text
the xi-evidence process
the host
the database
the network
```

The verifier can prove:

```text
records are internally consistent
records were signed by the matching key
the manifest and records were not modified after signing
```

The verifier cannot prove, without an external anchor:

```text
the signer was honest at capture time
an earlier valid export was not substituted
the host reported the truth
```

See [THREAT-MODEL.md](THREAT-MODEL.md).

---

## Quick start

Requires Node.js 20+.

```bash
npm test
npm run demo
npm run anchor
```

The demo creates:

```text
data/demo/export/       valid export
data/demo/tampered/     modified export that must fail verification
```

Run the offline verifier:

```bash
cd data/demo/export
node verify.mjs
```

Start the sidecar:

```bash
XI_EVIDENCE_DATA=./data node src/server.mjs
```

Approval console:

```text
http://127.0.0.1:8790/
```

Paste the token from `data/token`. The console shows proposal, risk, decision, and execution context.

CLI:

```bash
node bin/evidence.mjs list
node bin/evidence.mjs status <transactionId>
node bin/evidence.mjs approve <transactionId> --approver alice
node bin/evidence.mjs execute <transactionId>
```

Token:

```text
data/token
```

Bind defaults to `127.0.0.1`. Do not expose it publicly.

---

## API

```text
GET  /v1/health
GET  /v1/proposals
POST /v1/proposals
GET  /v1/transactions/:id
POST /v1/transactions/:id/approve
POST /v1/transactions/:id/reject
POST /v1/transactions/:id/permit
POST /v1/transactions/:id/execute
GET  /v1/records
POST /v1/export
```

All routes except `/v1/health` require:

```text
Authorization: Bearer <token>
```

or:

```text
x-evidence-token: <token>
```

---

## MCP (Cursor single-point)

No separate sidecar, URL, or token:

```bash
npx -y xi-evidence-mcp
```

Cursor config:

```json
{
  "mcpServers": {
    "xi-evidence": {
      "command": "npx",
      "args": ["-y", "xi-evidence-mcp"]
    }
  }
}
```

The model only sees:

```text
xi_guard
xi_status
xi_export
xi_verify
```

There is no approve, reject, or execute tool.

Human approval:

```bash
npx xi-evidence-mcp list
npx xi-evidence-mcp status <id>
npx xi-evidence-mcp approve <id>
npx xi-evidence-mcp reject <id>
npx xi-evidence-mcp export
npx xi-evidence-mcp verify <dir>
```

`xi_guard` classifies risk and creates an evidence transaction. It never approves or executes.

### Important limit

MCP is not a host hook.

It cannot automatically intercept Cursor's native shell.

Only an explicit `xi_guard` call, or execution through controlled tools, provides approval protection.

If the model can run arbitrary shell commands, it can also invoke the `approve` CLI. A real approval boundary must live outside the model shell.

See [MCP.md](MCP.md).
---

## Risk policy

```text
read-only tools       → allow
workspace.write       → require approval
shell.exec / deploy   → require approval or deny
device.control        → deny
unknown tools         → high risk
```

The model may suggest risk, but the deterministic policy and the human decide.

---

## State machine

```text
proposed
→ awaiting_approval
→ approved
→ executing
→ completed / failed / rejected / ambiguous
```

Rules:

```text
no execution without approved
no execution without a permit
started without completed after restart → ambiguous
no blind retry
```

---

## Evidence format

See [SCHEMA.md](SCHEMA.md).

Each record:

```text
schemaVersion
recordId
sequence
previousHash
createdAt
kind
transactionId
actor
data
hash
signature
```

Export package:

```text
records.jsonl
manifest.json
public-key.pem
verify.mjs
README.txt
```

---

## SDK

Node client:

```js
import { EvidenceClient } from './sdk/node.mjs';
const client = new EvidenceClient({ baseUrl: 'http://127.0.0.1:8790', token: process.env.XI_EVIDENCE_TOKEN });
```

Independent Python verifier:

```bash
python sdk/python/verify.py data/demo/export
```

## Tests

```text
canonical JSON
ledger chain and signatures
risk policy
approval/execute flow
crash recovery → ambiguous
tamper detection
HTTP sidecar
host adapter
offline verifier CLI
MCP adapter
```

Run:

```bash
npm test
```

---

## Current status

```text
Gate A  trust model / schema       completed locally
Gate B  signed ledger / verifier   completed locally
Gate C  WAL / risk / permit / UI   completed locally
Gate D  HTTP + reference adapters  completed locally
Gate E  external audit / pilots    not attempted
```

External gates are not faked:

```text
no third-party security audit
no real pilot user
no live DSH host integration verified
no TPM / hardware root
no public deployment
```

The DSH adapter is a reference contract. A live host integration requires the host's actual pre-tool hook API and a separate acceptance run.

---

## What this is not

```text
not production-ready
not compliance-certified
not tamper-proof without an external anchor
not a replacement for the host's own sandbox
not a general-purpose agent platform
```

---

## Documents

```text
THREAT-MODEL.md
SCHEMA.md
SECURITY.md
HOST-ADAPTER.md
DEMO.md
ANCHOR.md
IDENTITY.md
SPEC.md
evidence.schema.json
AUDIT.md
PILOT.md
STATUS.md
EXTERNAL-GATES.md
GOVERNANCE.md
CONTRIBUTING.md
CHANGELOG.md
```

---

## License

Apache-2.0

Copyright 2026 周润程 (Runcheng Zhou)