import { assert, tempDir, cleanup, createLedger, verifyRecords, canonical, sha256 } from './helpers.mjs';
const dir = tempDir(); try {
  const ledger = createLedger({ file: dir + '/ledger.jsonl', keyDir: dir + '/keys' });
  const a = ledger.append('proposal', 'tx1', { tool: 'workspace.write', args: { name: 'a' } }, { id: 'alice', type: 'human' });
  const b = ledger.append('decision', 'tx1', { decision: 'approved' }, { id: 'alice', type: 'human' });
  assert.equal(a.sequence, 1); assert.equal(b.sequence, 2); assert.equal(b.previousHash, a.hash);
  verifyRecords(ledger.list(), ledger.keys);
  assert.equal(b.hash, sha256(canonical((({ signature, ...signed }) => { const { hash, ...unsigned } = signed; return unsigned; })(b))));
  const bad = JSON.parse(JSON.stringify(ledger.list())); bad[0].data.tool = 'shell.exec';
  assert.throws(() => verifyRecords(bad, ledger.keys), /signature|hash/);
  console.log(JSON.stringify({ ok: true, test: 'ledger' }));
} finally { cleanup(dir); }