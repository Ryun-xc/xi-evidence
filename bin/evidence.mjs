#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const command = args[0] || 'help';
const base = String(process.env.XI_EVIDENCE_URL || 'http://127.0.0.1:8790').replace(/\/+$/, '');
const token = String(process.env.XI_EVIDENCE_TOKEN || readToken() || '');
const headers = { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) };

function readToken() {
  const file = process.env.XI_EVIDENCE_TOKEN_FILE || path.join(process.env.XI_EVIDENCE_DATA || 'data', 'token');
  try { return fs.readFileSync(file, 'utf8').trim(); } catch { return ''; }
}
try { process.stdout.write((await main()) + '\n'); process.exit(0); } catch (error) { process.stderr.write(String(error.message || error) + '\n'); process.exit(1); }
async function main() {
  if (command === 'help' || command === '--help') return usage();
  if (command === 'list') return call('/v1/proposals' + (args[1] ? `?state=${encodeURIComponent(args[1])}` : ''));
  if (command === 'status') return call(`/v1/transactions/${encodeURIComponent(args[1])}`);
  if (command === 'approve' || command === 'reject') {
    const tx = args[1];
    const options = parseOptions(args.slice(2));
    return call(`/v1/transactions/${encodeURIComponent(tx)}/${command}`, { method: 'POST', body: JSON.stringify({ approver: { id: options.approver || 'local', type: 'human' }, note: options.note || '' }) });
  }
  if (command === 'execute') return call(`/v1/transactions/${encodeURIComponent(args[1])}/execute`, { method: 'POST', body: '{}' });
  if (command === 'export') return call('/v1/export', { method: 'POST', body: JSON.stringify({ name: args[1] || Date.now() }) });
  throw new Error('unknown command: ' + command);
}
function parseOptions(parts) {
  const out = {};
  for (let i = 0; i < parts.length; i += 1) if (parts[i].startsWith('--')) { out[parts[i].slice(2)] = parts[i + 1] || ''; i += 1; }
  return out;
}
async function call(pathname, options = {}) {
  const res = await fetch(base + pathname, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return JSON.stringify(data, null, 2);
}
function usage() {
  return [
    'XI Evidence CLI',
    '',
    '  list [state]',
    '  status <transactionId>',
    '  approve <transactionId> [--approver name] [--note text]',
    '  reject <transactionId> [--approver name] [--note text]',
    '  execute <transactionId>',
    '  export [name]',
    '',
    'Env: XI_EVIDENCE_URL, XI_EVIDENCE_TOKEN, XI_EVIDENCE_DATA',
  ].join('\n');
}