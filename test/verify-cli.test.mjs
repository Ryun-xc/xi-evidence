import { assert, tempDir, cleanup } from './helpers.mjs';
import { createEvidenceService } from '../src/evidence.mjs';
import { verifyExport } from '../verify.mjs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const dir = tempDir(); try {
  const service = createEvidenceService({ dataDir: dir });
  const tx = service.propose({ tool: 'workspace.write', args: { name: 'cli.md', content: 'x' } });
  service.approve(tx.transactionId, { approver: { id: 'alice', type: 'human' } });
  await service.execute(tx.transactionId);
  const out = dir + '/export';
  service.exportTo(out);
  const text = execFileSync(process.execPath, ['verify.mjs'], { cwd: out, encoding: 'utf8' });
  const result = JSON.parse(text);
  assert.equal(result.ok, true);
  const pinned = execFileSync(process.execPath, ['verify.mjs', '--expect-head', result.checks.head], { cwd: out, encoding: 'utf8' });
  assert.equal(JSON.parse(pinned).ok, true);
  assert.equal(verifyExport(out).ok, true);
  console.log(JSON.stringify({ ok: true, test: 'verify-cli' }));
} finally { cleanup(dir); }