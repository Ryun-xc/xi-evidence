/** Deterministic coding-agent risk policy. It does not execute anything. */
const READONLY = new Set(['timeline.read', 'memory.query', 'goal.list', 'task.list', 'eval.read', 'knowledge.search', 'evidence.read', 'git.status', 'git.diff', 'file.read', 'test.run']);
const SHELL_READONLY = [/^git\s+(status|diff|log|show|branch)\b/, /^(ls|cat|rg|grep|find|pwd)\b/, /^(npm|pnpm|yarn)\s+test\b/, /^node\s+--version\b/];
const SECRET_PATH = /(^|[\\/])(\.env(\..*)?|id_rsa|id_ed25519|.*\.pem|.*secret.*|.*credential.*)$/i;

const COMMAND_RULES = [
  { pattern: /rm\s+-(rf|fr)\s+(\/|~|\*)/i, level: 'high', behavior: 'deny', reason: 'recursive delete of root/home/all' },
  { pattern: /rm\s+-(rf|fr)\b/i, level: 'high', behavior: 'require_approval', reason: 'recursive delete' },
  { pattern: /git\s+reset\s+--hard\b/i, level: 'high', behavior: 'require_approval', reason: 'discards uncommitted work' },
  { pattern: /git\s+clean\s+-[a-z]*f[a-z]*d?x?/i, level: 'high', behavior: 'require_approval', reason: 'deletes untracked files' },
  { pattern: /git\s+push\s+.*--force/i, level: 'high', behavior: 'require_approval', reason: 'rewrites remote history' },
  { pattern: /chmod\s+777\b/i, level: 'high', behavior: 'require_approval', reason: 'world-writable permissions' },
  { pattern: /curl\b.*\|\s*(sh|bash)\b/i, level: 'high', behavior: 'deny', reason: 'remote script piped to shell' },
  { pattern: /docker\s+system\s+prune\b/i, level: 'high', behavior: 'require_approval', reason: 'removes Docker data' },
  { pattern: /(drop|truncate)\s+table\b/i, level: 'high', behavior: 'deny', reason: 'destructive database operation' },
  { pattern: /npm\s+publish\b/i, level: 'high', behavior: 'require_approval', reason: 'publishes a package' },
  { pattern: /kubectl\s+delete\b/i, level: 'high', behavior: 'require_approval', reason: 'deletes cluster resources' },
];

export function classify({ tool, args = {} } = {}) {
  const name = String(tool || '');
  const command = String(args.command || '');
  let level = 'high';
  let behavior = 'require_approval';
  let reversible = false;
  let blastRadius = 'external';
  let sensitivity = 'high';
  const reasons = [];

  if (READONLY.has(name) || (name === 'shell.exec' && SHELL_READONLY.some((rx) => rx.test(command)))) {
    level = 'low'; behavior = 'allow'; reversible = true; blastRadius = 'none'; sensitivity = 'low';
    reasons.push('read-only operation');
    return result();
  }

  if (name === 'shell.exec') {
    const rule = COMMAND_RULES.find((item) => item.pattern.test(command));
    if (rule) { level = rule.level; behavior = rule.behavior; reasons.push(rule.reason); }
    else { reasons.push('shell command'); }
    blastRadius = 'host';
    return result();
  }

  if (name === 'workspace.write') {
    level = 'medium'; behavior = 'require_approval'; reversible = true; blastRadius = 'workspace'; sensitivity = 'medium';
    reasons.push('writes local workspace');
    if (SECRET_PATH.test(String(args.path || args.name || ''))) {
      level = 'high'; behavior = 'deny'; reversible = false; sensitivity = 'high'; reasons.push('sensitive path');
    }
    if (args.path && /(^|[\\/])\.\.([\\/]|$)/.test(String(args.path))) {
      level = 'high'; behavior = 'deny'; reversible = false; reasons.push('path traversal');
    }
    return result();
  }

  if (name === 'git.commit') {
    level = 'medium'; behavior = 'require_approval'; reversible = true; blastRadius = 'local repository'; sensitivity = 'medium'; reasons.push('creates a commit');
    return result();
  }

  if (name === 'git.push') {
    level = 'high'; behavior = 'require_approval'; blastRadius = 'remote repository'; reasons.push('pushes to a remote');
    return result();
  }

  if (name === 'device.control') { behavior = 'deny'; reasons.push('device control is not allowed'); return result(); }
  reasons.push('unknown tool defaults to high risk');
  return result();

  function result() {
    return {
      level,
      behavior,
      reasons,
      reversible,
      blastRadius,
      sensitivity,
      evidence: { tool: name, argsKeys: Object.keys(args || {}).sort() },
    };
  }
}