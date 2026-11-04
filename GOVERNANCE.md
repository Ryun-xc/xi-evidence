# Governance

## Current maintainer

```text
Runcheng Zhou
```

This is a single-maintainer project at v0.1. That is a risk, not a feature.

## Second maintainer

A second maintainer with commit/release access is required before calling this a stable public project.

Acceptance:

```text
named person
review access
release checklist agreed
security disclosure path agreed
```

Status: not appointed.

## License neutrality

The project is Apache-2.0. The maintainer will not add a proprietary license to the core evidence format or verifier.

## Releases

```text
main = development
tag = frozen release
release note must state known gaps
no release may claim compliance certification
```

## Security disclosure

Do not put secrets in public issues.

Until a private channel exists, report only the affected component and a reproduction without secrets.

## Contribution boundary

Changes that alter execution, network exposure, key handling, or the evidence schema require review before merge.

## Claims

Allowed:

```text
evidence prepared for external review
signed append-only records
offline verification
```

Not allowed without external work:

```text
compliant
certified
tamper-proof
production-ready
trusted execution
```