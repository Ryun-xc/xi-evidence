export class EvidenceClient {
  constructor({ baseUrl = 'http://127.0.0.1:8790', token }) {
    this.baseUrl = String(baseUrl).replace(/\/+$/, '');
    this.token = token || '';
  }

  async request(pathname, options = {}) {
    const res = await fetch(this.baseUrl + pathname, {
      ...options,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${this.token}`, ...(options.headers || {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  propose(input) { return this.request('/v1/proposals', { method: 'POST', body: JSON.stringify(input) }); }
  list(state = '') { return this.request('/v1/proposals' + (state ? `?state=${encodeURIComponent(state)}` : '')); }
  status(transactionId) { return this.request(`/v1/transactions/${encodeURIComponent(transactionId)}`); }
  approve(transactionId, approver = { id: 'local', type: 'human' }, note = '') { return this.request(`/v1/transactions/${encodeURIComponent(transactionId)}/approve`, { method: 'POST', body: JSON.stringify({ approver, note }) }); }
  reject(transactionId, approver = { id: 'local', type: 'human' }, note = '') { return this.request(`/v1/transactions/${encodeURIComponent(transactionId)}/reject`, { method: 'POST', body: JSON.stringify({ approver, note }) }); }
  permit(transactionId) { return this.request(`/v1/transactions/${encodeURIComponent(transactionId)}/permit`, { method: 'POST', body: '{}' }); }
  execute(transactionId) { return this.request(`/v1/transactions/${encodeURIComponent(transactionId)}/execute`, { method: 'POST', body: '{}' }); }
  export(name = '') { return this.request('/v1/export', { method: 'POST', body: JSON.stringify({ name }) }); }
}