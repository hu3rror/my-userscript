// ==UserScript==
// @name                    Quark Web Cloud Drive Direct Link Extractor
// @name:zh-CN              夸克网盘网页版直链提取器
// @namespace               https://github.com/hu3rror
// @version                 1.2.1
// @description             Extract direct download links from Quark Web Cloud Drive, push to Gopeed/Motrix or copy full config (URL+UA+Cookie) for manual use.
// @description:zh-CN       在夸克网盘网页版中批量提取文件的直接下载链接，支持一键推送至外部下载器（Gopeed/Motrix）创建下载任务，或复制链接+UA+Cookie 完整配置供手动使用。
// @author                  Hu3rror
// @match                   *://pan.quark.cn/*
// @license                 MIT
// @run-at                  document-end
// @require                 https://lib.baomitu.com/jquery/1.12.4/jquery.min.js
// @require                 https://lib.baomitu.com/limonte-sweetalert2/11.4.7/sweetalert2.all.min.js
// @grant                   GM_xmlhttpRequest
// @grant                   GM_setClipboard
// @grant                   GM_setValue
// @grant                   GM_getValue
// @grant                   unsafeWindow
// @connect                 quark.cn
// @connect                 drive.quark.cn
// @connect                 127.0.0.1
// @connect                 localhost
// @downloadURL             https://raw.githubusercontent.com/hu3rror/my-userscript/main/quark-web-cloud-drive-direct-link-extractor/quark-web-cloud-drive-direct-link-extractor.user.js
// @updateURL               https://raw.githubusercontent.com/hu3rror/my-userscript/main/quark-web-cloud-drive-direct-link-extractor/quark-web-cloud-drive-direct-link-extractor.user.js
// @homepageURL             https://github.com/hu3rror/my-userscript
// ==/UserScript==

(function () {
    'use strict';

    // 官方 Gopeed 提取的客户端真实 UA
    const REAL_QUARK_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) quark-cloud-drive/2.5.20 Chrome/100.0.4896.160 Electron/18.3.5.4-b478491100 Safari/537.36 Channel/pckk_other_ch";

    // ================== CSS 样式注入 ==================
    const injectStyles = () => {
        const styles = `
            /* ===== 视觉变量（夸克品牌） ===== */
            .okv-panel,
            .swal2-popup {
                --okv-primary: #00caab;
                --okv-primary-hover: #00b59a;
                --okv-primary-weak: #e6faf7;
                --okv-text: rgba(0, 0, 0, 0.85);
                --okv-text-secondary: rgba(0, 0, 0, 0.55);
                --okv-border: #f0f0f0;
            }

            /* ===== Swal 全局统一（夸克视觉语言） ===== */
            .swal2-popup {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
                border-radius: 12px;
                padding: 24px 20px;
            }
            .swal2-title {
                font-size: 18px;
                color: var(--okv-text);
            }
            .swal2-styled {
                font-size: 14px;
                border-radius: 6px;
                font-weight: 500;
            }
            .swal2-confirm {
                background-color: var(--okv-primary) !important;
            }
            .swal2-confirm:hover {
                background-color: var(--okv-primary-hover) !important;
            }
            .swal2-input {
                border-radius: 6px;
            }

            /* ===== 表头工具栏 ===== */
            .okv-toolbar {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                padding: 10px 14px;
                margin-bottom: 14px;
                background: var(--okv-primary-weak);
                border-radius: 8px;
            }
            .okv-toolbar-info {
                font-size: 13px;
                color: var(--okv-text);
                white-space: nowrap;
            }
            .okv-toolbar-info b {
                color: var(--okv-primary);
                font-weight: 600;
            }
            .okv-toolbar-actions {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap;
                justify-content: flex-end;
            }

            /* ===== 按钮（Ant 风格） ===== */
            .okv-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
                height: 30px;
                padding: 0 14px;
                border-radius: 6px;
                border: 1px solid transparent;
                font-size: 13px;
                line-height: 1;
                cursor: pointer;
                transition: all 0.2s;
                white-space: nowrap;
                user-select: none;
            }
            .okv-btn:active {
                opacity: 0.85;
            }
            .okv-btn-sm {
                height: 26px;
                padding: 0 10px;
                font-size: 12px;
            }
            .okv-btn-primary {
                background: var(--okv-primary);
                color: #fff;
                border-color: var(--okv-primary);
            }
            .okv-btn-primary:hover {
                background: var(--okv-primary-hover);
                border-color: var(--okv-primary-hover);
            }
            .okv-btn-default {
                background: #fff;
                color: var(--okv-text);
                border-color: #d9d9d9;
            }
            .okv-btn-default:hover {
                color: var(--okv-primary);
                border-color: var(--okv-primary);
            }
            .okv-btn-link {
                background: transparent;
                color: var(--okv-primary);
                border-color: transparent;
                padding: 0 8px;
            }
            .okv-btn-link:hover {
                background: var(--okv-primary-weak);
            }

            /* ===== 文件列表 ===== */
            .okv-table-wrap {
                max-height: 360px;
                overflow-y: auto;
            }
            .okv-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 13px;
            }
            .okv-table th {
                position: sticky;
                top: 0;
                z-index: 1;
                padding: 10px 12px;
                text-align: left;
                font-weight: 500;
                color: var(--okv-text-secondary);
                background: #fafafa;
                border-bottom: 1px solid var(--okv-border);
                white-space: nowrap;
            }
            .okv-table td {
                padding: 10px 12px;
                border-bottom: 1px solid var(--okv-border);
                color: var(--okv-text);
                vertical-align: middle;
            }
            .okv-table tbody tr {
                transition: background 0.15s;
            }
            .okv-table tbody tr:hover {
                background: #f6fffd;
            }
            .okv-table tbody tr:last-child td {
                border-bottom: none;
            }
            .okv-file-name {
                display: inline-block;
                max-width: 220px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                vertical-align: middle;
            }
            .okv-row-actions {
                display: flex;
                align-items: center;
                gap: 6px;
                white-space: nowrap;
            }

            /* ===== 底部提示 ===== */
            .okv-hint {
                margin-top: 12px;
                font-size: 12px;
                color: var(--okv-text-secondary);
                line-height: 1.6;
            }

            /* ===== 发送到选择菜单 ===== */
            .okv-pick-btn {
                width: 100%;
                height: 40px;
                margin: 4px 0;
                font-size: 14px;
            }

            /* ===== 复制配置小窗 ===== */
            .okv-copy-dialog p {
                font-size: 13px;
                color: var(--okv-text-secondary);
                margin: 0 0 10px;
                text-align: left;
            }

            /* ===== 下载器设置 ===== */
            .okv-config-dialog {
                text-align: left;
            }
            .okv-config-dialog .swal2-input {
                width: 100%;
                max-width: 100%;
                min-width: 0;
                box-sizing: border-box;
                margin: 4px 0 0; /* 清除 swal2-input 默认 1em 2em 外边距，避免横向溢出 */
                font-size: 14px;
            }
            .okv-config-section {
                font-size: 14px;
                font-weight: 600;
                color: var(--okv-text);
                margin: 16px 0 8px;
            }
            .okv-config-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px 12px;
            }
            .okv-config-field {
                min-width: 0;
            }
            .okv-config-field label {
                display: block;
                font-size: 12px;
                color: var(--okv-text-secondary);
                margin-bottom: 4px;
            }
            .okv-config-hint {
                font-size: 11px;
                color: var(--okv-text-secondary);
                margin-top: 6px;
            }
            .okv-guide {
                background: var(--okv-primary-weak);
                border: 1px solid rgba(0, 202, 171, 0.3);
                border-radius: 8px;
                padding: 10px 12px;
                margin-bottom: 14px;
                text-align: left;
            }
            .okv-guide h4 {
                margin: 0 0 8px;
                font-size: 13px;
                font-weight: 600;
                color: var(--okv-primary);
            }
            .okv-guide p {
                margin: 0 0 4px;
                font-size: 12px;
                color: var(--okv-text);
                line-height: 1.6;
            }
        `;
        const styleSheet = document.createElement("style");
        styleSheet.innerText = styles;
        document.head.appendChild(styleSheet);
    };

    // ================== 基础工具 ==================
    const sizeFormat = (value) => {
        if (typeof value === 'number' && !isNaN(value)) {
            let unit = ["B", "KB", "MB", "GB", "TB"], index = Math.floor(Math.log(value) / Math.log(1024));
            return `${(value / Math.pow(1024, index)).toFixed(2)} ${unit[index]}`;
        }
        return "";
    };

    const sleep = time => new Promise(resolve => setTimeout(resolve, time * 1000));

    const autoLazyload = (is_ok, callback, time = 0.5) => {
        if (is_ok()) {
            callback();
        } else {
            setTimeout(() => autoLazyload(is_ok, callback, time), time * 1000);
        }
    };

    // React Fiber 节点属性解析器 (用于获取页面中已选择的文件列表)
    const getReact = (dom, traverseUp = 0) => {
        if (!dom) return null;
        const domFiber = dom[Object.keys(dom).find(key => key.startsWith("__reactFiber$") || key.startsWith("__reactInternalInstance$"))];
        if (!domFiber) return null;
        if (domFiber._currentElement) {
            let compFiber = domFiber._currentElement._owner;
            for (let i = 0; i < traverseUp; i++) compFiber = compFiber._currentElement._owner;
            return compFiber._instance;
        }
        const GetCompFiber = fiber => {
            let parentFiber = fiber.return;
            while (parentFiber && typeof parentFiber.type === "string") {
                parentFiber = parentFiber.return;
            }
            return parentFiber;
        };
        let compFiber = GetCompFiber(domFiber);
        for (let i = 0; i < traverseUp; i++) {
            if (compFiber) compFiber = GetCompFiber(compFiber);
        }
        return compFiber ? (compFiber.stateNode || compFiber) : null;
    };

    // ================== API 接口交互 ==================
    const quarkDirect = (fids) => {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                url: "https://drive.quark.cn/1/clouddrive/file/download?pr=ucpro&fr=pc",
                method: "POST",
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    "User-Agent": "quark-cloud-drive"
                },
                data: JSON.stringify({ fids: fids }),
                onload: res => {
                    try {
                        resolve(JSON.parse(res.responseText));
                    } catch (e) {
                        resolve(res.responseText);
                    }
                },
                onerror: err => reject(err)
            });
        });
    };

    // ================== 下载器配置管理 ==================
    const DOWNLOADER_DEFAULTS = {
        gopeed_host: '127.0.0.1',
        gopeed_port: '9999',
        gopeed_token: '',
        motrix_host: '127.0.0.1',
        motrix_port: '16800',
        motrix_secret: '',
        motrix_save_dir: '',
        batch_concurrency: 0
    };

    const getDownloaderConfig = () => {
        const cfg = {};
        for (const [key, def] of Object.entries(DOWNLOADER_DEFAULTS)) {
            cfg[key] = GM_getValue(key, def);
        }
        return cfg;
    };

    const saveDownloaderConfig = (cfg) => {
        for (const [key, value] of Object.entries(cfg)) {
            GM_setValue(key, value);
        }
        GM_setValue('okv_config_initialized', true);
    };

    const DOWNLOADER_NAMES = { gopeed: 'Gopeed', motrix: 'Motrix' };

    const validateDownloaderConfig = (downloader, config) => {
        if (downloader === 'gopeed' && (!config.gopeed_host || !config.gopeed_port)) {
            return '请先配置 Gopeed 连接信息';
        }
        if (downloader === 'motrix' && (!config.motrix_host || !config.motrix_port)) {
            return '请先配置 Motrix 连接信息';
        }
        return null;
    };

    // ================== 下载器 API 交互 ==================
    const sendToGopeed = (url, config) => {
        return new Promise((resolve, reject) => {
            const endpoint = `http://${config.gopeed_host}:${config.gopeed_port}/api/v1/tasks`;
            const headers = { 'Content-Type': 'application/json' };
            if (config.gopeed_token) {
                headers['X-Api-Token'] = config.gopeed_token;
            }
            GM_xmlhttpRequest({
                url: endpoint,
                method: 'POST',
                headers: headers,
                data: JSON.stringify({
                    req: {
                        url: url,
                        extra: {
                            header: {
                                'User-Agent': REAL_QUARK_UA,
                                'Cookie': document.cookie
                            }
                        }
                    }
                }),
                onload: res => {
                    try {
                        resolve(JSON.parse(res.responseText));
                    } catch (e) {
                        resolve(res.responseText);
                    }
                },
                onerror: err => reject(err)
            });
        });
    };

    const sendToMotrix = (url, config) => {
        return new Promise((resolve, reject) => {
            const endpoint = `http://${config.motrix_host}:${config.motrix_port}/jsonrpc`;
            const options = {
                header: [
                    `User-Agent: ${REAL_QUARK_UA}`,
                    `Cookie: ${document.cookie}`
                ]
            };
            if (config.motrix_save_dir) {
                options.dir = config.motrix_save_dir;
            }
            const params = config.motrix_secret
                ? ['token:' + config.motrix_secret, [url], options]
                : [[url], options];
            GM_xmlhttpRequest({
                url: endpoint,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'aria2.addUri',
                    params: params
                }),
                onload: res => {
                    try {
                        resolve(JSON.parse(res.responseText));
                    } catch (e) {
                        resolve(res.responseText);
                    }
                },
                onerror: err => reject(err)
            });
        });
    };

    const sendSingleToDownloader = async (url, downloader, config) => {
        const cfgError = validateDownloaderConfig(downloader, config);
        if (cfgError) {
            return { error: cfgError };
        }
        try {
            if (downloader === 'gopeed') {
                return await sendToGopeed(url, config);
            }
            if (downloader === 'motrix') {
                return await sendToMotrix(url, config);
            }
        } catch (err) {
            return { error: err && err.message ? err.message : String(err) };
        }
        return { error: `未知下载器: ${downloader}` };
    };

    const sendBatchToDownloader = async (urls, downloader, config) => {
        const concurrency = config.batch_concurrency || urls.length;
        const results = { success: 0, fail: 0, errors: [] };

        for (let i = 0; i < urls.length; i += concurrency) {
            const batch = urls.slice(i, i + concurrency);
            const batchResults = await Promise.allSettled(
                batch.map(url => sendSingleToDownloader(url, downloader, config))
            );
            batchResults.forEach(r => {
                if (r.status === 'fulfilled' && !r.value.error) {
                    results.success++;
                } else {
                    results.fail++;
                    results.errors.push(r.status === 'fulfilled' ? r.value.error : r.reason);
                }
            });
        }
        return results;
    };

    const showConfigDialog = (firstTime = false) => {
        const cfg = getDownloaderConfig();
        const guideHtml = firstTime ? `
            <div class="okv-guide">
                <h4>首次使用引导</h4>
                <p><b>Gopeed</b>：设置 → 高级 → 通信协议 → 改为 TCP，记下端口号</p>
                <p><b>Motrix / Aria2</b>：填 RPC 端口（默认 16800），兼容 aria2 JSON-RPC 的下载器</p>
                <p>下载目录可留空，将使用下载器的默认下载目录</p>
            </div>
        ` : '';

        Swal.fire({
            title: '下载器设置',
            width: '600px',
            html: guideHtml + `
                <div class="okv-panel okv-config-dialog">
                    <div class="okv-config-section">Gopeed</div>
                    <div class="okv-config-grid">
                        <div class="okv-config-field">
                            <label>地址</label>
                            <input id="swal-gopeed-host" class="swal2-input" value="${cfg.gopeed_host}">
                        </div>
                        <div class="okv-config-field">
                            <label>端口</label>
                            <input id="swal-gopeed-port" class="swal2-input" value="${cfg.gopeed_port}">
                        </div>
                    </div>
                    <div class="okv-config-field" style="margin-top:10px;">
                        <label>API Token（可选）</label>
                        <input id="swal-gopeed-token" class="swal2-input" placeholder="留空则不使用" value="${cfg.gopeed_token}">
                    </div>

                    <div class="okv-config-section">Motrix / Aria2</div>
                    <div class="okv-config-grid">
                        <div class="okv-config-field">
                            <label>地址</label>
                            <input id="swal-motrix-host" class="swal2-input" value="${cfg.motrix_host}">
                        </div>
                        <div class="okv-config-field">
                            <label>RPC 端口</label>
                            <input id="swal-motrix-port" class="swal2-input" value="${cfg.motrix_port}">
                        </div>
                    </div>
                    <div class="okv-config-grid" style="margin-top:10px;">
                        <div class="okv-config-field">
                            <label>RPC Secret（可选）</label>
                            <input id="swal-motrix-secret" class="swal2-input" placeholder="留空则不使用" value="${cfg.motrix_secret}">
                        </div>
                        <div class="okv-config-field">
                            <label>下载目录（可选）</label>
                            <input id="swal-motrix-save-dir" class="swal2-input" placeholder="留空用默认目录" value="${cfg.motrix_save_dir}">
                        </div>
                    </div>

                    <div class="okv-config-section">高级</div>
                    <div class="okv-config-field">
                        <label>同时发送任务数（0=全部）</label>
                        <input id="swal-batch-concurrency" class="swal2-input" type="number" min="0" value="${cfg.batch_concurrency}">
                    </div>
                    <p class="okv-config-hint">设为 0 则全部同时发送，设为 3 则每次发送 3 个任务</p>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: '保存',
            cancelButtonText: '取消',
            confirmButtonColor: '#00caab',
            focusConfirm: false,
            preConfirm: () => {
                return {
                    gopeed_host: document.getElementById('swal-gopeed-host').value.trim() || DOWNLOADER_DEFAULTS.gopeed_host,
                    gopeed_port: document.getElementById('swal-gopeed-port').value.trim() || DOWNLOADER_DEFAULTS.gopeed_port,
                    gopeed_token: document.getElementById('swal-gopeed-token').value.trim() || '',
                    motrix_host: document.getElementById('swal-motrix-host').value.trim() || DOWNLOADER_DEFAULTS.motrix_host,
                    motrix_port: document.getElementById('swal-motrix-port').value.trim() || DOWNLOADER_DEFAULTS.motrix_port,
                    motrix_secret: document.getElementById('swal-motrix-secret').value.trim() || '',
                    motrix_save_dir: document.getElementById('swal-motrix-save-dir').value.trim() || '',
                    batch_concurrency: parseInt(document.getElementById('swal-batch-concurrency').value) || 0
                };
            }
        }).then(result => {
            if (result.isConfirmed) {
                saveDownloaderConfig(result.value);
                Swal.fire({ icon: 'success', title: '配置已保存', timer: 1500, showConfirmButton: false });
            }
        });
    };

    // ================== UI 交互模块 ==================
    const quarkBtn = `
        <div class="ovk-main" style="margin-right: 10px; display: inline-block;">
            <button type="button" class="ant-btn btn-file okv-btn-direct" style="display: inline-flex; align-items: center; justify-content: center; background-color: #00caab; color: white; border: none; border-radius: 6px; padding: 4px 15px; height: 32px; font-weight: 500; cursor: pointer;">
                <svg width="16" height="16" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 2-2M11 3v10"/>
                    <path d="M14 8h1.553c.85 0 1.16.093 1.47.267.311.174.556.43.722.756.166.326.255.65.255 1.54v4.873c0 .892-.089 1.215-.255 1.54-.166.327-.41.583-.722.757-.31.174-.62.267-1.47.267H6.447c-.85 0-1.16-.093-1.47-.267a1.778 1.778 0 01-.722-.756c-.166-.326-.255-.65-.255-1.54v-4.873c0-.892.089-1.215.255-1.54.166-.327.41-.583.722-.757.31-.174.62-.267 1.47-.267H11"/>
                </svg>
                <span>获取直链</span>
            </button>
        </div>
    `;

    const generateDom = (list) => {
        const totalSize = list.reduce((sum, e) => sum + (e.size || 0), 0);
        let rows = "";
        list.forEach(e => {
            rows += `
            <tr>
                <td><span class="okv-file-name" title="${e.file_name}">${e.file_name}</span></td>
                <td>${sizeFormat(e.size)}</td>
                <td>
                    <div class="okv-row-actions">
                        <button class="okv-btn okv-btn-primary okv-btn-sm quark-send-to" data-url="${e.download_url}">发送到</button>
                        <button class="okv-btn okv-btn-default okv-btn-sm quark-down-item" data-url="${e.download_url}">直接下载</button>
                        <button class="okv-btn okv-btn-link okv-btn-sm quark-copy-config" data-url="${e.download_url}">复制配置</button>
                    </div>
                </td>
            </tr>`;
        });

        return `
        <div class="okv-panel">
            <div class="okv-toolbar">
                <div class="okv-toolbar-info">共 <b>${list.length}</b> 个文件 · 总大小 <b>${sizeFormat(totalSize)}</b></div>
                <div class="okv-toolbar-actions">
                    <button class="okv-btn okv-btn-primary okv-btn-sm quark-batch-gopeed">发送到 Gopeed</button>
                    <button class="okv-btn okv-btn-primary okv-btn-sm quark-batch-motrix">发送到 Motrix</button>
                    <button class="okv-btn okv-btn-default okv-btn-sm okv-settings-btn" title="下载器设置">⚙ 设置</button>
                </div>
            </div>

            <div class="okv-table-wrap">
                <table class="okv-table">
                    <thead>
                        <tr>
                            <th>文件名</th>
                            <th>大小</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>

            <div class="okv-hint">复制配置：弹出复制 链接 / UA / Cookie，供 IDM 等未接入下载器手动添加任务</div>
        </div>`;
    };

    // ================== 功能实现模块 ==================
    // 存储最后一次提取的数据，供批量发送使用
    let _lastData = [];

    const getQuarkSelectedFile = () => {
        let selectedList = [];
        try {
            let reactDom = document.getElementsByClassName("file-list")[0];
            let instance = getReact(reactDom);
            let props = instance ? instance.props : null;
            if (props) {
                let fileList = props.list || [];
                let selectedKeys = props.selectedRowKeys || [];
                fileList.forEach(val => {
                    if (selectedKeys.includes(val.fid)) {
                        selectedList.push(val);
                    }
                });
            }
        } catch (e) {
            console.error("解析选中文件失败:", e);
        }
        return selectedList;
    };

    const bindCommonEvents = (data) => {
        if (data) _lastData = data;

        $(document).off("click", ".quark-down-item").on("click", ".quark-down-item", e => {
            window.open(e.target.dataset.url, "_blank");
        });

        // 复制配置：弹出小窗，可分别复制链接 / UA / Cookie
        $(document).off("click", ".quark-copy-config").on("click", ".quark-copy-config", function () {
            showCopyConfigDialog(this.dataset.url);
        });

        // ================== 发送到下载器（选择菜单） ==================
        $(document).off("click", ".quark-send-to").on("click", ".quark-send-to", function () {
            const url = this.dataset.url;
            Swal.fire({
                title: '发送到下载器',
                html: `
                    <div class="okv-panel" style="padding: 5px;">
                        <button id="okv-pick-gopeed" class="okv-btn okv-btn-primary okv-pick-btn">Gopeed</button>
                        <button id="okv-pick-motrix" class="okv-btn okv-btn-primary okv-pick-btn">Motrix</button>
                    </div>`,
                showConfirmButton: false,
                showCloseButton: true,
                didOpen: () => {
                    document.getElementById('okv-pick-gopeed').onclick = () => {
                        Swal.close();
                        handleSingleSend(url, 'gopeed');
                    };
                    document.getElementById('okv-pick-motrix').onclick = () => {
                        Swal.close();
                        handleSingleSend(url, 'motrix');
                    };
                }
            });
        });

        // ================== 单个发送到下载器 ==================
        const handleSingleSend = async (url, downloader) => {
            const config = getDownloaderConfig();
            const cfgError = validateDownloaderConfig(downloader, config);
            if (cfgError) {
                showConfigDialog(true);
                return;
            }
            const name = DOWNLOADER_NAMES[downloader] || downloader;

            Swal.fire({
                title: '正在发送到 ' + name + '...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const result = await sendSingleToDownloader(url, downloader, config);
            Swal.close();

            if (result.error) {
                const msg = typeof result.error === 'object' && result.error.message ? result.error.message : String(result.error);
                Swal.fire({ icon: 'error', title: '发送失败', text: msg });
            } else if (result.code !== undefined && result.code !== 0) {
                Swal.fire({ icon: 'error', title: '发送失败', text: `下载器返回错误 (${result.code})` });
            } else {
                Swal.fire({ icon: 'success', title: '已发送到 ' + name, timer: 1500, showConfirmButton: false });
            }
        };

        // ================== 批量发送到下载器 ==================
        const handleBatchSend = async (downloader) => {
            const config = getDownloaderConfig();
            const cfgError = validateDownloaderConfig(downloader, config);
            if (cfgError) {
                showConfigDialog(true);
                return;
            }
            const name = DOWNLOADER_NAMES[downloader] || downloader;

            const urls = _lastData.map(e => e.download_url).filter(Boolean);
            if (urls.length === 0) {
                Swal.fire({ icon: 'warning', title: '提示', text: '没有可发送的文件' });
                return;
            }

            const confirm = await Swal.fire({
                icon: 'question',
                title: '确认批量发送',
                text: `将 ${urls.length} 个文件发送到 ${name}，是否继续？`,
                showCancelButton: true,
                confirmButtonText: '发送',
                cancelButtonText: '取消',
                confirmButtonColor: '#00caab'
            });
            if (!confirm.isConfirmed) return;

            Swal.fire({
                title: '正在批量发送...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const results = await sendBatchToDownloader(urls, downloader, config);
            Swal.close();

            if (results.fail === 0) {
                Swal.fire({ icon: 'success', title: '全部发送成功', text: `${results.success} 个文件已发送到 ${name}` });
            } else if (results.success === 0) {
                Swal.fire({ icon: 'error', title: '全部发送失败', text: `${results.fail} 个文件发送失败，请检查下载器状态` });
            } else {
                Swal.fire({ icon: 'warning', title: '部分成功', text: `${results.success} 成功，${results.fail} 失败` });
            }
        };

        $(document).off("click", ".quark-batch-gopeed").on("click", ".quark-batch-gopeed", () => {
            handleBatchSend('gopeed');
        });

        $(document).off("click", ".quark-batch-motrix").on("click", ".quark-batch-motrix", () => {
            handleBatchSend('motrix');
        });

        // ================== 设置按钮 ==================
        $(document).off("click", ".okv-settings-btn").on("click", ".okv-settings-btn", () => {
            showConfigDialog();
        });
    };

    // 展示直链结果面板（供复制配置小窗"返回"时重新打开）
    const showResultPanel = (data) => {
        if (data) _lastData = data;
        Swal.fire({
            title: '直链提取成功',
            html: generateDom(_lastData),
            showConfirmButton: true,
            confirmButtonText: '关闭',
            confirmButtonColor: '#00caab',
            width: '720px'
        });
        bindCommonEvents();
    };

    // 复制配置小窗：复制链接 / UA / Cookie，离开时返回结果面板
    const showCopyConfigDialog = (url) => {
        Swal.fire({
            title: '复制下载配置',
            width: '440px',
            html: `
                <div class="okv-panel okv-copy-dialog" style="padding:5px;">
                    <p>直链需搭配 UA 与 Cookie 使用，否则粘贴到下载器会 403。复制完成后点击「返回」回到结果面板。</p>
                    <button id="okv-copy-url" class="okv-btn okv-btn-default okv-pick-btn">复制链接</button>
                    <button id="okv-copy-ua" class="okv-btn okv-btn-default okv-pick-btn">复制 UA</button>
                    <button id="okv-copy-cookie" class="okv-btn okv-btn-default okv-pick-btn">复制 Cookie</button>
                </div>`,
            showCancelButton: true,
            cancelButtonText: '返回',
            showConfirmButton: false,
            showCloseButton: true,
            didOpen: () => {
                document.getElementById('okv-copy-url').onclick = (e) => {
                    GM_setClipboard(url);
                    e.target.innerText = '链接已复制';
                    setTimeout(() => { e.target.innerText = '复制链接'; }, 1500);
                };
                document.getElementById('okv-copy-ua').onclick = (e) => {
                    GM_setClipboard(REAL_QUARK_UA);
                    e.target.innerText = 'UA 已复制';
                    setTimeout(() => { e.target.innerText = '复制 UA'; }, 1500);
                };
                document.getElementById('okv-copy-cookie').onclick = (e) => {
                    GM_setClipboard(document.cookie);
                    e.target.innerText = 'Cookie 已复制';
                    setTimeout(() => { e.target.innerText = '复制 Cookie'; }, 1500);
                };
            }
        }).then(() => {
            // 无论返回/关闭/点背景，都回到结果面板，避免重新提取直链
            showResultPanel();
        });
    };

    const initButton = (selector, btnHtml) => {
        autoLazyload(() => $(selector).length > 0, () => {
            if ($(selector).find(".okv-btn-direct").length === 0) {
                $(selector).prepend(btnHtml);
            }
        }, 0.5);
    };

    const run = () => {
        let url = window.location.href;
        let selector = "";
        let btn = "";

        if (url.includes("/list")) {
            if (!url.includes("myshare")) {
                // 我的网盘文件列表页面
                selector = ".btn-operate";
            } else {
                // 我的分享列表页面
                selector = ".tabs-container";
            }
            btn = quarkBtn;
            initButton(selector, btn);

            // 绑定提取直链事件
            $(document).off("click", ".okv-btn-direct").on("click", ".okv-btn-direct", () => {
                let selectList = getQuarkSelectedFile();
                if (selectList.length === 0) {
                    Swal.fire({ icon: 'warning', title: '提示', text: '请先勾选要提取直链的文件！' });
                    return;
                }
                if (selectList.filter(e => e.file).length === 0) {
                    Swal.fire({ icon: 'warning', title: '提示', text: '暂不支持文件夹提取直链，请选择文件！' });
                    return;
                }
                let fids = selectList.filter(e => e.file).map(e => e.fid);

                Swal.fire({
                    title: '正在提取直链...',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                quarkDirect(fids).then(res => {
                    Swal.close();
                    if (res.code === 31001) {
                        Swal.fire({ icon: 'error', title: '错误', text: '提取失败，请先登录网页端夸克网盘！' });
                        return;
                    }
                    if (res.code !== 0) {
                        Swal.fire({ icon: 'error', title: '错误', text: `直链解析异常 (${res.code})` });
                        return;
                    }
                    let data = res.data.map(e => {
                        e.cookie = document.cookie;
                        return e;
                    });

                    showResultPanel(data);
                }).catch(err => {
                    Swal.close();
                    Swal.fire({ icon: 'error', title: '网络异常', text: err.toString() });
                });
            });

        } else if (url.includes("/s/")) {
            // 他人分享链接预览页面
            selector = ".file-info-share-buttom";
            if ($(selector).length === 0) {
                selector = ".file-info-share-button";
            }
            btn = quarkBtn;
            initButton(selector, btn);

            $(document).off("click", ".okv-btn-direct").on("click", ".okv-btn-direct", () => {
                Swal.fire({
                    icon: 'info',
                    title: '提示',
                    text: '受平台接口安全限制，分享页的文件请先"保存到我的网盘"，然后再在我的网盘里进行直链提取。'
                });
            });
        }
    };

    let _firstUseGuided = false;
    const maybeGuideFirstUse = () => {
        if (_firstUseGuided) return;
        if (!window.location.href.includes('/list')) return;
        if (GM_getValue('okv_config_initialized', false)) return;
        if (GM_getValue('okv_guided', false)) return;
        _firstUseGuided = true;
        GM_setValue('okv_guided', true);
        setTimeout(() => showConfigDialog(true), 300);
    };

    const init = () => {
        injectStyles();
        run();
        maybeGuideFirstUse();

        // 监听路由变化，以便在单页应用导航时重新挂载按钮
        window.addEventListener("hashchange", async () => {
            await sleep(0.3);
            run();
        });
    };

    init();
})();