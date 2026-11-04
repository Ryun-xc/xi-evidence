# MCP (Cursor single-point)

## Start

```bash
npx -y xi-evidence-mcp
```

It starts an in-process local sidecar on a random localhost port and writes a private control file at:

```text
~/.xi-evidence/mcp-control.json
```

No database, URL, token, or separate sidecar is required.

## Cursor config

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

## Model-facing tools

```text
xi_guard
xi_status
xi_export
xi_verify
```

There is intentionally no `approve`, `reject`, or `execute` tool.

## Human-facing CLI

```bash
npx xi-evidence-mcp list
npx xi-evidence-mcp status <transactionId>
npx xi-evidence-mcp approve <transactionId> --approver alice
npx xi-evidence-mcp reject <transactionId> --approver alice
npx xi-evidence-mcp export
npx xi-evidence-mcp verify <export-dir>
```

The CLI reads the control file written by the MCP process.

## Guard result

```json
{
  "transactionId": "tx_...",
  "state": "awaiting_approval",
  "decision": "require_approval",
  "risk": {
    "level": "high",
    "reasons": ["recursive delete"],
    "reversible": false,
    "blastRadius": "host"
  },
  "approvalCommand": "npx xi-evidence-mcp approve tx_..."
}
```

`xi_guard` never executes and never approves.

## Default coding rules

```text
git status / git diff / ls / cat / rg / tests → allow
workspace.write                               → require approval
rm -rf build                                  → require approval
rm -rf / / ~ / *                              → deny
git reset --hard                              → require approval
git clean -fdx                                → require approval
git push --force                              → require approval
curl ... | sh                                 → deny
chmod 777                                     → require approval
docker system prune                           → require approval
DROP TABLE / TRUNCATE                         → deny
.env / id_rsa / secrets                       → deny
unknown tool                                  → high
```

## Critical limitation

MCP is not a pre-tool hook.

It cannot automatically stop a native Cursor shell command.

The model must call `xi_guard`, or execution must be routed through a controlled tool. Do not claim automatic interception without a host hook.

If the model can run arbitrary shell commands, it can also run the CLI `approve` command. This is not a security boundary. A real human approval channel must be outside the model's shell (separate terminal/UI/device or host-enforced policy).

## Acceptance

```text
npx starts without sidecar/token
tools/list has exactly four tools
no approve/execute tools
rm -rf build returns approval
git status returns allow
human CLI approval changes state
xi_export writes a signed package
xi_verify passes on valid export
tampered export fails
```