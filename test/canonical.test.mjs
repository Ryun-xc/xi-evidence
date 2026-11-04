import { assert, canonical, sha256 } from './helpers.mjs';

assert.equal(canonical({ b: 1, a: 2 }), '{"a":2,"b":1}');
assert.equal(canonical({ nested: { z: true, a: null } }), '{"nested":{"a":null,"z":true}}');
assert.equal(canonical(['x', 1, false]), '["x",1,false]');
assert.equal(canonical('周润程'), '"周润程"');
assert.throws(() => canonical({ x: Infinity }), /non-finite/);
assert.equal(sha256('hello'), '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
console.log(JSON.stringify({ ok: true, test: 'canonical' }));