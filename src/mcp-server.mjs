import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const base = String(process.env.XI_EVIDENCE_URL || 'http://127.0.0.1:8790').replace(/\/+$/, '');
const token = String(process.env.XI_EVIDENCE_TOKEN || '');
const headers = { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) };
async function api(pathname, options = {}) {
  const res = await fetch(base + pathname, { ...options, headers: { ...headers, ...(options.headers || {}) }, signal: AbortSignal.timeout(15000) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body;
}
const tools = [
  { name: 'evidence_propose', description: 'Propose a host tool call and classify its risk', inputSchema: { type: 'object', required: ['tool'], properties: { tool: { type: 'string' }, args: { type: 'object' }, intent: { type: 'string' }, actor: { type: 'object' } } } },
  { name: 'evidence_status', description: 'Read a transaction and its evidence chain', inputSchema: { type: 'object', required: ['transactionId'], properties: { transactionId: { type: 'string' } } } },
  { name: 'evidence_approve', description: 'Approve an awaiting transaction', inputSchema: { type: 'object', required: ['transactionId'], properties: { transactionId: { type: 'string' }, approver: { type: 'object' }, note: { type: 'string' } } } },
  { name: 'evidence_reject', description: 'Reject an awaiting transaction', inputSchema: { type: 'object', required: ['transactionId'], properties: { transactionId: { type: 'string' }, approver: { type: 'object' }, note: { type: 'string' } } } },
  { name: 'evidence_permit', description: 'Issue a short-lived execution permit for an approved transaction', inputSchema: { type: 'object', required: ['transactionId'], properties: { transactionId: { type: 'string' } } } },
  { name: 'evidence_execute', description: 'Execute an approved transaction in the local workspace', inputSchema: { type: 'object', required: ['transactionId'], properties: { transactionId: { type: 'string' } } } },
];
function textResult(value) { return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] }; }
async function callTool(name, args = {}) {
  if (name === 'evidence_propose') return textResult(await api('/v1/proposals', { method: 'POST', body: JSON.stringify({ tool: args.tool, args: args.args || {}, intent: args.intent || '', actor: args.actor || { id: 'mcp', type: 'host' } }) }));
  if (name === 'evidence_status') return textResult(await api(`/v1/transactions/${encodeURIComponent(args.transactionId)}`));
  if (name === 'evidence_approve') return textResult(await api(`/v1/transactions/${encodeURIComponent(args.transactionId)}/approve`, { method: 'POST', body: JSON.stringify({ approver: args.approver || { id: 'mcp', type: 'host' }, note: args.note || '' }) }));
  if (name === 'evidence_reject') return textResult(await api(`/v1/transactions/${encodeURIComponent(args.transactionId)}/reject`, { method: 'POST', body: JSON.stringify({ approver: args.approver || { id: 'mcp', type: 'host' }, note: args.note || '' }) }));
  if (name === 'evidence_permit') return textResult(await api(`/v1/transactions/${encodeURIComponent(args.transactionId)}/permit`, { method: 'POST', body: '{}' }));
  if (name === 'evidence_execute') return textResult(await api(`/v1/transactions/${encodeURIComponent(args.transactionId)}/execute`, { method: 'POST', body: '{}' }));
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
    if (request.method === 'initialize') return reply(request.id, { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'xi-evidence', version: '0.1.0' } });
    if (request.method === 'tools/list') return reply(request.id, { tools });
    if (request.method === 'tools/call') return reply(request.id, await callTool(String(request.params?.name || ''), request.params?.arguments || {}));
    return fail(request.id, -32601, 'method not found');
  } catch (error) {
    return reply(request.id, { ...textResult({ ok: false, error: String(error?.message || error) }), isError: true });
  }
});