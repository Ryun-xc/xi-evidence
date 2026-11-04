/** Deterministic first-pass risk policy. The model may advise; this policy decides. */
const READONLY = new Set(['timeline.read', 'memory.query', 'goal.list', 'task.list', 'eval.read', 'knowledge.search', 'evidence.read']);
const HIGH = new Set(['shell.exec', 'device.control', 'http.post', 'git.push', 'deploy.release', 'file.delete', 'env.write']);

export function classify({ tool, args = {} } = {}) {
  const name = String(tool || '');
  const reasons = [];
  let level = 'high';
  let behavior = 'require_approval';
  let reversible = false;
  let blastRadius = 'external';
  let sensitivity = 'high';

  if (READONLY.has(name)) {
    level = 'low'; behavior = 'allow'; reversible = true; blastRadius = 'none'; sensitivity = 'low';
    reasons.push('read-only tool');
  } else if (name === 'workspace.write') {
    level = 'medium'; behavior = 'require_approval'; reversible = true; blastRadius = 'workspace'; sensitivity = 'medium';
    reasons.push('writes local workspace');
    if (args.path && /(^|[\\/])\.\.([\\/]|$)/.test(String(args.path))) {
      level = 'high'; behavior = 'deny'; reversible = false; reasons.push('path traversal');
    }
  } else if (HIGH.has(name)) {
    level = 'high'; behavior = name === 'device.control' ? 'deny' : 'require_approval'; reversible = false;
    blastRadius = name === 'shell.exec' ? 'host' : 'external';
    reasons.push('high-impact or irreversible action');
  } else {
    reasons.push('unknown tool defaults to high risk');
  }

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

export const riskPolicy = { classify, READONLY, HIGH };