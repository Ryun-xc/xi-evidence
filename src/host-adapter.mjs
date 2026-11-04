import { canonical } from './canonical.mjs';

export function createHostAdapter({ service }) {
  if (!service) throw new Error('service required');
  return {
    async propose(input) { return service.propose(input); },
    async approve(tx, approver) { return service.approve(tx, { approver }); },
    async reject(tx, approver, note = '') { return service.reject(tx, { approver, note }); },
    async permit(tx) { return service.issuePermit(tx); },
    async execute(tx, permit = null) { return service.execute(tx, { permit }); },
    async beforeHostToolCall({ tool, args, intent, actor }) {
      const transaction = service.propose({ tool, args, intent, actor });
      return {
        transactionId: transaction.transactionId,
        state: transaction.state,
        risk: transaction.risk,
        requiresApproval: transaction.state === 'awaiting_approval',
      };
    },
    async permitAfterApproval(tx) { return service.issuePermit(tx); },
    async recordHostResult(tx, result) {
      const current = service.get(tx);
      if (!current) throw new Error('transaction not found');
      if (current.state !== 'executing') service.beginExecution(tx);
      return service.recordResult(tx, result);
    },
    async recordHostFailure(tx, error) {
      const current = service.get(tx);
      if (!current) throw new Error('transaction not found');
      if (current.state !== 'executing') service.beginExecution(tx);
      return service.recordFailure(tx, error);
    },
  };
}

export function assertPermit(permit, { transactionId = null, keys = null } = {}) {
  if (!permit || !permit.permitId) throw new Error('permit required');
  if (transactionId && permit.transactionId !== transactionId) throw new Error('permit transaction mismatch');
  if (permit.expiresAt && Date.parse(permit.expiresAt) < Date.now()) throw new Error('permit expired');
  if (keys) {
    const { signature, ...unsigned } = permit;
    if (!signature || !keys.verify(canonical(unsigned), signature)) throw new Error('permit signature invalid');
  }
  return true;
}