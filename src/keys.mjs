import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export function createKeys({ dir }) {
  fs.mkdirSync(dir, { recursive: true });
  const privateFile = path.join(dir, 'private.pem');
  const publicFile = path.join(dir, 'public.pem');
  let privateKey;
  let publicKey;
  if (fs.existsSync(privateFile)) {
    privateKey = crypto.createPrivateKey(fs.readFileSync(privateFile, 'utf8'));
    publicKey = crypto.createPublicKey(fs.readFileSync(publicFile, 'utf8'));
  } else {
    const pair = crypto.generateKeyPairSync('ed25519');
    privateKey = pair.privateKey;
    publicKey = pair.publicKey;
    fs.writeFileSync(privateFile, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
    fs.writeFileSync(publicFile, publicKey.export({ type: 'spki', format: 'pem' }), { mode: 0o644 });
  }
  const publicPem = publicKey.export({ type: 'spki', format: 'pem' });
  const fingerprint = crypto.createHash('sha256').update(publicKey.export({ type: 'spki', format: 'der' })).digest('hex');
  return {
    privateKey,
    publicKey,
    publicPem,
    fingerprint,
    sign(bytes) { return crypto.sign(null, Buffer.from(bytes), privateKey).toString('base64'); },
    verify(bytes, signature) { return crypto.verify(null, Buffer.from(bytes), publicKey, Buffer.from(signature, 'base64')); },
  };
}
