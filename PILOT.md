# Pilot Plan

This is a local pilot template. It is not a claim that a real pilot has happened.

## Candidate

```text
small AI coding team
staging or low-risk production changes
no customer secrets in the evidence export
```

## Install

```text
run sidecar on localhost
install host adapter or MCP tools
keep workspace execution behind approval
```

## Measure

```text
approval latency
rejection rate
ambiguous executions
offline verification success
number of tamper tests caught
```

## Exit criteria

```text
at least one real approval
at least one real rejection
one exported package verified by a second person
no secret in the export
```

## Stop conditions

```text
host cannot pause before execution
approver identity is only a typed name
export contains secrets
recovery cannot distinguish executed/not executed
```