# Quark Web Cloud Drive Direct Link Extractor

夸克网盘网页版直链提取器。用户通过网页 UI 选取文件，脚本从夸克后端获取直链，并提供外部下载器所需的认证配置。

## 语言

### 核心实体

**直链（Direct Link）**：
可直接下载文件的 URL，由夸克 API 返回。浏览器可直接触发下载（单线程，适合小文件）；复制链接到外部下载器必须带 UA 和 Cookie，否则 403。
_Avoid_：下载链接、分享链接

**文件（File）**：
夸克网盘中存储的单个文件实体。区别于文件夹（folder），只有文件可提取直链。
_Avoid_：条目、项目

**FID（File Identifier）**：
夸克系统中标识文件的内部 ID。文件列表中的每个文件都有一个唯一的 fid。
_Avoid_：文件 ID、ID

**文件夹（Folder）**：
夸克网盘中包含文件的容器。文件夹本身不可提取直链。

**下载 URL（Download URL）**：
API 返回的包含鉴权信息的实际下载地址。通常扩展名被移除，需要脚本补全。

### 用户交互

**文件选择（File Selection）**：
用户在网页文件列表中勾选文件的操作。脚本通过 React Fiber 读取 `selectedRowKeys` 获取选中的 FID 列表。
_Avoid_：选中、勾选

**分享预览（Share Preview）**：
他人分享链接的只读页面（`/s/` 路径）。此页面不支持直链提取，需先"保存到我的网盘"。
_Avoid_：分享页、分享链接

**我的网盘（My Cloud Drive）**：
用户已登录的私有网盘空间（`/list` 路径）。直链提取仅在此页面可用。

**直接下载（Direct Download）**：
使用浏览器自带下载直接下载直链。单线程、速度受限，仅适合小文件。
_Avoid_：浏览器下载

**发送到（Send To）**：
将直链通过下载器 API 推送到外部下载器创建任务，自动携带 UA 与 Cookie。大文件下载的主路径。
_Avoid_：推送到下载器

**复制配置（Copy Configuration）**：
一次复制某文件的「链接 + UA + Cookie」组合文本，供未接入的下载器（如 IDM）手动添加任务。
_Avoid_：复制链接（纯链接粘贴到下载器会 403）

**表头工具栏（List Toolbar）**：
直链结果面板顶部的工具栏，左侧显示文件统计（数量/总大小），右侧为批量发送与设置入口，与文件列表同属一张卡片。

### 下载基础设施

**外部下载器（External Downloader）**：
支持自定义 UA 和 Header 的第三方下载工具。包括 Gopeed、Motrix Next、IDM（Internet Download Manager）。每个下载器通过各自独立的 API 契约接入，脚本为其维护独立的连接配置（地址、端口、Token）。

**Motrix Next**：
脚本实际对接的下载器（Tauri + Aria2 Next 重写版）。通过 aria2 JSON-RPC（`/jsonrpc`，默认端口 16800）接入，兼容旧版 Motrix，不兼容官方新版 Motrix 的 MDXP 协议。
_Avoid_：Motrix、MDXP、Aria2 原生

**下载配置（Download Configuration）**：
在外部下载器中使用直链时必须提供的两项认证信息：UA 和 Cookie。缺少任一都会导致 403。

**UA（User-Agent）**：
HTTP 请求头中的客户端标识。需设置为夸克官方客户端 UA 字符串，否则直链返回 403。

**Cookie**：
HTTP 请求头中的认证凭据。绑定了当前登录用户的身份，直链下载时必须通过 Cookie 验证。

### 技术实现

**React Fiber**：
React 的内部渲染机制。脚本通过遍历 DOM 节点的 `__reactFiber$` 属性来获取文件列表组件实例及其属性。

**夸克 API（Quark Drive API）**：
`POST https://drive.quark.cn/1/clouddrive/file/download`。接受 FID 列表，返回下载 URL 列表。响应 code 0 表示成功，31001 表示未登录。

**CSS 作用域（CSS Scope）**：
脚本注入的样式使用 `okv-` 前缀命名空间，避免与夸克原生样式冲突。