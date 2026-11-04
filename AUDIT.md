# Audit Checklist

An independent reviewer should be able to reproduce this without trusting the maintainer.

## Read

```text
THREAT-MODEL.md
SPEC.md
SCHEMA.md
SECURITY.md
HOST-ADAPTER.md
```

## Run

```bash
npm test
npm run demo
node bin/anchor.mjs anchor --export data/demo/export --repo data/demo/anchor
node bin/anchor.mjs verify --export data/demo/export --repo data/demo/anchor
cd data/demo/export && node verify.mjs
python sdk/python/verify.py .
```

## Attack cases

```text
modify a record field
delete a record
reorder records
truncate the tail
change manifest.recordCount
change manifest.headHash
replace the export with an older valid export
forge an approval without the approver key
execute without approval
execute after permit expiry
crash between execution.started and execution.completed
```

## Questions

```text
Does the verifier trust the service?
Does the manifest signature cover the head?
What happens without an external anchor?
Can an approver signature be replayed to another context?
Is the private key excluded from export?
Can the host bypass the pre-tool hook?
```

## Report

```text
finding
severity
reproduction
affected files
disposition
```