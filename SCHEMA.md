# Evidence Schema v1

## Record

```json
{
  "schemaVersion": "1",
  "recordId": "rec_<uuid>",
  "sequence": 1,
  "previousHash": "<64 hex>",
  "createdAt": "2026-11-04T00:00:00.000Z",
  "kind": "proposal | decision | permit.issued | execution.started | execution.completed | execution.failed | execution.ambiguous",
  "transactionId": "tx_<uuid>",
  "actor": { "id": "alice", "type": "human" },
  "data": {},
  "hash": "<64 hex>",
  "signature": "<base64 Ed25519>"
}
```

## Hash

```text
canonical = deterministic JSON with lexicographically sorted object keys
hash = SHA-256(canonical(record without hash and signature))
```

## Signature

```text
signature = Ed25519(canonical(record without signature))
```

The signature covers the hash and all preceding fields.

## Chain

```text
record[1].previousHash = 64 zeros
record[n].previousHash = record[n-1].hash
sequence is continuous from 1
```

## Manifest

```json
{
  "schemaVersion": "1",
  "generator": "xi-evidence",
  "createdAt": "...",
  "recordCount": 11,
  "firstSequence": 1,
  "lastSequence": 11,
  "headHash": "...",
  "publicKeyFingerprint": "...",
  "anchor": null,
  "signature": "<base64 Ed25519>"
}
```

The manifest signature covers every field except `signature`.

## Canonical JSON

Supported values:

```text
null, boolean, string, finite number, array, plain object
```

Rules:

```text
object keys sorted
no undefined values
no NaN / Infinity
UTF-8 strings preserved
```

## Transaction state

```text
proposed
awaiting_approval
approved
rejected
executing
completed
failed
ambiguous
```

## Kinds

```text
proposal
decision
permit.issued
execution.started
execution.completed
execution.failed
execution.ambiguous
```