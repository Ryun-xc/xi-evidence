/** Transaction service: proposal, decision, permit, execution, recovery, export. */
import crypto from 'node:crypto';
import path from 'node:path';
import { canonical, sha256 } from './canonical.mjs';
import { createLedger, exportEvidence } from './ledger.mjs';
import { classify } from './risk.mjs';
import { createRegistry, createWorkspaceExecutor } from './executors.mjs';
import { verifyDecision } from './approver.mjs';

const TERMINAL = new Set(['completed', 'failed', 'rejected', 'ambiguous']);

export function createEvidenceService({ dataDir = path.resolve('data'), ledger = null, executors = null } = {}) {
  const ledgerFile = path.join(dataDir, 'ledger.jsonl');
  const store = ledger || createLedger({ file: ledgerFile, keyDir: path.join(dataDir, 'keys') });
  const registry = executors || createRegistry([createWorkspaceExecutor({ workspaceDir: path.join(dataDir, 'workspace') })]);
  recover();

  function append(kind, tx, data, actor) { return store.append(kind, tx, data, actor || { id: 'local', type: 'human' }); }

  function propose({ tool, args = {}, intent = '', actor = { id: 'local', type: 'human' }, transactionId = null } = {}) {
    if (!tool) throw new Error('tool required');
    const tx = transactionId || `tx_${crypto.randomUUID()}`;
    if (get(tx)) throw new Error('transaction already exists');
    const risk = classify({ tool, args });
    append('proposal', tx, { tool, args, intent, risk }, actor);
    if (risk.behavior === 'allow') {
      append('decision', tx, { decision: 'approved', approver: { id: 'policy', type: 'system' }, note: 'low-risk auto allow' });
    } else if (risk.behavior === 'deny') {
      append('decision', tx, { decision: 'rejected', approver: { id: 'policy', type: 'system' }, note: 'policy denied' });
    }
    return get(tx);
  }

  function decide(tx, { decision, approver = { id: 'local', type: 'human' }, note = '', approverPublicKey = '', approverSignature = '' } = {}) {
    const current = get(tx);
    if (!current) throw new Error('transaction not found');
    if (current.state !== 'awaiting_approval' && current.state !== 'proposed') throw new Error(`cannot decide from ${current.state}`);
    if (!['approved', 'rejected'].includes(decision)) throw new Error('invalid decision');
    const contextHash = sha256(canonical(current.proposal));
    if (approverPublicKey || approverSignature) {
      if (!approverPublicKey || !approverSignature) throw new Error('approver public key and signature required together');
      if (!verifyDecision({ publicPem: approverPublicKey, signature: approverSignature, transactionId: tx, decision, note, approver, contextHash })) throw new Error('approver signature invalid');
    }
    append('decision', tx, { decision, approver, note, contextHash, approverPublicKey, approverSignature });
    return get(tx);
  }

  // A permit is signed by the same ledger key but scoped to one transaction.
  function issuePermit(tx, { expiresAt = null } = {}) {
    const current = get(tx);
    if (!current) throw new Error('transaction not found');
    if (current.state !== 'approved') throw new Error(`cannot permit from ${current.state}`);
    const unsignedPermit = {
      permitId: `permit_${crypto.randomUUID()}`,
      transactionId: tx,
      scope: current.proposal.tool,
      issuedAt: new Date().toISOString(),
      expiresAt: expiresAt || new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      recordHash: current.records[current.records.length - 1].hash,
    };
    const permit = { ...unsignedPermit, signature: store.keys.sign(canonical(unsignedPermit)) };
    append('permit.issued', tx, permit);
    return permit;
  }

  // Persist the start marker before invoking any external executor.
  function beginExecution(tx, { permit = null } = {}) {
    const current = get(tx);
    if (!current) throw new Error('transaction not found');
    if (current.state !== 'approved') throw new Error(`cannot execute from ${current.state}`);
    if (current.execution && current.execution.startedAt) throw new Error('execution already started');
    if (permit && permit.transactionId !== tx) throw new Error('permit transaction mismatch');
    if (permit && permit.signature) { const { signature, ...unsigned } = permit; if (!store.keys.verify(canonical(unsigned), signature)) throw new Error('permit signature invalid'); }
    append('execution.started', tx, {
      tool: current.proposal.tool,
      argsHash: sha256(canonical(current.proposal.args)),
      permitId: permit?.permitId || null,
      startedAt: new Date().toISOString(),
    });
    return get(tx);
  }

  function recordResult(tx, result) {
    const current = get(tx);
    if (!current) throw new Error('transaction not found');
    if (current.state !== 'executing') throw new Error(`cannot record result from ${current.state}`);
    append('execution.completed', tx, {
      result,
      resultHash: result.resultHash || sha256(canonical(result)),
      finishedAt: new Date().toISOString(),
    });
    return get(tx);
  }

  function recordFailure(tx, error) {
    const current = get(tx);
    if (!current) throw new Error('transaction not found');
    if (current.state !== 'executing') throw new Error(`cannot record failure from ${current.state}`);
    append('execution.failed', tx, { error: String(error?.message || error), finishedAt: new Date().toISOString() });
    return get(tx);
  }

  async function execute(tx, { permit = null } = {}) {
    const current = beginExecution(tx, { permit: permit || issuePermit(tx) });
    const executor = registry.get(current.proposal.tool);
    if (!executor) {
      recordFailure(tx, new Error(`no executor for ${current.proposal.tool}`));
      return get(tx);
    }
    try {
      const result = await executor.execute({ args: current.proposal.args, transaction: current });
      return recordResult(tx, result);
    } catch (error) {
      return recordFailure(tx, error);
    }
  }

  // A started execution without a terminal record is ambiguous after restart.
  function recover() {
    for (const tx of transactions()) {
      if (tx.state === 'executing') {
        append('execution.ambiguous', tx.transactionId, {
          reason: 'process restarted during execution; result is unknown',
          recoveredAt: new Date().toISOString(),
        });
      }
    }
  }

  function get(tx) {
    const records = store.list().filter((record) => record.transactionId === tx);
    if (!records.length) return null;
    const proposal = records.find((record) => record.kind === 'proposal')?.data || null;
    const decisions = records.filter((record) => record.kind === 'decision');
    const decision = decisions[decisions.length - 1]?.data || null;
    const permit = records.filter((record) => record.kind === 'permit.issued').at(-1)?.data || null;
    const started = records.filter((record) => record.kind === 'execution.started');
    const completed = records.filter((record) => record.kind === 'execution.completed').at(-1);
    const failed = records.filter((record) => record.kind === 'execution.failed').at(-1);
    const ambiguous = records.filter((record) => record.kind === 'execution.ambiguous').at(-1);
    let state = 'proposed';
    if (!decision && proposal && proposal.risk?.behavior === 'require_approval') state = 'awaiting_approval';
    if (decision?.decision === 'rejected') state = 'rejected';
    else if (decision?.decision === 'approved') state = 'approved';
    if (started.length && !completed && !failed && !ambiguous) state = 'executing';
    if (completed) state = 'completed';
    if (failed) state = 'failed';
    if (ambiguous) state = 'ambiguous';
    return {
      transactionId: tx,
      state,
      proposal,
      risk: proposal?.risk || null,
      decision,
      permit,
      execution: {
        startedAt: started[0]?.createdAt || null,
        finishedAt: completed?.data?.finishedAt || failed?.data?.finishedAt || ambiguous?.data?.recoveredAt || null,
        result: completed?.data?.result || null,
        error: failed?.data?.error || ambiguous?.data?.reason || null,
      },
      records,
      terminal: TERMINAL.has(state),
    };
  }

  function transactions() {
    const ids = [...new Set(store.list().map((record) => record.transactionId))];
    return ids.map(get).filter(Boolean);
  }

  function listProposals({ state = null } = {}) { return transactions().filter((tx) => !state || tx.state === state); }
  function exportTo(outDir) { return exportEvidence({ ledger: store, outDir }); }

  return {
    dataDir,
    ledger: store,
    executors: registry,
    propose,
    decide,
    approve: (tx, options = {}) => decide(tx, { ...options, decision: 'approved' }),
    reject: (tx, options = {}) => decide(tx, { ...options, decision: 'rejected' }),
    issuePermit,
    beginExecution,
    recordResult,
    recordFailure,
    execute,
    recover,
    get,
    transactions,
    listProposals,
    exportTo,
  };
}