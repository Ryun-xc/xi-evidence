# Specification v1

This document is the normative description of the evidence format.

## 1. Canonical JSON

```text
UTF-8
object keys sorted lexicographically
no whitespace between tokens
arrays preserve order
null, boolean, string, finite number, array, plain object only
```

## 2. Record

Required fields:

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

`hash`:

```text
SHA-256(canonical JSON of the record with hash and signature removed)
```

`signature`:

```text
Ed25519 over canonical JSON of the record with signature removed
```

The signature covers `hash`.

## 3. Chain

```text
sequence starts at 1 and is contiguous
first previousHash = 64 zeros
next previousHash = previous record hash
```

## 4. Manifest

```text
schemaVersion
generator
createdAt
recordCount
firstSequence
lastSequence
headHash
publicKeyFingerprint
anchor
signature
```

The signature covers every field except `signature`.

## 5. Export

```text
records.jsonl
manifest.json
public-key.pem
verify.mjs
README.txt
```

## 6. Verifier

Must verify without the service:

```text
manifest signature
public key fingerprint
record signature
record hash
sequence
previousHash
record count
headHash
optional expected head
```

## 7. State

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

`execution.started` without a terminal execution event after restart is `ambiguous`.

## 8. Compatibility

A future version must use a new `schemaVersion`; v1 verifiers must reject unknown versions.