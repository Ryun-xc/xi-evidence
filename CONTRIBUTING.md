# Contributing

## Scope

XI Evidence is a focused evidence layer, not a general agent runtime.

Before proposing a feature, ask:

```text
does it improve approval evidence, execution safety, or independent verification?
```

## Setup

```bash
npm test
npm run demo
```

Python is optional for the independent verifier:

```bash
python -m pip install cryptography
python sdk/python/verify.py data/demo/export
```

## Rules

```text
do not commit data/, keys, tokens, or exports
do not add shell execution without a sandbox design
do not weaken the state machine
do not claim compliance or tamper-proof guarantees
add a test for every new security behavior
```

## Security

Report vulnerabilities privately. Do not include secrets in a public issue.

## License

Contributions are accepted under Apache-2.0.