import { assert, tempDir, cleanup } from './helpers.mjs';
import { createEvidenceService } from '../src/evidence.mjs';
import { createDshAdapter } from '../src/adapters/dsh.mjs';
import { createOpenClawAdapter } from '../src/adapters/openclaw.mjs';

const dir = tempDir(); try {
  const service = createEvidenceService({ dataDir: dir });
  const dsh = createDshAdapter({ service });
  const openclaw = createOpenClawAdapter({ service });
  assert.equal(dsh.name, 'deepseek-harness');
  assert.equal(openclaw.name, 'openclaw');
  const step = await dsh.beforeToolCall({ tool: 'workspace.write', args: { name: 'adapter.md', content: 'x' }, actor: { id: 'host', type: 'host' } });
  assert.equal(step.requiresApproval, true);
  assert.equal(typeof openclaw.permit, 'function');
  console.log(JSON.stringify({ ok: true, test: 'adapters' }));
} finally { cleanup(dir); }