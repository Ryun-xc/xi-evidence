import { execFileSync } from 'node:child_process';
import path from 'node:path';

const files = [
  'canonical.test.mjs',
  'ledger.test.mjs',
  'risk.test.mjs',
  'evidence.test.mjs',
  'crash.test.mjs',
  'tamper.test.mjs',
  'http.test.mjs',
  'sdk.test.mjs',
  'host.test.mjs',
  'adapters.test.mjs',
  'verify-cli.test.mjs',
  'anchor.test.mjs',
  'approver.test.mjs',
  'cli.test.mjs',
  'python-verifier.test.mjs',
  'mcp.test.mjs',
];
let failed = 0;
for (const file of files) {
  try {
    const output = execFileSync(process.execPath, [path.join('test', file)], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    process.stdout.write(output);
  } catch (error) {
    failed += 1;
    process.stderr.write(`FAIL ${file}\n${error.stdout || ''}${error.stderr || ''}\n`);
  }
}
if (failed) { console.error(JSON.stringify({ ok: false, failed })); process.exit(1); }
console.log(JSON.stringify({ ok: true, tests: files.length }));