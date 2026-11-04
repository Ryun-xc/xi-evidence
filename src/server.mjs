/** Local HTTP sidecar for the evidence service. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEvidenceService } from './evidence.mjs';

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

export function createSidecar({ dataDir = path.resolve('data'), token = null, host = '127.0.0.1', port = 0 } = {}) {
  fs.mkdirSync(dataDir, { recursive: true });
  const tokenFile = path.join(dataDir, 'token');
  const accessToken = token || process.env.XI_EVIDENCE_TOKEN || readOrCreateToken(tokenFile);
  const service = createEvidenceService({ dataDir });
  const servers = process.env.XI_EVIDENCE_TLS_CERT && process.env.XI_EVIDENCE_TLS_KEY
    ? https.createServer({ cert: fs.readFileSync(process.env.XI_EVIDENCE_TLS_CERT), key: fs.readFileSync(process.env.XI_EVIDENCE_TLS_KEY) }, handler)
    : http.createServer(handler);
  const server = servers;
  async function handler(req, res) {
    const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
    const method = req.method || 'GET';
    if (url.pathname === '/v1/health') return send(res, 200, { ok: true, service: 'xi-evidence' });
    if ((url.pathname === '/' || url.pathname === '/index.html') && method === 'GET') {
      const html = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      res.end(html);
      return;
    }
    // The health endpoint is public; everything else requires a bearer token.
    if (!authorized(req, accessToken)) return send(res, 401, { ok: false, error: 'authentication required' });
    try {
      if (url.pathname === '/v1/proposals' && method === 'GET') return send(res, 200, { ok: true, items: service.listProposals({ state: url.searchParams.get('state') }) });
      if (url.pathname === '/v1/proposals' && method === 'POST') {
        const body = await readBody(req);
        return send(res, 201, { ok: true, transaction: service.propose(body) });
      }
      const txMatch = url.pathname.match(/^\/v1\/transactions\/([^/]+)(?:\/(approve|reject|permit|execute))?$/);
      if (txMatch) {
        const tx = decodeURIComponent(txMatch[1]);
        const action = txMatch[2];
        if (!action && method === 'GET') {
          const found = service.get(tx);
          return found ? send(res, 200, { ok: true, transaction: found }) : send(res, 404, { ok: false, error: 'transaction not found' });
        }
        if (action && method === 'POST') {
          const body = await readBody(req);
          if (action === 'approve') return send(res, 200, { ok: true, transaction: service.approve(tx, body) });
          if (action === 'reject') return send(res, 200, { ok: true, transaction: service.reject(tx, body) });
          if (action === 'permit') return send(res, 200, { ok: true, permit: service.issuePermit(tx, body) });
          if (action === 'execute') return send(res, 200, { ok: true, transaction: await service.execute(tx, body) });
        }
      }
      if (url.pathname === '/v1/records' && method === 'GET') return send(res, 200, { ok: true, items: service.ledger.list() });
      if (url.pathname === '/v1/export' && method === 'POST') {
        const body = await readBody(req);
        const safeName = String(body.name || new Date().toISOString()).replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 80);
        const outDir = path.join(dataDir, 'exports', safeName);
        const result = service.exportTo(outDir);
        return send(res, 200, { ok: true, outDir, manifest: result.manifest });
      }
      return send(res, 404, { ok: false, error: 'not found' });
    } catch (error) {
      return send(res, 400, { ok: false, error: String(error?.message || error) });
    }
  }
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      const address = server.address();
      resolve({
        service,
        token: accessToken,
        tokenFile,
        url: `${process.env.XI_EVIDENCE_TLS_CERT ? 'https' : 'http'}://${host}:${address.port}`,
        close: () => new Promise((done, fail) => {
          server.close((error) => error ? fail(error) : done());
          if (server.closeAllConnections) server.closeAllConnections();
        }),
      });
    });
  });
}

function readOrCreateToken(file) {
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
  const token = crypto.randomBytes(32).toString('base64url');
  fs.writeFileSync(file, token + '\n', { mode: 0o600 });
  return token;
}
function authorized(req, token) {
  const header = String(req.headers.authorization || '');
  if (header.startsWith('Bearer ') && header.slice(7).trim() === token) return true;
  return String(req.headers['x-evidence-token'] || '') === token;
}
function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let text = '';
    req.on('data', (chunk) => { text += chunk; if (text.length > 1024 * 1024) reject(new Error('request too large')); });
    req.on('end', () => { try { resolve(text ? JSON.parse(text) : {}); } catch { reject(new Error('invalid json')); } });
    req.on('error', reject);
  });
}

if (process.argv[1] && process.argv[1].endsWith('server.mjs')) {
  const app = await createSidecar({ dataDir: process.env.XI_EVIDENCE_DATA || path.resolve('data'), port: Number(process.env.XI_EVIDENCE_PORT || 8790), host: process.env.XI_EVIDENCE_HOST || '127.0.0.1' });
  console.log(JSON.stringify({ ok: true, url: app.url, tokenFile: app.tokenFile }));
}