import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { createSidecar } from './server.mjs';
import { verifyExport } from '../verify.mjs';

const dataDir = path.resolve(process.env.XI_EVIDENCE_DATA || path.join(os.homedir(), '.xi-evidence'));
const controlFile = path.join(dataDir, 'mcp-control.json');
fs.mkdirSync(dataDir, { recursive: true });

const app = await createSidecar({ dataDir, host: '127.0.0.1', port: 0 });
fs.writeFileSync(controlFile, JSON.stringify({ url: app.url, token: app.token, dataDir, pid: process.pid, startedAt: new Date().toISOString() }, null, 2), { mode: 0o600 });

const headers = { 'content-type': 'application/json', authorization: `Bearer ${app.token}` };
async function api(pathname, options = {}) {
  const res = await fetch(app.url + pathname, { ...options, headers: { ...headers, ...(options.headers || {}) }, signal: AbortSignal.timeout(15000) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body;
}

const tools = [
  {
    name: 'xi_guard',
    description: 'Classify a coding tool call and create an approval evidence transaction. This never approves or executes.',
    inputSchema: { type: 'object', required: ['tool'], properties: { tool: { type: 'string' }, args: { type: 'object' }, intent: { type: 'string' }, actor: { type: 'object' } } },
  },
  { name: 'xi_status', description: 'Read an evidence transaction, risk, decision, permit, and execution state.', inputSchema: { type: 'object', required: ['transactionId'], properties: { transactionId: { type: 'string' } } } },
  { name: 'xi_export', description: 'Export signed evidence plus the offline verifier. Returns a verify command.', inputSchema: { type: 'object', properties: { name: { type: 'string' } } } },
  { name: 'xi_verify', description: 'Verify an exported evidence directory offline.', inputSchema: { type: 'object', required: ['dir'], properties: { dir: { type: 'string' } } } },
];

function textResult(value) { return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] }; }
function dataFlag() { return process.env.XI_EVIDENCE_DATA ? ` --data "${dataDir}"` : ''; }

async function callTool(name, args = {}) {
  if (name === 'xi_guard') {
    const result = await api('/v1/proposals', { method: 'POST', body: JSON.stringify({ tool: args.tool, args: args.args || {}, intent: args.intent || '', actor: args.actor || { id: 'cursor', type: 'host' } }) });
    const tx = result.transaction;
    const response = {
      transactionId: tx.transactionId,
      state: tx.state,
      decision: tx.risk.behavior,
      risk: tx.risk,
      approvalCommand: tx.state === 'awaiting_approval' ? `npx xi-evidence-mcp approve ${tx.transactionId}${dataFlag()}` : null,
      note: 'xi_guard never approves or executes. A human must approve high-risk actions.',
    };
    if (tx.state === 'approved') response.permit = (await api(`/v1/transactions/${encodeURIComponent(tx.transactionId)}/permit`, { method: 'POST', body: '{}' })).permit;
    return response;
  }
  if (name === 'xi_status') return (await api(`/v1/transactions/${encodeURIComponent(args.transactionId)}`)).transaction;
  if (name === 'xi_export') {
    const result = await api('/v1/export', { method: 'POST', body: JSON.stringify({ name: args.name || '' }) });
    return { ...result, verifyCommand: `npx xi-evidence-mcp verify "${result.outDir}"` };
  }
  if (name === 'xi_verify') return verifyExport(path.resolve(args.dir));
  throw new Error(`unknown tool: ${name}`);
}

function reply(id, result) { process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n'); }
function fail(id, code, message) { process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n'); }

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', async (line) => {
  let request;
  try { request = JSON.parse(line); } catch { fail(null, -32700, 'parse error'); return; }
  if (!request || request.jsonrpc !== '2.0' || request.id == null) return;
  try {
    if (request.method === 'initialize') return reply(request.id, { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'xi-evidence-mcp', version: '0.2.0' } });
    if (request.method === 'tools/list') return reply(request.id, { tools });
    if (request.method === 'tools/call') {
      const name = String(request.params?.name || '');
      if (!tools.some((tool) => tool.name === name)) return fail(request.id, -32602, `tool not exposed: ${name}`);
      return reply(request.id, textResult(await callTool(name, request.params?.arguments || {})));
    }
    return fail(request.id, -32601, 'method not found');
  } catch (error) {
    return reply(request.id, { ...textResult({ ok: false, error: String(error?.message || error) }), isError: true });
  }
});
rl.on('close', () => { app.close().finally(() => process.exit(0)); });
process.on('SIGTERM', () => { app.close().finally(() => process.exit(0)); });
process.on('SIGINT', () => { app.close().finally(() => process.exit(0)); });