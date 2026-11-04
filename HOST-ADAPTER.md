# Host Adapter

## Contract

A host adapter needs four events:

```text
propose(tool, args, intent, actor)
before_execute(transactionId) → permit
execute_under_permit(permit)
record_result(transactionId, result)
```

The evidence layer must be on the execution path, not called only after execution.

## DeepSeek Harness reference

Expected flow:

```text
1. Agent requests a tool call.
2. DSH pre-tool hook sends tool/args/intent to XI Evidence.
3. XI Evidence returns transactionId, risk, and requiresApproval.
4. If approval is required, DSH pauses.
5. Human approves in XI Evidence.
6. DSH obtains a short-lived permit.
7. DSH executes.
8. DSH posts the result hash/result to XI Evidence.
```

This repository provides the reference adapter:

```text
src/host-adapter.mjs
```

A live DSH integration requires the actual pre-tool hook API and is not claimed as verified here. The adapter is a contract and a testable reference, not a DSH plugin release.

## MCP path

The sidecar can be used through the MCP adapter:

```text
Host → MCP tools → HTTP sidecar → evidence service
```

Tools:

```text
evidence_propose
evidence_status
evidence_approve
evidence_reject
evidence_permit
evidence_execute
```

The MCP adapter does not bypass the state machine.

## Failure policy

If the host cannot pause before execution:

```text
do not call it an approval layer
use the MCP/proxy path
or move the action behind an executor controlled by the evidence layer
```

Do not record an approval after the host already executed.