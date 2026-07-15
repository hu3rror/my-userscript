// ==UserScript==
// @name                    Quark Web Cloud Drive Direct Link Extractor
// @name:zh-CN              夸克网盘网页版直链提取器
// @namespace               https://github.com/hu3rror
// @version                 1.0.2
// @description             Extract direct download links from Quark Web Cloud Drive with easy copier for Gopeed/IDM.
// @description:zh-CN       在夸克网盘网页版中批量提取并复制文件的直接下载链接，提供外部下载器（Gopeed/IDM）专用UA与Cookie一键复制。
// @author                  Hu3rror
// @match                   *://pan.quark.cn/*
// @license                 MIT
// @run-at                  document-end
// @require                 https://lib.baomitu.com/jquery/1.12.4/jquery.min.js
// @require                 https://lib.baomitu.com/limonte-sweetalert2/11.4.7/sweetalert2.all.min.js
// @grant                   GM_xmlhttpRequest
// @grant                   GM_setClipboard
// @grant                   unsafeWindow
// @connect                 quark.cn
// @connect                 drive.quark.cn
// @downloadURL             https://raw.githubusercontent.com/hu3rror/my-userscript/main/quark-web-cloud-drive-direct-link-extractor.user.js
// @updateURL               https://raw.githubusercontent.com/hu3rror/my-userscript/main/quark-web-cloud-drive-direct-link-extractor.user.js
// @homepageURL             https://github.com/hu3rror/my-userscript
// ==/UserScript==

(function () {
    'use strict';

    // 官方 Gopeed 提取的客户端真实 UA
    const REAL_QUARK_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) quark-cloud-drive/2.5.20 Chrome/100.0.4896.160 Electron/18.3.5.4-b478491100 Safari/537.36 Channel/pckk_other_ch";

    // ================== CSS 样式注入 ==================
    const injectStyles = () => {
        const styles = `
            .okv-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 13px;
                margin-top: 10px;
            }
            .okv-table th {
                background-color: #f5f5f5;
                font-weight: bold;
                padding: 8px;
                border-bottom: 2px solid #ddd;
                text-align: left;
                color: #333;
            }
            .okv-table td {
                padding: 8px;
                border-bottom: 1px solid #eee;
                text-align: left;
                color: #555;
            }
            .okv-btn {
                display: inline-block;
                padding: 4px 10px;
                margin: 2px;
                border-radius: 4px;
                border: 1px solid #ccc;
                background: #fff;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
            }
            .okv-btn:hover {
                opacity: 0.9;
            }
            .okv-btn-primary {
                background-color: #00caab;
                color: white;
                border-color: #00caab;
            }
            .okv-btn-success {
                background-color: #28a745;
                color: white;
                border-color: #28a745;
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

    // ================== UI 交互模块 ==================
    const quarkBtn = `
        <div class="ovk-main" style="margin-right: 10px; display: inline-block;">
            <button type="button" class="ant-btn btn-file okv-btn-direct" style="display: inline-flex; align-items: center; justify-content: center; background-color: #00caab; color: white; border: none; border-radius: 4px; padding: 4px 15px; height: 32px; font-weight: 500; cursor: pointer;">
                <svg width="16" height="16" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 2-2M11 3v10"/>
                    <path d="M14 8h1.553c.85 0 1.16.093 1.47.267.311.174.556.43.722.756.166.326.255.65.255 1.54v4.873c0 .892-.089 1.215-.255 1.54-.166.327-.41.583-.722.757-.31.174-.62.267-1.47.267H6.447c-.85 0-1.16-.093-1.47-.267a1.778 1.778 0 01-.722-.756c-.166-.326-.255-.65-.255-1.54v-4.873c0-.892.089-1.215.255-1.54.166-.327.41-.583.722-.757.31-.174.62-.267 1.47-.267H11"/>
                </svg>
                <span>获取直链</span>
            </button>
        </div>
    `;

    const generateDom = (list) => {
        let rows = "";
        list.forEach(e => {
            rows += `
            <tr>
                <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${e.file_name}">${e.file_name}</td>
                <td>${sizeFormat(e.size)}</td>
                <td>
                    <button class="okv-btn okv-btn-primary quark-copy-item" data-url="${e.download_url}">复制链接</button>
                    <button class="okv-btn quark-down-item" data-url="${e.download_url}">直接下载</button>
                </td>
            </tr>`;
        });

        return `
        <div style="text-align: left; max-height: 450px; overflow-y: auto; padding: 5px;">
            <!-- 外部下载器使用说明 -->
            <div style="text-align: left; margin-bottom: 15px; border: 1px solid #ffebb8; background-color: #fffcf0; padding: 10px; border-radius: 6px;">
                <details>
                    <summary style="cursor: pointer; font-weight: bold; color: #b78103;">👉 Gopeed / IDM / Motrix 外部下载器配置（避免403）</summary>
                    <div style="margin-top: 10px; font-size: 12px; color: #555; line-height: 1.6;">
                        <p>直链强绑定您当前的登录状态，在下载器中创建任务时<b>必须同时满足</b>以下两项：</p>
                        <ol style="margin-left: 15px; margin-top: 5px;">
                            <li><b>User-Agent (UA)</b> 设置为官方完整客户端 UA（点击下方按钮复制）</li>
                            <li><b>标头/Headers</b> 中添加当前账号的 <code>Cookie</code>（点击下方按钮复制）</li>
                        </ol>

                        <div style="margin-top: 10px; display: flex; gap: 8px;">
                            <button class="okv-btn okv-btn-primary quark-copy-ua" style="flex: 1; padding: 6px;">📋 复制客户端 UA</button>
                            <button class="okv-btn okv-btn-success quark-copy-cookie" style="flex: 1; padding: 6px;">📋 复制当前 Cookie</button>
                        </div>
                        <p style="margin-top: 8px; font-size: 11px; color: #888;">* 提示：在 Gopeed 中新建下载时，展开“高级”选项即可分别填入链接、UA 和 Cookie。</p>
                    </div>
                </details>
            </div>

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
        </div>`;
    };

    // ================== 功能实现模块 ==================
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

    const bindCommonEvents = () => {
        $(document).off("click", ".quark-down-item").on("click", ".quark-down-item", e => {
            window.open(e.target.dataset.url, "_blank");
        });

        $(document).off("click", ".quark-copy-item").on("click", ".quark-copy-item", e => {
            GM_setClipboard(e.target.dataset.url);
            e.target.innerText = "复制成功";
            setTimeout(() => {
                e.target.innerText = "复制链接";
            }, 1500);
        });

        // 外部配置复制逻辑
        $(document).off("click", ".quark-copy-ua").on("click", ".quark-copy-ua", e => {
            GM_setClipboard(REAL_QUARK_UA);
            e.target.innerText = "UA 复制成功";
            setTimeout(() => {
                e.target.innerText = "📋 复制客户端 UA";
            }, 1500);
        });

        $(document).off("click", ".quark-copy-cookie").on("click", ".quark-copy-cookie", e => {
            GM_setClipboard(document.cookie);
            e.target.innerText = "Cookie 复制成功";
            setTimeout(() => {
                e.target.innerText = "📋 复制当前 Cookie";
            }, 1500);
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

                    Swal.fire({
                        title: '直链提取成功',
                        html: generateDom(data),
                        showConfirmButton: true,
                        confirmButtonText: '关闭',
                        confirmButtonColor: '#00caab',
                        width: '580px'
                    });
                    bindCommonEvents();
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
                    text: '受平台接口安全限制，分享页的文件请先“保存到我的网盘”，然后再在我的网盘里进行直链提取。'
                });
            });
        }
    };

    const init = () => {
        injectStyles();
        run();

        // 监听路由变化，以便在单页应用导航时重新挂载按钮
        window.addEventListener("hashchange", async () => {
            await sleep(0.3);
            run();
        });
    };

    init();
})();