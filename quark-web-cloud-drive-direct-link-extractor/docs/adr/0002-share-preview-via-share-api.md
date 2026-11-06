# 分享预览页用分享 API 提取直链（而非私有下载接口）

分享预览页（`/s/<pwd_id>#/list/share/<fid>`）也要能提取直链。原实现只用私有接口 `file/download`，对他人分享的文件回 21001 —— 因为这些 fid 属于分享者网盘，不在当前账号里。

## Considered Options

- **引导用户先转存到自己网盘**：被拒绝。多一步转存、占用网盘空间，且转存后文件名/目录会变。
- **分享协议三步链**：采纳。`sharepage/token`（pwd_id → stoken）→ `sharepage/detail`（stoken + pdir_fid → 目录项，每项带 `share_fid_token`）→ `file/share/download`（fids + fids_token + pwd_id + stoken → 下载 URL）。均为 `drive-h.quark.cn` 上的公开接口，仅需登录 Cookie。

## Consequences

- 分享页提取依赖三步串联，任一步失败（需提取码、分享失效、凭证缺失）都只能报错，无法降级到私有接口。
- 提取前必须先拉一次目录页（100 条一页，必要时翻页）拿 `share_fid_token`，页面上勾选的 fid 不能直接提交。
- 带提取码的分享：`passcode` 从 URL 的 `pwd`/`passcode` 参数读，读不到就在 token 失败后弹框让用户输入一次并重试。
- 分享页只认 pathname；「我的网盘」「我的分享」用 pathname + hash 判定。用 `location.href` 判定会把分享预览页误判成「我的网盘」，因为它的 hash 也带 `/list`。
