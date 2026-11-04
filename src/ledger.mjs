/** Append-only signed ledger. Each append is fsynced before the caller changes state. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { canonical, sha256 } from './canonical.mjs';
import { createKeys } from './keys.mjs';

const SCHEMA_VERSION = '1';

// A ledger never rewrites an existing line; sequence and previousHash form the chain.
export function createLedger({ file, keyDir, publicKeyFile = null }) {
  if (!file) throw new Error('ledger file required');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const keys = publicKeyFile
    ? loadPublicOnly(publicKeyFile)
    : createKeys({ dir: keyDir || path.join(path.dirname(file), 'keys') });
  const records = readJsonLines(file);
  if (records.length) verifyRecords(records, keys);
  return {
    file,
    keys,
    append,
    list: () => records.slice(),
    last: () => records[records.length - 1] || null,
    head: () => records.length ? records[records.length - 1].hash : genesisHash(),
    count: () => records.length,
  };

  function append(kind, transactionId, data, actor = { id: 'local', type: 'human' }) {
    const previous = records.length ? records[records.length - 1] : null;
    const unsigned = {
      schemaVersion: SCHEMA_VERSION,
      recordId: `rec_${crypto.randomUUID()}`,
      sequence: records.length + 1,
      previousHash: previous ? previous.hash : genesisHash(),
      createdAt: new Date().toISOString(),
      kind: String(kind),
      transactionId: String(transactionId),
      actor,
      data: data || {},
    };
    const hash = sha256(canonical(unsigned));
    const signed = { ...unsigned, hash };
    const signature = keys.sign(canonical(signed));
    const record = { ...signed, signature };
    const line = JSON.stringify(record) + '\n';
    const fd = fs.openSync(file, 'a');
    try {
      fs.writeSync(fd, line);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    records.push(record);
    return record;
  }
}

export function genesisHash() { return '0'.repeat(64); }

export function readJsonLines(file) {
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  return text.split('\n').filter(Boolean).map((line, i) => {
    try { return JSON.parse(line); } catch (error) { throw new Error(`invalid ledger line ${i + 1}: ${error.message}`); }
  });
}

export function verifyRecordSignature(record, publicKey) {
  const { signature, ...signed } = record;
  if (!signature) throw new Error('missing signature');
  if (!publicKey.verify(canonical(signed), signature)) throw new Error('invalid signature');
  const { hash, ...unsigned } = signed;
  if (hash !== sha256(canonical(unsigned))) throw new Error('invalid record hash');
  return true;
}

export function verifyRecords(records, keys) {
  let previousHash = genesisHash();
  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    if (record.schemaVersion !== SCHEMA_VERSION) throw new Error(`unsupported schema at record ${i + 1}`);
    if (record.sequence !== i + 1) throw new Error(`sequence gap at record ${i + 1}`);
    if (record.previousHash !== previousHash) throw new Error(`chain break at record ${i + 1}`);
    verifyRecordSignature(record, keys);
    previousHash = record.hash;
  }
  return true;
}

export function exportEvidence({ ledger, outDir }) {
  fs.mkdirSync(outDir, { recursive: true });
  const records = ledger.list();
  const file = path.join(outDir, 'records.jsonl');
  fs.writeFileSync(file, records.map((record) => JSON.stringify(record)).join('\n') + (records.length ? '\n' : ''), 'utf8');
  const publicKey = path.join(outDir, 'public-key.pem');
  fs.writeFileSync(publicKey, ledger.keys.publicPem, 'utf8');
  const manifest = {
    schemaVersion: SCHEMA_VERSION,
    generator: 'xi-evidence',
    createdAt: new Date().toISOString(),
    recordCount: records.length,
    firstSequence: records.length ? records[0].sequence : 0,
    lastSequence: records.length ? records[records.length - 1].sequence : 0,
    headHash: ledger.head(),
    publicKeyFingerprint: ledger.keys.fingerprint,
    anchor: null,
  };
  manifest.signature = ledger.keys.sign(canonical(manifest));
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  const verifierSource = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'verify.mjs'), 'utf8');
  fs.writeFileSync(path.join(outDir, 'verify.mjs'), verifierSource, 'utf8');
  fs.writeFileSync(path.join(outDir, 'README.txt'), [
    'XI Evidence export',
    '',
    'Files:',
    '  records.jsonl      append-only signed records',
    '  manifest.json      chain head, count, public key fingerprint',
    '  public-key.pem     Ed25519 public key',
    '  verify.mjs         offline verifier (no host, no database, no network)',
    '',
    'Run:',
    '  node verify.mjs',
    '',
    'The verifier checks:',
    '  schema, sequence, previousHash, record hash, Ed25519 signature, manifest count, headHash.',
    '',
    'Limits:',
    '  A local signing key can only show that the holder signed the record.',
    '  It does not prove that the host or operator was honest at capture time.',
    '  Anchor manifest.headHash externally if you need truncation/replacement resistance.',
  ].join('\n') + '\n');
  return { outDir, manifest, records };
}

function loadPublicOnly(file) {
  const pem = fs.readFileSync(file, 'utf8');
  const publicKey = crypto.createPublicKey(pem);
  const fingerprint = crypto.createHash('sha256').update(publicKey.export({ type: 'spki', format: 'der' })).digest('hex');
  return {
    publicKey,
    publicPem: pem,
    fingerprint,
    sign() { throw new Error('read-only ledger cannot sign'); },
    verify(bytes, signature) { return crypto.verify(null, Buffer.from(bytes), publicKey, Buffer.from(signature, 'base64')); },
  };
}