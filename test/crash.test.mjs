import { assert, tempDir, cleanup } from './helpers.mjs';
import { createEvidenceService } from '../src/evidence.mjs';

const dir = tempDir(); try {
  const first = createEvidenceService({ dataDir: dir });
  const tx = first.propose({ tool: 'workspace.write', args: { name: 'crash.md', content: 'x' } });
  first.approve(tx.transactionId, { approver: { id: 'alice', type: 'human' } });
  first.beginExecution(tx.transactionId);
  assert.equal(first.get(tx.transactionId).state, 'executing');
  const second = createEvidenceService({ dataDir: dir });
  const recovered = second.get(tx.transactionId);
  assert.equal(recovered.state, 'ambiguous');
  assert.match(recovered.execution.error, /unknown|restarted/);
  console.log(JSON.stringify({ ok: true, test: 'crash-recovery' }));
} finally { cleanup(dir); }