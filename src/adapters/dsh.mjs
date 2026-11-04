import { createHostAdapter } from '../host-adapter.mjs';

export function createDshAdapter({ service }) {
  const host = createHostAdapter({ service });
  return {
    name: 'deepseek-harness',
    propose: (input) => host.propose(input),
    beforeToolCall: (input) => host.beforeHostToolCall(input),
    approve: (tx, approver) => host.approve(tx, approver),
    reject: (tx, approver, note) => host.reject(tx, approver, note),
    permit: (tx) => host.permitAfterApproval(tx),
    recordResult: (tx, result) => host.recordHostResult(tx, result),
    recordFailure: (tx, error) => host.recordHostFailure(tx, error),
  };
}