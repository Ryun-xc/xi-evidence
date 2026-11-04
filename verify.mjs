#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function canonical(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') { if (!Number.isFinite(value)) throw new Error('non-finite number'); return JSON.stringify(value); }
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (typeof value === 'object') {
    const keys = Object.keys(value).filter((key) => value[key] !== undefined).sort();
    return '{' + keys.map((key) => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  }
  throw new Error('unsupported value');
}
function sha256(value) { return crypto.createHash('sha256').update(typeof value === 'string' ? value : canonical(value), 'utf8').digest('hex'); }

export function verifyExport(dir = '.') {
  const errors = [];
  const recordsFile = path.join(dir, 'records.jsonl');
  const manifestFile = path.join(dir, 'manifest.json');
  const publicFile = path.join(dir, 'public-key.pem');
  for (const file of [recordsFile, manifestFile, publicFile]) if (!fs.existsSync(file)) errors.push(`missing ${path.basename(file)}`);
  if (errors.length) return { ok: false, errors, checks: {} };
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  const publicKey = crypto.createPublicKey(fs.readFileSync(publicFile, 'utf8'));
  const { signature: manifestSignature, ...manifestUnsigned } = manifest;
  if (!manifestSignature || !crypto.verify(null, Buffer.from(canonical(manifestUnsigned)), publicKey, Buffer.from(manifestSignature, 'base64'))) errors.push('manifest signature invalid');
  const fingerprint = crypto.createHash('sha256').update(publicKey.export({ type: 'spki', format: 'der' })).digest('hex');
  if (manifest.publicKeyFingerprint !== fingerprint) errors.push('public key fingerprint mismatch');
  const records = fs.readFileSync(recordsFile, 'utf8').replace(/^\uFEFF/, '').split('\n').filter(Boolean).map((line) => JSON.parse(line));
  let previousHash = '0'.repeat(64);
  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    const expected = i + 1;
    if (record.sequence !== expected) errors.push(`record ${expected}: sequence mismatch`);
    if (record.previousHash !== previousHash) errors.push(`record ${expected}: previousHash mismatch`);
    const { signature, ...signed } = record;
    const { hash, ...unsigned } = signed;
    if (!signature) errors.push(`record ${expected}: missing signature`);
    else if (!crypto.verify(null, Buffer.from(canonical(signed)), publicKey, Buffer.from(signature, 'base64'))) errors.push(`record ${expected}: invalid signature`);
    if (hash !== sha256(canonical(unsigned))) errors.push(`record ${expected}: invalid hash`);
    previousHash = record.hash;
  }
  if (manifest.recordCount !== records.length) errors.push('record count mismatch');
  if (records.length && manifest.headHash !== records[records.length - 1].hash) errors.push('head hash mismatch');
  if (!records.length && manifest.headHash !== '0'.repeat(64)) errors.push('empty head mismatch');
  const expectIndex = process.argv.indexOf('--expect-head');
  const expectHead = expectIndex >= 0 ? process.argv[expectIndex + 1] : null;
  if (expectHead && expectHead !== manifest.headHash) errors.push('expected head does not match manifest head');
  const checks = { records: records.length, head: manifest.headHash, fingerprint: manifest.publicKeyFingerprint, expectedHead: expectHead || null };
  return { ok: errors.length === 0, errors, checks };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2);
  const dir = args[0] && !args[0].startsWith('--') ? args[0] : '.';
  const result = verifyExport(dir);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}