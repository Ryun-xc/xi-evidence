#!/usr/bin/env python3
"""Independent Python verifier for an XI Evidence export.

This intentionally does not import the Node implementation.
"""
import base64
import hashlib
import json
import sys
from pathlib import Path

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'))


def sha256(value):
    return hashlib.sha256(value.encode('utf-8')).hexdigest()


def verify(export_dir):
    root = Path(export_dir)
    errors = []
    try:
        manifest = json.loads((root / 'manifest.json').read_text(encoding='utf-8'))
        records = [json.loads(line) for line in (root / 'records.jsonl').read_text(encoding='utf-8').splitlines() if line]
        public_key = serialization.load_pem_public_key((root / 'public-key.pem').read_bytes(), backend=default_backend())
    except Exception as error:
        return {'ok': False, 'errors': [str(error)], 'checks': {}}
    if not isinstance(public_key, Ed25519PublicKey):
        errors.append('public key is not Ed25519')
        return {'ok': False, 'errors': errors, 'checks': {}}
    fingerprint = hashlib.sha256(public_key.public_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )).hexdigest()
    if manifest.get('publicKeyFingerprint') != fingerprint:
        errors.append('public key fingerprint mismatch')
    manifest_signature = manifest.pop('signature', None)
    if not manifest_signature:
        errors.append('manifest signature missing')
    else:
        try:
            public_key.verify(base64.b64decode(manifest_signature), canonical(manifest).encode('utf-8'))
        except Exception:
            errors.append('manifest signature invalid')
    previous = '0' * 64
    for index, record in enumerate(records):
        expected = index + 1
        if record.get('sequence') != expected:
            errors.append(f'record {expected}: sequence mismatch')
        if record.get('previousHash') != previous:
            errors.append(f'record {expected}: previousHash mismatch')
        signature = record.pop('signature', None)
        signed = record.copy()
        record_hash = signed.get('hash')
        unsigned = {key: value for key, value in signed.items() if key != 'hash'}
        if not signature:
            errors.append(f'record {expected}: signature missing')
        else:
            try:
                public_key.verify(base64.b64decode(signature), canonical(signed).encode('utf-8'))
            except Exception:
                errors.append(f'record {expected}: signature invalid')
        if record_hash != sha256(canonical(unsigned)):
            errors.append(f'record {expected}: hash invalid')
        record['signature'] = signature
        previous = record_hash
    if manifest.get('recordCount') != len(records):
        errors.append('record count mismatch')
    if records and manifest.get('headHash') != records[-1].get('hash'):
        errors.append('head hash mismatch')
    if not records and manifest.get('headHash') != '0' * 64:
        errors.append('empty head mismatch')
    return {
        'ok': not errors,
        'errors': errors,
        'checks': {'records': len(records), 'head': manifest.get('headHash'), 'fingerprint': fingerprint},
    }


if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else '.'
    result = verify(target)
    print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
    sys.exit(0 if result['ok'] else 1)