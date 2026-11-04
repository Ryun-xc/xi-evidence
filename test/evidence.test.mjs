import { assert, tempDir, cleanup } from './helpers.mjs';
import { createEvidenceService } from '../src/evidence.mjs';
import { verifyExport } from '../verify.mjs';

const dir = tempDir(); try {
  const service = createEvidenceService({ dataDir: dir });
  const tx = service.propose({ tool: 'workspace.write', args: { name: 'note.md', content: 'hello' }, intent: 'create note', actor: { id: 'alice', type: 'human' } });
  assert.equal(tx.state, 'awaiting_approval');
  assert.equal(tx.risk.level, 'medium');
  const approved = service.approve(tx.transactionId, { approver: { id: 'alice', type: 'human' }, note: 'approved' });
  assert.equal(approved.state, 'approved');
  const done = await service.execute(tx.transactionId);
  assert.equal(done.state, 'completed');
  assert.ok(done.execution.result.resultHash);
  assert.ok(service.ledger.count() >= 5);

  const rejected = service.propose({ tool: 'shell.exec', args: { command: 'rm -rf /' }, intent: 'danger' });
  const rejected2 = service.reject(rejected.transactionId, { approver: { id: 'alice', type: 'human' }, note: 'no' });
  assert.equal(rejected2.state, 'rejected');
  assert.equal(service.get(rejected.transactionId).execution.startedAt, null);

  const out = dir + '/export';
  const exported = service.exportTo(out);
  const result = verifyExport(out);
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.equal(exported.manifest.recordCount, service.ledger.count());
  console.log(JSON.stringify({ ok: true, test: 'evidence' }));
} finally { cleanup(dir); }