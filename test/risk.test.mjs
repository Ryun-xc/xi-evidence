import { assert } from './helpers.mjs';
import { classify } from '../src/risk.mjs';
assert.equal(classify({ tool: 'timeline.read' }).behavior, 'allow');
assert.equal(classify({ tool: 'workspace.write', args: { name: 'a' } }).behavior, 'require_approval');
assert.equal(classify({ tool: 'shell.exec', args: { command: 'rm -rf /' } }).level, 'high');
assert.equal(classify({ tool: 'device.control' }).behavior, 'deny');
assert.equal(classify({ tool: 'workspace.write', args: { path: '../escape' } }).behavior, 'deny');
assert.equal(classify({ tool: 'unknown.tool' }).level, 'high');
console.log(JSON.stringify({ ok: true, test: 'risk' }));