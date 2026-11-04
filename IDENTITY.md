# Approver identity

The default decision carries an actor label:

```json
{ "id": "alice", "type": "human" }
```

That is not cryptographic identity.

## Optional approver signature

An approver can sign the decision with an Ed25519 key:

```js
import { createApproverKey, signDecision } from './src/approver.mjs';
```

The signed payload is:

```text
transactionId
decision
note
approver
contextHash
```

`contextHash` is the SHA-256 of the canonical proposal.

The decision record stores:

```text
approverPublicKey
approverSignature
contextHash
```

If one is supplied, both must be supplied and the signature must verify.

## Why this matters

The service key proves the service wrote the record.

The approver key proves a separate key holder approved this specific context.

They are not the same trust root.

## Current limit

The approval console and CLI do not yet manage approver hardware keys.

There is no WebAuthn, SSO, revocation, or key rotation UI.

The optional signature is usable by an integration that already has a key.