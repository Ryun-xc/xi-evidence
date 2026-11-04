#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { verifyExport } from '../verify.mjs';

const argv = process.argv.slice(2);
const dataIndex = argv.indexOf('--data');
const explicitData = dataIndex >= 0 ? argv[dataIndex + 1] : null;
if (explicitData) process.env.XI_EVIDENCE_DATA = path.resolve(explicitData);
const dataDir = path.resolve(process.env.XI_EVIDENCE_DATA || path.join(os.homedir(), '.xi-evidence'));
const command = argv[0] || 'mcp';
const controlFile = path.join(dataDir, 'mcp-control.json');

if (command === 'mcp' || command === 'serve' || command === '--mcp') {
  await import('../src/mcp-server.mjs');
} else {
  await runCli();
}

async function runCli() {
  if (command === 'help' || command === '--help') return print(usage());
  if (command === 'where') return print(JSON.stringify({ dataDir, controlFile, exists: fs.existsSync(controlFile) }, null, 2));
  const control = readControl();
  if (command === 'verify') {
    const result = verifyExport(path.resolve(argv[1] || '.'));
    print(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
    return;
  }
  if (command === 'list') return print(JSON.stringify(await request('/v1/proposals'), null, 2));
  if (command === 'status') return print(JSON.stringify(await request(`/v1/transactions/${encodeURIComponent(argv[1])}`), null, 2));
  if (command === 'approve' || command === 'reject') {
    const options = parseOptions(argv.slice(2));
    return print(JSON.stringify(await request(`/v1/transactions/${encodeURIComponent(argv[1])}/${command}`, { method: 'POST', body: JSON.stringify({ approver: { id: options.approver || 'local-human', type: 'human' }, note: options.note || '' }) }), null, 2));
  }
  if (command === 'export') return print(JSON.stringify(await request('/v1/export', { method: 'POST', body: JSON.stringify({ name: argv[1] || '' }) }), null, 2));
  throw new Error(`unknown command: ${command}\n\n${usage()}`);
}

function readControl() {
  if (!fs.existsSync(controlFile)) throw new Error('MCP control is not running. Start `npx xi-evidence-mcp` first.');
  return JSON.parse(fs.readFileSync(controlFile, 'utf8'));
}
async function request(pathname, options = {}) {
  const control = readControl();
  const res = await fetch(control.url + pathname, { ...options, headers: { 'content-type': 'application/json', authorization: `Bearer ${control.token}`, ...(options.headers || {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body;
}
function parseOptions(parts) {
  const out = {};
  for (let i = 0; i < parts.length; i += 1) if (parts[i].startsWith('--')) { out[parts[i].slice(2)] = parts[i + 1] || ''; i += 1; }
  return out;
}
function print(value) { process.stdout.write(String(value) + '\n'); }
function usage() {
  return [
    'xi-evidence-mcp',
    '',
    'MCP server:',
    '  xi-evidence-mcp                 start MCP over stdio',
    '',
    'Human approval:',
    '  xi-evidence-mcp list',
    '  xi-evidence-mcp status <id>',
    '  xi-evidence-mcp approve <id> [--approver name] [--note text]',
    '  xi-evidence-mcp reject <id> [--approver name] [--note text]',
    '  xi-evidence-mcp export [name]',
    '  xi-evidence-mcp verify <dir>',
    '  xi-evidence-mcp where',
    '',
    'Data:',
    '  --data <dir>  or XI_EVIDENCE_DATA',
  ].join('\n');
}