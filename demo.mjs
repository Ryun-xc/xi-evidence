import fs from 'node:fs';
import path from 'node:path';
import { createEvidenceService } from './src/evidence.mjs';
import { verifyExport } from './verify.mjs';

const dir = path.resolve(process.argv[2] || 'data/demo');
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });

const service = createEvidenceService({ dataDir: dir });
const actor = { id: 'demo-host', type: 'host' };
const approver = { id: 'demo-human', type: 'human' };

const approved = service.propose({ tool: 'workspace.write', args: { name: 'approved.md', content: 'approved by human' }, intent: 'write an approved file', actor });
service.approve(approved.transactionId, { approver, note: 'looks good' });
const completed = await service.execute(approved.transactionId);

const rejected = service.propose({ tool: 'shell.exec', args: { command: 'rm -rf build' }, intent: 'demonstrate rejection', actor });
const rejectedClosed = service.reject(rejected.transactionId, { approver, note: 'irreversible and too broad' });

const crashed = service.propose({ tool: 'workspace.write', args: { name: 'crash.md', content: 'unknown' }, intent: 'demonstrate crash recovery', actor });
service.approve(crashed.transactionId, { approver, note: 'approved before crash' });
service.beginExecution(crashed.transactionId);
const restarted = createEvidenceService({ dataDir: dir });
const ambiguous = restarted.get(crashed.transactionId);

const exportDir = path.join(dir, 'export');
restarted.exportTo(exportDir);
const good = verifyExport(exportDir);

const tamperedDir = path.join(dir, 'tampered');
fs.cpSync(exportDir, tamperedDir, { recursive: true });
const recordsFile = path.join(tamperedDir, 'records.jsonl');
const lines = fs.readFileSync(recordsFile, 'utf8').trim().split('\n');
const first = JSON.parse(lines[0]);
first.data.tool = 'shell.exec';
lines[0] = JSON.stringify(first);
fs.writeFileSync(recordsFile, lines.join('\n') + '\n');
const tampered = verifyExport(tamperedDir);

console.log(JSON.stringify({
  ok: good.ok && !tampered.ok && ambiguous.state === 'ambiguous' && completed.state === 'completed' && rejectedClosed.state === 'rejected',
  approved: completed.state,
  rejected: rejectedClosed.state,
  crashRecovery: ambiguous.state,
  records: good.checks.records,
  offlineVerify: good.ok,
  tamperDetected: !tampered.ok,
  exportDir,
  tamperedDir,
}, null, 2));
if (!(good.ok && !tampered.ok && ambiguous.state === 'ambiguous' && completed.state === 'completed' && rejectedClosed.state === 'rejected')) process.exitCode = 1;