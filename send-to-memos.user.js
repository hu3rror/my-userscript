// ==UserScript==
// @name            发送到 Memos
// @name:en         Send to Memos
// @namespace       https://github.com/hu3rror/my-userscript
// @version         3.0.0
// @description     将选中的富文本（含列表、链接、代码、表格等）、链接或文本发送到 Memos，基于 Turndown 实现规范 Markdown 转换，支持防丢草稿、本地/公网部署智能识别与并发保护
// @description:en  Send selected rich text to Memos with robust Markdown conversion via Turndown, draft saving, and concurrency protection
// @author          Hu3rror
// @match           *://*/*
// @grant           GM_xmlhttpRequest
// @grant           GM_registerMenuCommand
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_addStyle
// @connect         *
// @require         https://cdn.jsdelivr.net/npm/turndown@7.2.4/dist/turndown.js
// @require         https://cdn.jsdelivr.net/npm/turndown-plugin-gfm@1.0.2/dist/turndown-plugin-gfm.js
// @license         MIT
// @downloadURL     https://raw.githubusercontent.com/hu3rror/my-userscript/main/send-to-memos.user.js
// @updateURL       https://raw.githubusercontent.com/hu3rror/my-userscript/main/send-to-memos.user.js
// @homepageURL     https://github.com/hu3rror/my-userscript
// ==/UserScript==
(function () {
    'use strict';

    // ------------------------------------------------------------------
    // 配置读取：不缓存为顶层 const，每次都实时读库，避免"改配置不刷新页面就不生效"的问题
    // ------------------------------------------------------------------
    function getMemosConfig() {
        return {
            apiUrl: GM_getValue('MEMOS_API_URL', ''),
            apiToken: GM_getValue('API_TOKEN', '')
        };
    }
    function isMemosConfigured() {
        const { apiUrl, apiToken } = getMemosConfig();
        return !!(apiUrl && apiToken);
    }

    // 缓存全局 DOM 引用与临时事件句柄，降低内存与性能开销
    let cachedFloatButton = null;
    let configModal = null;
    let quickInputModal = null;
    let handleConfigEsc = null;
    let handleQuickInputEsc = null;

    // 并发保护：防止用户连续点击导致重复发送
    let isSending = false;

    // 检测系统颜色主题
    function isDarkMode() {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    // 统一的深色模式订阅：所有需要响应主题切换的元素在这里注册回调，
    // 避免在多个函数里各自创建 matchMedia 监听器
    const themeListeners = new Set();
    function onThemeChange(callback) {
        themeListeners.add(callback);
    }
    const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = (e) => {
        themeListeners.forEach(cb => {
            try { cb(e.matches); } catch (err) { /* 单个回调出错不应影响其他回调 */ }
        });
    };
    if (darkMediaQuery.addEventListener) {
        darkMediaQuery.addEventListener('change', handleThemeChange);
    } else if (darkMediaQuery.addListener) {
        darkMediaQuery.addListener(handleThemeChange); // 兼容旧版 Safari (<14) 及旧版 Chrome
    }

    // 注入样式
    GM_addStyle(`
        #memos-float-button {
            position: fixed;
            width: 36px;
            height: 36px;
            background-color: rgba(76, 175, 80, 0.4);
            color: rgba(255, 255, 255, 0.8);
            border-radius: 50%;
            text-align: center;
            line-height: 36px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 1px 1px 3px rgba(0,0,0,0.2);
            z-index: 9999;
            user-select: none;
            display: none;
            align-items: center;
            justify-content: center;
            right: 20px;
            bottom: 20px;
            transition: background-color 0.3s ease, color 0.3s ease, opacity 0.3s ease, transform 0.3s ease;
        }
        #memos-float-button:hover, #memos-float-button.has-selection {
            background-color: rgba(76, 175, 80, 0.95);
            color: white;
            opacity: 1;
            transform: scale(1.05);
        }
        .memos-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        }
        .memos-modal-content {
            --memos-bg: #ffffff;
            --memos-text: #333333;
            --memos-border: #dddddd;
            --memos-btn-save: #4caf50;
            --memos-btn-cancel: #f44336;
            --memos-input-bg: #ffffff;

            padding: 20px;
            border-radius: 8px;
            width: 400px;
            max-width: 90%;
            transition: all 0.3s ease;
            background-color: var(--memos-bg);
            color: var(--memos-text);
        }
        .memos-modal-content.dark-mode {
            --memos-bg: #1e1e1e;
            --memos-text: #e0e0e0;
            --memos-border: #3d3d3d;
            --memos-btn-save: #3a7d3f;
            --memos-btn-cancel: #c53929;
            --memos-input-bg: #2d2d2d;
        }
        .memos-modal h2 {
            margin-top: 0;
            font-size: 18px;
            margin-bottom: 12px;
        }
        .memos-form-group {
            margin-bottom: 15px;
        }
        .memos-form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        .memos-form-group input, .memos-form-group textarea {
            width: 100%;
            padding: 8px;
            border: 1px solid var(--memos-border);
            border-radius: 4px;
            box-sizing: border-box;
            background-color: var(--memos-input-bg);
            color: var(--memos-text);
            transition: all 0.3s ease;
        }
        .memos-input-wrap {
            position: relative;
        }
        .memos-input-wrap input {
            padding-right: 34px;
        }
        .memos-token-toggle {
            position: absolute;
            right: 6px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            cursor: pointer;
            font-size: 14px;
            padding: 2px 4px;
            color: var(--memos-text);
        }
        .memos-hint {
            color: #888;
            display: block;
            margin-top: 5px;
            font-size: 12px;
        }
        .memos-button {
            padding: 8px 16px;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-right: 10px;
            transition: all 0.3s ease;
        }
        .memos-button.save {
            background-color: var(--memos-btn-save);
        }
        .memos-button.cancel {
            background-color: var(--memos-btn-cancel);
        }
        .memos-button:hover {
            opacity: 0.9;
        }
        .memos-buttons {
            display: flex;
            justify-content: flex-end;
            margin-top: 20px;
        }

        #memos-float-button.dark-mode {
            background-color: rgba(60, 70, 60, 0.4);
            color: rgba(224, 224, 224, 0.8);
            box-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }
        #memos-float-button.dark-mode:hover, #memos-float-button.dark-mode.has-selection {
            background-color: rgba(70, 80, 70, 0.95);
            color: white;
        }
    `);

    // 创建自动关闭的通知
    function showNotification(message, isError = false) {
        const notification = document.createElement('div');
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.padding = '10px 20px';
        notification.style.backgroundColor = isError ? 'var(--memos-btn-cancel, #f44336)' : 'var(--memos-btn-save, #4caf50)';
        notification.style.color = 'white';
        notification.style.borderRadius = '5px';
        notification.style.zIndex = '99999';
        notification.style.opacity = '0.9';
        notification.style.transition = 'opacity 0.2s ease';
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.remove();
            }, 500);
        }, 1500);
    }

    // 修改悬浮按钮样式以提供物理状态反馈
    function setFloatButtonState(state) {
        if (!cachedFloatButton) return;
        if (state === 'loading') {
            cachedFloatButton.textContent = '⏳';
            cachedFloatButton.style.backgroundColor = 'rgba(255, 152, 0, 0.9)';
        } else if (state === 'success') {
            cachedFloatButton.textContent = '✅';
            cachedFloatButton.style.backgroundColor = 'rgba(76, 175, 80, 0.95)';
            setTimeout(() => setFloatButtonState('idle'), 1200);
        } else if (state === 'error') {
            cachedFloatButton.textContent = '❌';
            cachedFloatButton.style.backgroundColor = 'rgba(244, 67, 54, 0.95)';
            setTimeout(() => setFloatButtonState('idle'), 1500);
        } else {
            cachedFloatButton.textContent = 'M';
            cachedFloatButton.style.backgroundColor = '';
        }
    }

    // 检测选区中的文字内容是否非空
    function getSelectedText() {
        return window.getSelection().toString().trim();
    }

    // 智能转义可能破坏 Markdown 链接格式的字符（用于页面元数据标题，非选区正文）
    function escapeMarkdownTitle(text) {
        if (!text) return '';
        return text.replace(/([\[\]])/g, '\\$1');
    }

    // ------------------------------------------------------------------
    // 基于 Turndown 的 HTML -> Markdown 转换（替代原来手写的递归解析器）
    // 通过 try/catch 防御 @require 加载失败的情况，失败时降级为纯文本，
    // 保证核心的"发送"功能不会因为 CDN 不可用而完全瘫痪
    // ------------------------------------------------------------------
    let turndownService = null;
    try {
        if (typeof TurndownService === 'undefined') {
            throw new Error('TurndownService 未加载（可能是 @require 的 CDN 资源被网络环境屏蔽）');
        }
        turndownService = new TurndownService({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced',
            bulletListMarker: '-'
        });
        if (typeof turndownPluginGfm !== 'undefined' && turndownPluginGfm.gfm) {
            turndownService.use(turndownPluginGfm.gfm);
        }

        // 安全过滤：拦截可能携带恶意执行逻辑或产生不必要样式的活性标签
        turndownService.remove(['script', 'style', 'noscript', 'iframe', 'object', 'embed']);

        // 代码块语言识别：class 可能标注在 <pre> 或 <code> 任意一方
        turndownService.addRule('fencedCodeBlockWithLang', {
            filter: (node) => node.nodeName === 'PRE' && node.firstChild && node.firstChild.nodeName === 'CODE',
            replacement: (content, node) => {
                const codeEl = node.firstChild;
                const langSource = codeEl.className || node.className || '';
                const langMatch = langSource.match(/(?:lang|language)-([a-zA-Z0-9+#-]+)/);
                const lang = langMatch ? langMatch[1] : '';
                return `\n\n\`\`\`${lang}\n${codeEl.textContent.trim()}\n\`\`\`\n\n`;
            }
        });

        // 链接/图片相对路径转绝对路径，防止剪贴后失效
        turndownService.addRule('absoluteLinks', {
            filter: 'a',
            replacement: (content, node) => {
                const href = node.getAttribute('href');
                const text = content.trim();
                if (!href || !text) return text;
                try {
                    return `[${text}](${new URL(href, document.baseURI).href})`;
                } catch (e) {
                    return `[${text}](${href})`;
                }
            }
        });
        turndownService.addRule('absoluteImages', {
            filter: 'img',
            replacement: (content, node) => {
                const src = node.getAttribute('src');
                const alt = node.getAttribute('alt') || 'image';
                if (!src) return '';
                try {
                    return `![${alt}](${new URL(src, document.baseURI).href})`;
                } catch (e) {
                    return `![${alt}](${src})`;
                }
            }
        });
    } catch (e) {
        console.error('[发送到 Memos] Turndown 初始化失败，将降级为纯文本模式:', e);
        turndownService = null;
    }

    // 检测选区是否位于 code 块内（降级模式下用于判断是否要走代码块格式）
    function getSelectionCodeBlockInfo() {
        try {
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) return null;
            const range = sel.getRangeAt(0);
            const container = range.commonAncestorContainer;
            const element = container.nodeType === 1 ? container : container.parentElement;
            if (!element) return null;
            const codeElement = element.closest('pre, code');
            if (codeElement) {
                const className = codeElement.className || '';
                const langMatch = className.match(/(?:lang|language)-([a-zA-Z0-9+#-]+)/);
                const lang = langMatch ? langMatch[1] : '';
                return { isCode: true, lang };
            }
        } catch (e) {
            // 安全防护
        }
        return null;
    }

    // 智能获取选区内的富文本并转换为 Markdown；Turndown 不可用时自动降级为纯文本
    function getSelectedMarkdown() {
        try {
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) return '';

            if (!turndownService) {
                return sel.toString().trim();
            }

            const range = sel.getRangeAt(0);
            const container = document.createElement('div');
            container.appendChild(range.cloneContents());

            let markdown = turndownService.turndown(container).trim();
            markdown = markdown.replace(/\n{3,}/g, '\n\n');
            return markdown;
        } catch (e) {
            console.error('[发送到 Memos] 转换选区至 Markdown 时出错:', e);
            return window.getSelection().toString().trim();
        }
    }

    // 智能获取当前页面的元数据
    function getPageMetadata() {
        const title = document.title || '无标题页面';
        const url = window.location.href;
        const meta = document.querySelector('meta[name="description"]') ||
            document.querySelector('meta[property="og:description"]') ||
            document.querySelector('meta[name="twitter:description"]');
        const contentAttr = meta ? meta.getAttribute('content') : null;
        const description = contentAttr ? contentAttr.trim() : '';
        return { title: escapeMarkdownTitle(title), url, description: escapeMarkdownTitle(description) };
    }

    // 将文本转换为 Markdown 引用块
    function formatAsBlockquote(text) {
        if (!text) return '';
        return text.split('\n').map(line => `> ${line}`).join('\n');
    }

    // ------------------------------------------------------------------
    // API 地址安全检测：区分"公网 http"（风险高，需二次确认）和
    // "本地/内网 http"（本地部署常见场景，风险低，不拦截）以及"格式非法"
    // 用结构化的 level 字段代替字符串内容匹配，避免调用方误判
    // ------------------------------------------------------------------
    function isPrivateOrLocalHost(hostname) {
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
        if (/\.local$/i.test(hostname)) return true;
        if (/^10\./.test(hostname)) return true;
        if (/^192\.168\./.test(hostname)) return true;
        if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return true;
        return false;
    }

    function checkApiUrlSecurity(apiUrl) {
        let url;
        try {
            url = new URL(apiUrl);
        } catch (e) {
            return { level: 'invalid', message: 'API URL 格式不合法，请检查后重试' };
        }
        if (url.protocol === 'http:' && !isPrivateOrLocalHost(url.hostname)) {
            return {
                level: 'warn',
                message: '您配置的 API 地址是公网 http（非 https），Token 存在被窃听风险，建议改用 https 或通过内网访问。'
            };
        }
        return { level: 'ok' };
    }

    // 发送内容到 Memos 的基础函数（支持成功回调 + 并发保护 + 超时保护）
    function sendToMemos(content, onSuccessCallback) {
        const { apiUrl, apiToken } = getMemosConfig();

        if (!apiUrl || !apiToken) {
            showNotification('请先配置 Memos API URL 和 Token', true);
            showConfigModal();
            return;
        }

        if (isSending) {
            showNotification('上一条正在发送中，请稍候', true);
            return;
        }

        const check = checkApiUrlSecurity(apiUrl);
        if (check.level === 'warn') {
            console.warn('[发送到 Memos] ' + check.message);
        }

        isSending = true;
        setFloatButtonState('loading');

        GM_xmlhttpRequest({
            method: 'POST',
            url: apiUrl,
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                content: content,
                visibility: 'PRIVATE'
            }),
            timeout: 15000,
            onload: function (response) {
                isSending = false;
                if (response.status === 200 || response.status === 201) {
                    showNotification('成功发送到 Memos！');
                    setFloatButtonState('success');
                    if (onSuccessCallback) onSuccessCallback();
                } else {
                    showNotification(`发送到 Memos 失败。状态码: ${response.status}\n可能端点错误。`, true);
                    setFloatButtonState('error');
                }
            },
            onerror: function (error) {
                isSending = false;
                showNotification('发送到 Memos 时出错: ' + error, true);
                setFloatButtonState('error');
            },
            ontimeout: function () {
                isSending = false;
                showNotification('发送到 Memos 超时，请检查网络或服务地址', true);
                setFloatButtonState('error');
            }
        });
    }

    // 存储当前右键点击的链接
    let currentLink = null;

    document.addEventListener('contextmenu', function (event) {
        currentLink = event.target.closest('a') || null;
    }, false);

    GM_registerMenuCommand('发送选中内容到 Memos', function () {
        handleSendAction();
    });

    GM_registerMenuCommand('配置 Memos API', function () {
        showConfigModal();
    });

    // 处理普通发送动作
    function handleSendAction() {
        const selectedMarkdown = getSelectedMarkdown();
        const meta = getPageMetadata();

        if (selectedMarkdown) {
            const codeInfo = getSelectionCodeBlockInfo();
            let content;

            if (codeInfo && codeInfo.isCode && !selectedMarkdown.startsWith('```')) {
                content = `#摘录 📂 **[${meta.title}](${meta.url})**\n\n\`\`\`${codeInfo.lang}\n${window.getSelection().toString().trim()}\n\`\`\``;
            } else {
                const isAlreadyCodeBlock = selectedMarkdown.startsWith('```');
                if (isAlreadyCodeBlock) {
                    content = `#摘录 📂 **[${meta.title}](${meta.url})**\n\n${selectedMarkdown}`;
                } else {
                    const quote = formatAsBlockquote(selectedMarkdown);
                    content = `#摘录 📂 **[${meta.title}](${meta.url})**\n\n${quote}`;
                }
            }
            sendToMemos(content);
        } else if (currentLink && currentLink.href) {
            const linkText = escapeMarkdownTitle(currentLink.textContent.trim() || '无文本');
            const linkUrl = currentLink.href;
            const content = `#书签 🔗 **[${linkText}](${linkUrl})**\n\n---\n**来源**：[${meta.title}](${meta.url})`;
            sendToMemos(content);
        } else {
            showQuickInputModal();
        }
    }

    // 仅当点击目标恰好就是 currentLink 本身（例如部分浏览器/长按场景下右键会伴随触发一次
    // 同目标的 click 事件）时才保留状态；点击其他任何位置（包括别的链接）都应清空，
    // 避免残留的旧链接在后续操作中被误用
    document.addEventListener('click', function (event) {
        const clickedLink = event.target.closest('a');
        if (clickedLink !== currentLink) {
            currentLink = null;
        }
    }, false);

    // 创建/激活配置模态框（DOM 复用单例模式）
    function showConfigModal() {
        if (!configModal) {
            configModal = document.createElement('div');
            configModal.id = 'memos-config-modal';
            configModal.className = 'memos-modal';
            configModal.style.display = 'none';

            const modalContent = document.createElement('div');
            modalContent.className = `memos-modal-content ${isDarkMode() ? 'dark-mode' : 'light-mode'}`;

            modalContent.innerHTML = `
                <h2>配置 Memos API</h2>
                <div class="memos-form-group">
                    <label for="memos-api-url">API URL:</label>
                    <input type="text" id="memos-api-url" placeholder="例如：https://example.com/api/v1/memos">
                    <small class="memos-hint">注意：保留 /api/v1/memos 路径；本地部署可使用 http://localhost 或内网 IP</small>
                </div>
                <div class="memos-form-group">
                    <label for="memos-api-token">API Token:</label>
                    <div class="memos-input-wrap">
                        <input type="password" id="memos-api-token" placeholder="输入您的 API Token">
                        <button type="button" class="memos-token-toggle" id="memos-token-toggle" title="显示/隐藏 Token">👁</button>
                    </div>
                </div>
                <div class="memos-buttons">
                    <button class="memos-button cancel">取消</button>
                    <button class="memos-button save">保存</button>
                </div>
            `;

            configModal.appendChild(modalContent);
            document.body.appendChild(configModal);

            const cancelButton = modalContent.querySelector('.memos-button.cancel');
            const saveButton = modalContent.querySelector('.memos-button.save');
            const apiUrlInput = modalContent.querySelector('#memos-api-url');
            const apiTokenInput = modalContent.querySelector('#memos-api-token');
            const tokenToggle = modalContent.querySelector('#memos-token-toggle');

            tokenToggle.addEventListener('click', function () {
                apiTokenInput.type = apiTokenInput.type === 'password' ? 'text' : 'password';
            });

            onThemeChange((isDark) => {
                modalContent.className = `memos-modal-content ${isDark ? 'dark-mode' : 'light-mode'}`;
            });

            cancelButton.addEventListener('click', closeConfigModal);

            saveButton.addEventListener('click', function () {
                const apiUrl = apiUrlInput.value.trim();
                const apiToken = apiTokenInput.value.trim();

                if (!apiUrl || !apiToken) {
                    showNotification('API URL 和 Token 不能为空', true);
                    return;
                }

                const check = checkApiUrlSecurity(apiUrl);
                if (check.level === 'invalid') {
                    showNotification(check.message, true);
                    return;
                }
                if (check.level === 'warn') {
                    if (!confirm(check.message + '\n\n仍要保存吗？')) return;
                }

                GM_setValue('MEMOS_API_URL', apiUrl);
                GM_setValue('API_TOKEN', apiToken);

                showNotification('配置已保存');
                closeConfigModal();
                updateFloatButton();
            });
        }

        const modalContent = configModal.querySelector('.memos-modal-content');
        modalContent.className = `memos-modal-content ${isDarkMode() ? 'dark-mode' : 'light-mode'}`;

        const { apiUrl, apiToken } = getMemosConfig();
        const apiUrlInput = configModal.querySelector('#memos-api-url');
        const apiTokenInput = configModal.querySelector('#memos-api-token');
        if (apiUrlInput) apiUrlInput.value = apiUrl;
        if (apiTokenInput) { apiTokenInput.value = apiToken; apiTokenInput.type = 'password'; }

        configModal.style.display = 'flex';

        if (handleConfigEsc) {
            document.removeEventListener('keydown', handleConfigEsc);
        }
        handleConfigEsc = (e) => {
            if (e.key === 'Escape') {
                closeConfigModal();
            }
        };
        document.addEventListener('keydown', handleConfigEsc);
    }

    function closeConfigModal() {
        if (configModal) {
            configModal.style.display = 'none';
        }
        if (handleConfigEsc) {
            document.removeEventListener('keydown', handleConfigEsc);
            handleConfigEsc = null;
        }
    }

    // 创建/激活快捷记录模态框（DOM 复用单例模式 + 草稿自动保存）
    function showQuickInputModal() {
        if (!isMemosConfigured()) {
            showNotification('请先配置 Memos API URL 和 Token', true);
            showConfigModal();
            return;
        }

        if (!quickInputModal) {
            quickInputModal = document.createElement('div');
            quickInputModal.id = 'memos-quick-input-modal';
            quickInputModal.className = 'memos-modal';
            quickInputModal.style.display = 'none';

            const modalContent = document.createElement('div');
            modalContent.className = `memos-modal-content ${isDarkMode() ? 'dark-mode' : 'light-mode'}`;

            modalContent.innerHTML = `
                <h2>新建备忘</h2>
                <div class="memos-form-group">
                    <textarea id="memos-quick-content" rows="5" placeholder="写点什么...（发送后将自动附带当前页面来源）"></textarea>
                </div>
                <div class="memos-buttons">
                    <button class="memos-button cancel">取消</button>
                    <button class="memos-button save">发送</button>
                </div>
            `;

            quickInputModal.appendChild(modalContent);
            document.body.appendChild(quickInputModal);

            const cancelButton = modalContent.querySelector('.memos-button.cancel');
            const sendButton = modalContent.querySelector('.memos-button.save');
            const textarea = modalContent.querySelector('#memos-quick-content');

            onThemeChange((isDark) => {
                modalContent.className = `memos-modal-content ${isDark ? 'dark-mode' : 'light-mode'}`;
            });

            textarea.addEventListener('input', function () {
                GM_setValue('MEMOS_DRAFT', textarea.value);
            });

            cancelButton.addEventListener('click', closeQuickInputModal);

            sendButton.addEventListener('click', function () {
                const content = textarea.value.trim();
                if (!content) {
                    showNotification('内容不能为空', true);
                    return;
                }
                const meta = getPageMetadata();
                const formattedContent = `#笔记 📝 ${content}\n\n---\n**来源**：[${meta.title}](${meta.url})`;

                sendToMemos(formattedContent, function () {
                    GM_setValue('MEMOS_DRAFT', '');
                    textarea.value = '';
                });
                closeQuickInputModal();
            });
        }

        const textarea = quickInputModal.querySelector('#memos-quick-content');
        const modalContent = quickInputModal.querySelector('.memos-modal-content');

        modalContent.className = `memos-modal-content ${isDarkMode() ? 'dark-mode' : 'light-mode'}`;

        const savedDraft = GM_getValue('MEMOS_DRAFT', '');
        textarea.value = savedDraft;

        quickInputModal.style.display = 'flex';
        textarea.focus();

        if (handleQuickInputEsc) {
            document.removeEventListener('keydown', handleQuickInputEsc);
        }
        handleQuickInputEsc = (e) => {
            if (e.key === 'Escape') {
                closeQuickInputModal();
            }
        };
        document.addEventListener('keydown', handleQuickInputEsc);
    }

    function closeQuickInputModal() {
        if (quickInputModal) {
            quickInputModal.style.display = 'none';
        }
        if (handleQuickInputEsc) {
            document.removeEventListener('keydown', handleQuickInputEsc);
            handleQuickInputEsc = null;
        }
    }

    // 创建悬浮按钮
    function createFloatButton() {
        if (cachedFloatButton || document.getElementById('memos-float-button')) {
            return;
        }
        const floatButton = document.createElement('div');
        floatButton.id = 'memos-float-button';
        floatButton.textContent = 'M';
        floatButton.title = '单击发送/双击纯书签收藏';
        document.body.appendChild(floatButton);

        cachedFloatButton = floatButton;

        const savedPosition = GM_getValue('MEMOS_BUTTON_POSITION', null);
        if (savedPosition) {
            floatButton.style.left = savedPosition.left + 'px';
            floatButton.style.top = savedPosition.top + 'px';
            floatButton.style.right = 'auto';
            floatButton.style.bottom = 'auto';
        }

        let isDragging = false;
        let hasMoved = false;
        let offsetX, offsetY;
        let startX, startY;
        let buttonWidth = 36;
        let buttonHeight = 36;
        const DRAG_THRESHOLD = 4; // px，小于该位移视为点击时的手抖，不判定为拖动

        function onMouseMove(e) {
            if (!isDragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            // 未越过阈值前不标记为"已拖动"，也不移动按钮，避免手抖误吞点击/双击事件
            if (!hasMoved && Math.hypot(dx, dy) < DRAG_THRESHOLD) {
                return;
            }
            hasMoved = true;

            const x = e.clientX - offsetX;
            const y = e.clientY - offsetY;
            const maxX = window.innerWidth - buttonWidth;
            const maxY = window.innerHeight - buttonHeight;

            floatButton.style.left = Math.min(Math.max(0, x), maxX) + 'px';
            floatButton.style.top = Math.min(Math.max(0, y), maxY) + 'px';
            floatButton.style.right = 'auto';
            floatButton.style.bottom = 'auto';
        }

        function onMouseUp() {
            if (isDragging) {
                // 只有真正发生了拖动位移，才写入新位置，避免每次单击都触发一次无意义的存储写入
                if (hasMoved) {
                    GM_setValue('MEMOS_BUTTON_POSITION', {
                        left: parseInt(floatButton.style.left, 10) || 0,
                        top: parseInt(floatButton.style.top, 10) || 0
                    });
                }
                isDragging = false;

                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);

                setTimeout(() => {
                    hasMoved = false;
                }, 50);
            }
        }

        floatButton.addEventListener('mousedown', function (e) {
            isDragging = true;
            hasMoved = false;

            const rect = floatButton.getBoundingClientRect();
            buttonWidth = rect.width;
            buttonHeight = rect.height;

            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            startX = e.clientX;
            startY = e.clientY;
            e.preventDefault();

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        let clickTimer = null;

        floatButton.addEventListener('click', function () {
            if (hasMoved) return;

            if (clickTimer) {
                clearTimeout(clickTimer);
                clickTimer = null;
                const meta = getPageMetadata();
                let content = `#书签 🔗 **[${meta.title}](${meta.url})**`;
                if (meta.description) {
                    content += `\n\n> **网页描述**：${meta.description}`;
                }
                sendToMemos(content);
            } else {
                clickTimer = setTimeout(() => {
                    clickTimer = null;
                    handleSendAction();
                }, 220);
            }
        });

        onThemeChange((isDark) => {
            floatButton.classList.toggle('dark-mode', isDark);
        });
        floatButton.classList.toggle('dark-mode', isDarkMode());
    }

    function updateFloatButton() {
        if (isMemosConfigured()) {
            createFloatButton();
            if (cachedFloatButton) {
                cachedFloatButton.style.display = 'flex';
            }
        } else {
            if (cachedFloatButton) {
                cachedFloatButton.remove();
                cachedFloatButton = null;
            }
        }
    }

    document.addEventListener('mouseup', function () {
        if (!isMemosConfigured() || !cachedFloatButton) return;

        const selectedText = getSelectedText();
        if (selectedText) {
            cachedFloatButton.classList.add('has-selection');
        } else {
            cachedFloatButton.classList.remove('has-selection');
        }
    });

    function init() {
        updateFloatButton();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();