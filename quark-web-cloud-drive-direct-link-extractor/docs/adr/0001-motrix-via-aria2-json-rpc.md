# Motrix Next 通过 aria2 JSON-RPC 接入（而非 MDXP）

脚本需要将直链推送到 Motrix 创建下载任务。最初调研按 MDXP 协议实现（`POST /mdxp`、端口 16801、`download/add` 方法、Bearer 认证），实测 motrix-next 不识别该协议、发送成功但无下载进程。motrix-next 基于 Aria2 Next 引擎，保留 aria2 JSON-RPC 接口，决定改用 aria2 JSON-RPC（`POST /jsonrpc`、默认端口 16800、`aria2.addUri` 方法、`token:` 前缀认证）。

## Considered Options

- **MDXP**（官方新版 Motrix 的协议）：被拒绝。motrix-next 无此协议，且浏览器端需 WebSocket 传输、有握手前置，复杂度高。
- **aria2 JSON-RPC**：采纳。motrix-next 与旧版 Motrix 均兼容，无握手、HTTP POST 单次调用即可。

## Consequences

- 脚本与 motrix-next 的 aria2 JSON-RPC 契约耦合，不兼容官方新版 Motrix（带 CLI bridge 的版本）的 MDXP 协议。
- 直链的 UA / Cookie 以 `["Name: Value", ...]` 字符串数组传入 `header` 选项，下载目录通过 `dir` 选项传入（可省略，用默认目录）。
