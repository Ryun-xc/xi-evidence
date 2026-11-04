import { assert, tempDir, cleanup } from './helpers.mjs';
import { createSidecar } from '../src/server.mjs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const dir = tempDir(); let app;
try {
  app = await createSidecar({ dataDir: dir, token: 'cli-token' });
  const headers = { authorization: 'Bearer cli-token', 'content-type': 'application/json' };
  const res = await fetch(app.url + '/v1/proposals', { method: 'POST', headers, body: JSON.stringify({ tool: 'workspace.write', args: { name: 'cli.md', content: 'x' } }) });
  const tx = (await res.json()).transaction;
  const env = { ...process.env, XI_EVIDENCE_URL: app.url, XI_EVIDENCE_TOKEN: 'cli-token' };
  let result = await run(process.execPath, ['bin/evidence.mjs', 'list'], { env, encoding: 'utf8' });
  assert.match(result.stdout, /awaiting_approval/);
  result = await run(process.execPath, ['bin/evidence.mjs', 'approve', tx.transactionId, '--approver', 'alice'], { env, encoding: 'utf8' });
  assert.match(result.stdout, /approved/);
  console.log(JSON.stringify({ ok: true, test: 'cli' }));
} finally { if (app) await app.close(); cleanup(dir); }