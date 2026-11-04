# Security

## Defaults

```text
HTTP binds 127.0.0.1
every API route except /v1/health requires a token
token is stored in data/token with mode 600
ledger private key is stored in data/keys/private.pem with mode 600
export contains only the public key
no shell executor is registered by default
```

## Token

```text
XI_EVIDENCE_TOKEN environment variable
or data/token generated on first start
```

Do not put the token in a URL.

## Execution

The only built-in executor is:

```text
workspace.write
```

It refuses paths that escape the workspace.

There is no built-in:

```text
shell.exec
deploy
device.control
http.post
```

Those tools can be classified, but execution returns `no executor`.

## Public exposure

Before exposing beyond localhost:

```text
put TLS in front
use a random token
restrict network access
back up the data directory
rotate the signing key
add an external anchor
```

This repository is not a production deployment guide.

## Key compromise

If the private key is compromised:

```text
stop the service
preserve the data directory
publish the old public key fingerprint
rotate to a new key
re-export only new records
mark old records with the compromised key
```

Key rotation and revocation are not fully implemented in v0.1.

## Reporting

Do not put secrets in a public issue. Use a private channel agreed with the maintainer.