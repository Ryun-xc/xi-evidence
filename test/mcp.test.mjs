import { assert, tempDir, cleanup } from './helpers.mjs';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const run = promisify(execFile);
const dir = tempDir(); let child;
try {
  child = spawn(process.execPath, ['bin/xi-evidence-mcp.mjs'], {
    cwd: path.resolve('.'),
    env: { ...process.env, XI_EVIDENCE_DATA: dir },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const lines = readline.createInterface({ input: child.stdout });
  const pending = new Map();
  lines.on('line', (line) => { const data = JSON.parse(line); pending.set(data.id, data); });
  const wait = (id) => new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (pending.has(id)) { clearInterval(timer); resolve(pending.get(id)); }
      else if (Date.now() - started > 8000) { clearInterval(timer); reject(new Error('timeout ' + id)); }
    }, 20);
  });
  const send = (message) => child.stdin.write(JSON.stringify(message) + '\n');
  send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
  const init = await wait(1);
  assert.equal(init.result.serverInfo.name, 'xi-evidence-mcp');
  send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
  const list = await wait(2);
  assert.deepEqual(list.result.tools.map((tool) => tool.name).sort(), ['xi_export', 'xi_guard', 'xi_status', 'xi_verify']);
  assert.ok(!list.result.tools.some((tool) => /approve|execute/.test(tool.name)));

  send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'xi_guard', arguments: { tool: 'shell.exec', args: { command: 'rm -rf build' }, intent: 'clean build' } } });
  const guard = await wait(3);
  const guarded = JSON.parse(guard.result.content[0].text);
  assert.equal(guarded.state, 'awaiting_approval');
  assert.match(guarded.approvalCommand, /xi-evidence-mcp approve/);

  const cli = await run(process.execPath, ['bin/xi-evidence-mcp.mjs', 'approve', guarded.transactionId, '--approver', 'alice'], { env: { ...process.env, XI_EVIDENCE_DATA: dir }, encoding: 'utf8' });
  assert.match(cli.stdout, /approved/);

  send({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'xi_status', arguments: { transactionId: guarded.transactionId } } });
  const status = await wait(4);
  assert.equal(JSON.parse(status.result.content[0].text).state, 'approved');

  send({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'xi_export', arguments: { name: 'mcp-test' } } });
  const exported = await wait(5);
  const exportResult = JSON.parse(exported.result.content[0].text);
  assert.ok(fs.existsSync(path.join(exportResult.outDir, 'records.jsonl')));
  send({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'xi_verify', arguments: { dir: exportResult.outDir } } });
  const verified = await wait(6);
  assert.equal(JSON.parse(verified.result.content[0].text).ok, true);
  console.log(JSON.stringify({ ok: true, test: 'mcp-deep' }));
} finally {
  if (child) child.kill();
  cleanup(dir);
}