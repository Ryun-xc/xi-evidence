import { assert, tempDir, cleanup } from './helpers.mjs';
import { createEvidenceService } from '../src/evidence.mjs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const dir = tempDir(); try {
  let available = true;
  try { execFileSync(python, ['-c', 'import cryptography'], { stdio: 'ignore' }); } catch { available = false; }
  if (!available) { console.log(JSON.stringify({ ok: true, test: 'python-verifier', skipped: 'python cryptography unavailable' })); }
  else {
    const service = createEvidenceService({ dataDir: dir });
    const tx = service.propose({ tool: 'workspace.write', args: { name: 'py.md', content: 'x' } });
    service.approve(tx.transactionId, { approver: { id: 'alice', type: 'human' } });
    await service.execute(tx.transactionId);
    const out = path.join(dir, 'export');
    service.exportTo(out);
    const raw = execFileSync(python, [path.resolve('sdk/python/verify.py'), out], { encoding: 'utf8' });
    const result = JSON.parse(raw);
    assert.equal(result.ok, true, JSON.stringify(result.errors));
    console.log(JSON.stringify({ ok: true, test: 'python-verifier' }));
  }
} finally { cleanup(dir); }