import { assert, tempDir, cleanup, canonical, sha256 } from './helpers.mjs';
import { createEvidenceService } from '../src/evidence.mjs';
import { createApproverKey, signDecision } from '../src/approver.mjs';

const dir = tempDir(); try {
  const keys = createApproverKey({ dir: dir + '/approver' });
  const service = createEvidenceService({ dataDir: dir });
  const tx = service.propose({ tool: 'workspace.write', args: { name: 'signed.md', content: 'x' } });
  const contextHash = sha256(canonical(tx.proposal));
  const approver = { id: 'alice', type: 'human' };
  const signature = signDecision({ privateKey: keys.privateKey, transactionId: tx.transactionId, decision: 'approved', note: 'ok', approver, contextHash });
  const approved = service.approve(tx.transactionId, { approver, note: 'ok', approverPublicKey: keys.publicPem, approverSignature: signature });
  assert.equal(approved.state, 'approved');
  assert.equal(approved.decision.approverPublicKey, keys.publicPem);
  const other = service.propose({ tool: 'workspace.write', args: { name: 'bad.md', content: 'x' } });
  assert.throws(() => service.approve(other.transactionId, { approver, approverPublicKey: keys.publicPem, approverSignature: 'bad' }), /signature/);
  console.log(JSON.stringify({ ok: true, test: 'approver' }));
} finally { cleanup(dir); }