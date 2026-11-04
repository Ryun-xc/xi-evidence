import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { canonical, sha256 } from './canonical.mjs';

function treeHash(dir) {
  if (!fs.existsSync(dir)) return sha256('');
  const parts = [];
  const walk = (current) => {
    for (const name of fs.readdirSync(current).sort()) {
      const full = path.join(current, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) { parts.push(`d:${path.relative(dir, full)}`); walk(full); }
      else parts.push(`f:${path.relative(dir, full)}:${sha256(fs.readFileSync(full))}`);
    }
  };
  walk(dir);
  return sha256(parts.join('\n'));
}

export function createWorkspaceExecutor({ workspaceDir = path.join(process.cwd(), 'data', 'workspace') } = {}) {
  return {
    name: 'workspace.write',
    async execute({ args = {} } = {}) {
      const name = String(args.name || args.path || '').trim();
      if (!name) throw new Error('workspace.write requires name');
      const root = path.resolve(workspaceDir);
      const target = path.resolve(root, name);
      if (target !== root && !target.startsWith(root + path.sep)) throw new Error('path escapes workspace');
      fs.mkdirSync(path.dirname(target), { recursive: true });
      const before = treeHash(root);
      fs.writeFileSync(target, String(args.content ?? ''), 'utf8');
      const after = treeHash(root);
      const resultHash = sha256(`${before}:${after}:${target}`);
      return { ok: true, path: path.relative(root, target), beforeHash: before, afterHash: after, resultHash, stdoutHash: sha256(''), stderrHash: sha256(''), exitCode: 0 };
    },
  };
}

export function createEchoExecutor() {
  return {
    name: 'echo',
    async execute({ args = {} } = {}) {
      const output = canonical(args);
      return { ok: true, output, beforeHash: sha256(''), afterHash: sha256(output), resultHash: sha256(output), stdoutHash: sha256(output), stderrHash: sha256(''), exitCode: 0 };
    },
  };
}

export function createRegistry(executors = []) {
  const map = new Map(executors.map((executor) => [executor.name, executor]));
  return {
    get(name) { return map.get(name) || null; },
    register(executor) { map.set(executor.name, executor); return executor; },
    list() { return [...map.keys()]; },
  };
}