import { createHostAdapter } from '../host-adapter.mjs';

// Contract adapter only. A live OpenClaw integration requires its tool-call hook API.
export function createOpenClawAdapter({ service }) {
  const host = createHostAdapter({ service });
  return {
    name: 'openclaw',
    propose: (input) => host.propose(input),
    beforeToolCall: (input) => host.beforeHostToolCall(input),
    approve: (tx, approver) => host.approve(tx, approver),
    reject: (tx, approver, note) => host.reject(tx, approver, note),
    permit: (tx) => host.permitAfterApproval(tx),
    recordResult: (tx, result) => host.recordHostResult(tx, result),
    recordFailure: (tx, error) => host.recordHostFailure(tx, error),
  };
}