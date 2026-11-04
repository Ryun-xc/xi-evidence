import { assert, tempDir, cleanup } from './helpers.mjs';
import { createEvidenceService } from '../src/evidence.mjs';
import { anchorExport, verifyAnchor } from '../src/anchor.mjs';

const dir = tempDir(); try {
  const service = createEvidenceService({ dataDir: dir });
  const tx = service.propose({ tool: 'workspace.write', args: { name: 'anchor.md', content: 'x' } });
  service.approve(tx.transactionId, { approver: { id: 'alice', type: 'human' } });
  await service.execute(tx.transactionId);
  const exportDir = dir + '/export';
  service.exportTo(exportDir);
  const repoDir = dir + '/anchor';
  const result = anchorExport({ exportDir, repoDir });
  assert.ok(result.commit);
  assert.equal(verifyAnchor({ exportDir, repoDir }).ok, true);
  console.log(JSON.stringify({ ok: true, test: 'anchor' }));
} finally { cleanup(dir); }