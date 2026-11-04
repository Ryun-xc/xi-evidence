# Threat Model

## Assets

```text
proposal records
approval decisions
execution results
signing private key
export package
host tool arguments and outputs
```

## Actors

```text
host / agent
human approver
local operator
remote attacker
malicious insider
auditor
```

## Trust boundary

```text
Host proposes; does not automatically approve.
XI Evidence classifies and records; does not silently execute.
Human decides.
Verifier trusts the public key fingerprint, not the service.
```

## Threats and mitigations

| Threat | Mitigation | Residual risk |
|---|---|---|
| Edit a record | Ed25519 signature + record hash | key holder can sign anything |
| Delete/reorder/truncate records | sequence + previousHash + signed manifest | replacing with an older valid export requires anchor |
| Edit manifest | manifest signature | same key compromise |
| Forge approval | signed decision, approver identity in record | no external identity provider |
| Execute without approval | state machine + permit + executor check | host may bypass the sidecar |
| Execute twice | started/completed state + process lock | concurrent writers need an OS lock |
| Crash during execution | `ambiguous`, no blind retry | exact external effect may be unknown |
| Key theft | file mode 600; DPAPI/OS storage later | no TPM in MVP |
| Host lies about result | result hash recorded | needs host attestation to prove source |
| Network exposure | localhost default + token | no TLS in MVP |

## Explicit non-guarantees

```text
No guarantee that the signer was honest.
No guarantee that the host executed exactly what it reported.
No guarantee against a compromised OS or stolen private key.
No guarantee of completeness without an external head anchor.
No regulatory compliance certification.
```

## External anchor

The MVP can export a signed manifest head. For stronger replacement/truncation resistance:

```text
write headHash into a Git commit
or request an RFC3161 timestamp
or append to a transparency log
or seal the key in TPM / secure enclave
```

The anchor is optional and is not implemented as a network service in this version.

## Audit questions

```text
Can the auditor verify without running XI Evidence?
Can the auditor detect a changed field?
Can the auditor detect a deleted last record?
Can the auditor detect a replaced older export?
Can the auditor identify the approver and time?
Can the auditor see whether execution was ambiguous?
```