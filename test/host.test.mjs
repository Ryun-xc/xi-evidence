import { assert, tempDir, cleanup } from './helpers.mjs';
import { createEvidenceService } from '../src/evidence.mjs';
import { createHostAdapter, assertPermit } from '../src/host-adapter.mjs';

const dir = tempDir(); try {
  const service = createEvidenceService({ dataDir: dir });
  const adapter = createHostAdapter({ service });
  const step = await adapter.beforeHostToolCall({ tool: 'workspace.write', args: { name: 'host.md', content: 'x' }, intent: 'host call', actor: { id: 'host', type: 'host' } });
  assert.equal(step.requiresApproval, true);
  await adapter.approve(step.transactionId, { id: 'alice', type: 'human' });
  const permit = await adapter.permit(step.transactionId);
  assertPermit(permit, { transactionId: step.transactionId, keys: service.ledger.keys });
  const result = await adapter.recordHostResult(step.transactionId, { ok: true, resultHash: 'abc' });
  assert.equal(result.state, 'completed');
  assert.equal(result.decision.decision, 'approved');
  console.log(JSON.stringify({ ok: true, test: 'host-adapter' }));
} finally { cleanup(dir); }