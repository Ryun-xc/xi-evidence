/** Optional Git anchor for the signed manifest head. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export function anchorExport({ exportDir, repoDir, message = null } = {}) {
  const manifest = JSON.parse(fs.readFileSync(path.join(exportDir, 'manifest.json'), 'utf8'));
  const anchor = {
    schemaVersion: '1',
    headHash: manifest.headHash,
    recordCount: manifest.recordCount,
    publicKeyFingerprint: manifest.publicKeyFingerprint,
    exportedAt: manifest.createdAt,
    anchoredAt: new Date().toISOString(),
  };
  fs.mkdirSync(repoDir, { recursive: true });
  if (!fs.existsSync(path.join(repoDir, '.git'))) {
    git(repoDir, ['init', '-b', 'main']);
    git(repoDir, ['config', 'user.name', 'XI Evidence Anchor']);
    git(repoDir, ['config', 'user.email', 'anchor@xi-evidence.local']);
  }
  fs.writeFileSync(path.join(repoDir, 'anchor.json'), JSON.stringify(anchor, null, 2) + '\n', 'utf8');
  git(repoDir, ['add', 'anchor.json']);
  git(repoDir, ['commit', '-m', message || `evidence head ${manifest.headHash}`]);
  const commit = git(repoDir, ['rev-parse', 'HEAD']).trim();
  return { anchor, commit, repoDir };
}

export function verifyAnchor({ exportDir, repoDir } = {}) {
  const manifest = JSON.parse(fs.readFileSync(path.join(exportDir, 'manifest.json'), 'utf8'));
  const committed = git(repoDir, ['show', 'HEAD:anchor.json']);
  const anchor = JSON.parse(committed);
  const errors = [];
  if (anchor.headHash !== manifest.headHash) errors.push('anchor head does not match export head');
  if (anchor.recordCount !== manifest.recordCount) errors.push('anchor count does not match export');
  if (anchor.publicKeyFingerprint !== manifest.publicKeyFingerprint) errors.push('anchor key fingerprint does not match export');
  return { ok: errors.length === 0, errors, anchor };
}

export function git(cwd, args) {
  return execFileSync('git', ['-c', 'safe.directory=*', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}