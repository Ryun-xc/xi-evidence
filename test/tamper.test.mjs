import { assert, tempDir, cleanup } from './helpers.mjs';
import { createEvidenceService } from '../src/evidence.mjs';
import { verifyExport } from '../verify.mjs';
import fs from 'node:fs';
import path from 'node:path';

const dir = tempDir(); try {
  const service = createEvidenceService({ dataDir: dir });
  const tx = service.propose({ tool: 'workspace.write', args: { name: 'a.md', content: 'a' } });
  service.approve(tx.transactionId, { approver: { id: 'alice', type: 'human' } });
  await service.execute(tx.transactionId);
  const base = dir + '/export';
  service.exportTo(base);
  assert.equal(verifyExport(base).ok, true);

  const cases = [];
  const read = (p) => JSON.parse(fs.readFileSync(path.join(p, 'records.jsonl'), 'utf8').replace(/^\uFEFF/, '').trim().split('\n').map((line) => JSON.parse(line))[0]);
  const records = fs.readFileSync(path.join(base, 'records.jsonl'), 'utf8').trim().split('\n');
  const variants = {
    modify: () => records.map((line, i) => i === 0 ? JSON.stringify({ ...JSON.parse(line), data: { ...JSON.parse(line).data, tool: 'shell.exec' } }) : line).join('\n') + '\n',
    delete: () => records.slice(1).join('\n') + '\n',
    reorder: () => [records[1], records[0], ...records.slice(2)].join('\n') + '\n',
    truncate: () => records.slice(0, -1).join('\n') + '\n',
  };
  for (const [name, mutate] of Object.entries(variants)) {
    const out = path.join(dir, 'bad-' + name);
    fs.cpSync(base, out, { recursive: true });
    fs.writeFileSync(path.join(out, 'records.jsonl'), mutate(), 'utf8');
    const result = verifyExport(out);
    assert.equal(result.ok, false, name + ' should fail');
    cases.push({ name, errors: result.errors.length });
  }
  const manifestOut = path.join(dir, 'bad-manifest');
  fs.cpSync(base, manifestOut, { recursive: true });
  const manifest = JSON.parse(fs.readFileSync(path.join(manifestOut, 'manifest.json'), 'utf8'));
  manifest.recordCount = 999;
  fs.writeFileSync(path.join(manifestOut, 'manifest.json'), JSON.stringify(manifest, null, 2));
  assert.equal(verifyExport(manifestOut).ok, false);
  console.log(JSON.stringify({ ok: true, test: 'tamper', cases }));
} finally { cleanup(dir); }