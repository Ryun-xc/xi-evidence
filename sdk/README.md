# SDK

Node client:

```js
import { EvidenceClient } from './sdk/node.mjs';

const client = new EvidenceClient({
  baseUrl: 'http://127.0.0.1:8790',
  token: process.env.XI_EVIDENCE_TOKEN,
});

const { transaction } = await client.propose({
  tool: 'workspace.write',
  args: { name: 'hello.md', content: 'hello' },
  intent: 'create a file',
});

await client.approve(transaction.transactionId, { id: 'alice', type: 'human' });
await client.execute(transaction.transactionId);
```

Python offline verifier:

```bash
python sdk/python/verify.py data/demo/export
```

The Python verifier is an independent implementation and does not import the Node code.