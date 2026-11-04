import { assert, tempDir, cleanup } from './helpers.mjs';
import { createSidecar } from '../src/server.mjs';

const dir = tempDir(); let app;
try {
  app = await createSidecar({ dataDir: dir, token: 'test-token' });
  let res = await fetch(app.url + '/v1/health');
  assert.equal(res.status, 200);
  res = await fetch(app.url + '/');
  assert.equal(res.status, 200);
  assert.match(await res.text(), /APPROVAL CONSOLE/);
  res = await fetch(app.url + '/v1/proposals');
  assert.equal(res.status, 401);
  const headers = { authorization: 'Bearer test-token', 'content-type': 'application/json' };
  res = await fetch(app.url + '/v1/proposals', { method: 'POST', headers, body: JSON.stringify({ tool: 'workspace.write', args: { name: 'http.md', content: 'x' }, intent: 'http test' }) });
  assert.equal(res.status, 201);
  const tx = (await res.json()).transaction;
  assert.equal(tx.state, 'awaiting_approval');
  res = await fetch(app.url + `/v1/transactions/${tx.transactionId}/approve`, { method: 'POST', headers, body: JSON.stringify({ approver: { id: 'alice', type: 'human' } }) });
  assert.equal(res.status, 200);
  res = await fetch(app.url + `/v1/transactions/${tx.transactionId}/execute`, { method: 'POST', headers, body: '{}' });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).transaction.state, 'completed');
  console.log(JSON.stringify({ ok: true, test: 'http' }));
} finally { if (app) await app.close(); cleanup(dir); }