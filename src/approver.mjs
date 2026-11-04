import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { canonical } from './canonical.mjs';

export function createApproverKey({ dir }) {
  fs.mkdirSync(dir, { recursive: true });
  const privateFile = path.join(dir, 'private.pem');
  const publicFile = path.join(dir, 'public.pem');
  if (!fs.existsSync(privateFile)) {
    const pair = crypto.generateKeyPairSync('ed25519');
    fs.writeFileSync(privateFile, pair.privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
    fs.writeFileSync(publicFile, pair.publicKey.export({ type: 'spki', format: 'pem' }), { mode: 0o644 });
  }
  return {
    privateKey: crypto.createPrivateKey(fs.readFileSync(privateFile, 'utf8')),
    publicPem: fs.readFileSync(publicFile, 'utf8'),
  };
}

export function decisionPayload({ transactionId, decision, note = '', approver = {}, contextHash }) {
  return { transactionId, decision, note, approver, contextHash };
}

export function signDecision({ privateKey, transactionId, decision, note = '', approver = {}, contextHash }) {
  const payload = decisionPayload({ transactionId, decision, note, approver, contextHash });
  return crypto.sign(null, Buffer.from(canonical(payload)), privateKey).toString('base64');
}

export function verifyDecision({ publicPem, signature, transactionId, decision, note = '', approver = {}, contextHash }) {
  const payload = decisionPayload({ transactionId, decision, note, approver, contextHash });
  return crypto.verify(null, Buffer.from(canonical(payload)), crypto.createPublicKey(publicPem), Buffer.from(signature, 'base64'));
}