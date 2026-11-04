# XI Evidence

本地优先、可独立验证的 AI 治理证据层。

[English](README.en.md)

```text
Status: developer preview (v0.2.0)
Not production-ready. Not audited. No live host integration claimed.
```

```text
AI 宿主提出工具调用
→ XI Evidence 做风险分级
→ 人批准或拒绝
→ 宿主凭短时 permit 执行
→ 记录结果
→ 追加式签名账本
→ 导出
→ 离线验证
```

它不是通用 Agent 运行时。

它只解决一件事：

```text
证明谁在何时批准了什么，
以及导出的记录有没有被修改。
```

---

## 为什么做这个项目

AI 编码 Agent 已经可以：

```text
执行命令
修改文件
部署服务
修改环境变量
```

普通日志只能说明“发生了一件事”。

XI Evidence 要回答：

```text
谁提出的
风险是什么
谁批准的
执行许可是什么
执行结果是什么
导出后有没有被改过
```

---

## 当前范围

### 第一个垂直场景

```text
AI 编码 Agent 的生产变更审批
```

### 第一个宿主

```text
DeepSeek Harness（参考适配器）
```

OpenClaw 只提供接口适配器，不做第一阶段承诺。

### 不包含

```text
通用 Agent 运行时
QQ / 微信 / 钉钉渠道
浏览器自动化
插件市场
模型市场
多租户 SaaS
证据进程内 shell 执行
```

---

## 架构

```text
Host / MCP / Agent
        │
        ▼
XI Evidence Sidecar
  ├─ proposal API
  ├─ risk policy
  ├─ approval state machine
  ├─ signed permit
  ├─ workspace executor
  ├─ append-only signed ledger
  ├─ Git anchor
  ├─ export
  └─ offline verifier
```

导出包：

```text
records.jsonl
manifest.json
public-key.pem
verify.mjs
README.txt
```

账本本身就是 WAL。

状态改变前先追加并 fsync 记录。

如果出现：

```text
execution.started
但没有 completed
```

重启后标记：

```text
ambiguous
```

不会自动重跑。

---

## 信任模型

验证方信任：

```text
带外分发的 Ed25519 公钥指纹
```

验证方不需要信任：

```text
XI Evidence 进程
宿主
数据库
网络
```

可以证明：

```text
记录内部一致
记录由匹配私钥签名
manifest 和记录在导出后未被修改
```

不能单独证明：

```text
签名者在记录时一定诚实
宿主一定报告了真实结果
没有被替换成一份更早的合法导出
```

最后一项需要：

```text
Git 锚定
时间戳
透明日志
TPM / 硬件根
```

---

## 快速开始

需要 Node.js 20+。

```bash
npm test
npm run demo
```

Demo 会生成：

```text
data/demo/export/       合法导出
data/demo/tampered/     被修改的导出，必须验证失败
```

离线验证：

```bash
cd data/demo/export
node verify.mjs
```

独立 Python 验证器：

```bash
python sdk/python/verify.py data/demo/export
```

启动侧车：

```bash
XI_EVIDENCE_DATA=./data node src/server.mjs
```

审批台：

```text
http://127.0.0.1:8790/
```

Token：

```text
data/token
```

默认只监听：

```text
127.0.0.1
```

---

## API

```text
GET  /v1/health
GET  /v1/proposals
POST /v1/proposals
GET  /v1/transactions/:id
POST /v1/transactions/:id/approve
POST /v1/transactions/:id/reject
POST /v1/transactions/:id/permit
POST /v1/transactions/:id/execute
GET  /v1/records
POST /v1/export
```

除 `/v1/health` 外都需要：

```text
Authorization: Bearer <token>
```

或：

```text
x-evidence-token: <token>
```

---

## CLI

```bash
node bin/evidence.mjs list
node bin/evidence.mjs status <transactionId>
node bin/evidence.mjs approve <transactionId> --approver alice
node bin/evidence.mjs reject <transactionId> --approver alice
node bin/evidence.mjs execute <transactionId>
node bin/evidence.mjs export
```

---

## MCP（Cursor 单点）

不需要先启动 sidecar，不需要 URL，不需要 token：

```bash
npx -y xi-evidence-mcp
```

Cursor MCP 配置：

```json
{
  "mcpServers": {
    "xi-evidence": {
      "command": "npx",
      "args": ["-y", "xi-evidence-mcp"]
    }
  }
}
```

模型只能看到四个工具：

```text
xi_guard
xi_status
xi_export
xi_verify
```

没有 approve / reject / execute。

人工审批：

```bash
npx xi-evidence-mcp list
npx xi-evidence-mcp status <id>
npx xi-evidence-mcp approve <id>
npx xi-evidence-mcp reject <id>
npx xi-evidence-mcp export
npx xi-evidence-mcp verify <dir>
```

`xi_guard` 只做风险分级和创建证据事务，不执行、不批准。

它返回：

```text
transactionId
decision
risk
approvalCommand
```

如果风险是 `require_approval`，必须由人运行审批命令。

### 重要限制

MCP 不是宿主 hook。

它不能自动拦截 Cursor 原生 shell。

只有模型主动调用 `xi_guard`，或所有执行都经过受控工具，才有审批保护。

如果模型能执行任意 shell，它也能调用 CLI 的 `approve`。真正的审批边界必须在模型 shell 之外。

见 [MCP.md](MCP.md)。

---

## 风险策略

```text
只读工具        → allow
workspace.write → require_approval
shell.exec      → high / approval
device.control  → deny
未知工具        → high
```

模型可以建议风险，但最终由确定性策略和审批人决定。

---

## 状态机

```text
proposed
→ awaiting_approval
→ approved
→ executing
→ completed / failed / rejected / ambiguous
```

规则：

```text
没有批准不执行
没有 permit 不执行
重启后 started 没有 completed → ambiguous
不盲目重试
```

---

## 证据格式

见：

```text
SPEC.md
SCHEMA.md
evidence.schema.json
```

每条记录：

```text
schemaVersion
recordId
sequence
previousHash
createdAt
kind
transactionId
actor
data
hash
signature
```

---

## 审批人身份

默认审批人只是标签：

```json
{ "id": "alice", "type": "human" }
```

这还不是密码学身份。

可选审批人签名支持：

```text
Ed25519
contextHash
独立 approverPublicKey
独立 approverSignature
```

见 `IDENTITY.md`。

还没有：

```text
WebAuthn
SSO
撤销
密钥轮换 UI
```

---

## Git 锚定

```bash
node bin/anchor.mjs anchor --export data/demo/export --repo data/anchor
node bin/anchor.mjs verify --export data/demo/export --repo data/anchor
```

纯本地锚点仍然只是本地信任点；更强的方式是推到远程仓库或使用时间戳/透明日志。

---

## 测试

```text
canonical JSON
ledger chain + signatures
risk policy
approval / execute
crash recovery → ambiguous
tamper detection
HTTP sidecar
Node SDK
host adapter
DSH / OpenClaw interface
offline verifier CLI
Git anchor
approver signature
CLI
independent Python verifier
MCP
```

```bash
npm test
```

---

## 当前完成度

```text
Gate A  信任模型 / Schema          完成
Gate B  签名账本 / 离线验证        完成
Gate C  WAL / 风险 / permit / UI   完成
Gate D  HTTP / SDK / MCP / 参考适配 完成到参考实现
Gate E  本地网络 / TLS / 干净目录   完成
```

外部验收未完成：

```text
真实 DSH hook
真实 OpenClaw 接入
第三方安全审计
真实用户试点
第二维护者
远程透明日志 / TPM
WebAuthn / SSO
干净 Windows VM
```

见：

```text
EXTERNAL-GATES.md
STATUS.md
```

---

## 这不是什么

```text
不是生产级
不是合规认证
没有外部锚点时不是不可篡改
不替代宿主自己的沙箱
不是通用 Agent 平台
```

---

## 文档

```text
SPEC.md
SCHEMA.md
evidence.schema.json
THREAT-MODEL.md
SECURITY.md
HOST-ADAPTER.md
DEMO.md
ANCHOR.md
IDENTITY.md
AUDIT.md
PILOT.md
STATUS.md
EXTERNAL-GATES.md
GOVERNANCE.md
CONTRIBUTING.md
CHANGELOG.md
```

---

## License

Apache-2.0

Copyright 2026 周润程 (Runcheng Zhou)