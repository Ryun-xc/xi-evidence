import { assert, tempDir, cleanup } from './helpers.mjs';
import { createSidecar } from '../src/server.mjs';
import { spawn } from 'node:child_process';
import readline from 'node:readline';
import path from 'node:path';

const dir = tempDir(); let app; let child;
try {
  app = await createSidecar({ dataDir: dir, token: 'mcp-token' });
  child = spawn(process.execPath, ['src/mcp-server.mjs'], { cwd: path.resolve('.'), env: { ...process.env, XI_EVIDENCE_URL: app.url, XI_EVIDENCE_TOKEN: 'mcp-token' }, stdio: ['pipe', 'pipe', 'pipe'] });
  const lines = readline.createInterface({ input: child.stdout });
  const pending = new Map();
  lines.on('line', (line) => { const data = JSON.parse(line); pending.set(data.id, data); });
  const wait = (id) => new Promise((resolve, reject) => {
    const t = setInterval(() => { if (pending.has(id)) { clearInterval(t); resolve(pending.get(id)); } }, 20);
    setTimeout(() => { clearInterval(t); reject(new Error('timeout ' + id)); }, 5000);
  });
  const send = (message) => child.stdin.write(JSON.stringify(message) + '\n');
  send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
  const init = await wait(1);
  assert.equal(init.result.serverInfo.name, 'xi-evidence');
  send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
  const list = await wait(2);
  assert.ok(list.result.tools.some((tool) => tool.name === 'evidence_propose'));
  send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'evidence_propose', arguments: { tool: 'workspace.write', args: { name: 'mcp.md', content: 'x' }, intent: 'mcp' } } });
  const call = await wait(3);
  assert.ok(call.result.content[0].text.includes('awaiting_approval'));
  console.log(JSON.stringify({ ok: true, test: 'mcp' }));
} finally { if (child) child.kill(); if (app) await app.close(); cleanup(dir); }