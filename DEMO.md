# Demo

Run:

```bash
node demo.mjs
```

It creates `data/demo/` and prints:

```text
approved
rejected
crashRecovery
records
offlineVerify
tamperDetected
exportDir
tamperedDir
```

Expected result:

```text
approved = completed
rejected = rejected
crashRecovery = ambiguous
offlineVerify = true
tamperDetected = true
```

Offline verification:

```bash
cd data/demo/export
node verify.mjs
```

Expected:

```json
{
  "ok": true,
  "errors": []
}
```

Tampered export:

```bash
cd data/demo/tampered
node verify.mjs
```

Expected:

```text
non-zero exit and errors
```

## What the demo proves

```text
approval is required before execution
rejection prevents execution
a crash during execution becomes ambiguous
the export verifies offline
a modified record is rejected by the verifier
```

## What it does not prove

```text
a real host hook
a third-party audit
a production sandbox
TPM anchoring
```