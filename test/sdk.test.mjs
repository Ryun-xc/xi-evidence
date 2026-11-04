import { assert, tempDir, cleanup } from './helpers.mjs';
import { createSidecar } from '../src/server.mjs';
import { EvidenceClient } from '../sdk/node.mjs';

const dir = tempDir(); let app;
try {
  app = await createSidecar({ dataDir: dir, token: 'sdk-token' });
  const client = new EvidenceClient({ baseUrl: app.url, token: 'sdk-token' });
  const proposal = await client.propose({ tool: 'workspace.write', args: { name: 'sdk.md', content: 'x' }, intent: 'sdk' });
  assert.equal(proposal.transaction.state, 'awaiting_approval');
  await client.approve(proposal.transaction.transactionId, { id: 'alice', type: 'human' });
  const done = await client.execute(proposal.transaction.transactionId);
  assert.equal(done.transaction.state, 'completed');
  console.log(JSON.stringify({ ok: true, test: 'node-sdk' }));
} finally { if (app) await app.close(); cleanup(dir); }