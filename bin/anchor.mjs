#!/usr/bin/env node
import { anchorExport, verifyAnchor } from '../src/anchor.mjs';

const args = process.argv.slice(2);
const command = args[0];
const options = {};
for (let i = 1; i < args.length; i += 1) if (args[i].startsWith('--')) { options[args[i].slice(2)] = args[i + 1] || ''; i += 1; }
try {
  if (command === 'anchor') {
    const result = anchorExport({ exportDir: options.export || 'data/demo/export', repoDir: options.repo || 'data/anchor' });
    console.log(JSON.stringify({ ok: true, commit: result.commit, anchor: result.anchor, repoDir: result.repoDir }, null, 2));
  } else if (command === 'verify') {
    const result = verifyAnchor({ exportDir: options.export || 'data/demo/export', repoDir: options.repo || 'data/anchor' });
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
  } else {
    console.log('usage: node bin/anchor.mjs anchor|verify [--export dir] [--repo dir]');
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}