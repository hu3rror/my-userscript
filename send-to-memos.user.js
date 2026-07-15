// ==UserScript==
// @name            发送到 Memos
// @name:en         Send to Memos
// @namespace       https://github.com/hu3rror/my-userscript
// @version         2.7.1
// @description     将选中的富文本（含列表、链接、代码等）、链接或文本发送到 Memos，支持智能代码高亮、防丢草稿与极致性能复用设计
// @description:en  Send selected rich text (including lists, links, code, etc.), links, or text to Memos, supports smart code highlighting, draft saving, and optimized UI recycling
// @author          Hu3rror
// @match           *://*/*
// @grant           GM_xmlhttpRequest
// @grant           GM_registerMenuCommand
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_addStyle
// @license         MIT
// @downloadURL     https://raw.githubusercontent.com/hu3rror/my-userscript/main/send-to-memos.user.js
// @updateURL       https://raw.githubusercontent.com/hu3rror/my-userscript/main/send-to-memos.user.js
// @homepageURL     https://github.com/hu3rror/my-userscript
// ==/UserScript==
(function () {
    'use strict';

    // 获取保存的配置或使用默认值
    const MEMOS_API_URL = GM_getValue('MEMOS_API_URL', '');
    const API_TOKEN = GM_getValue('API_TOKEN', '');
    let isConfigured = !!(MEMOS_API_URL && API_TOKEN);

    // 缓存全局 DOM 引用与临时事件句柄，降低内存与性能开销
    let cachedFloatButton = null;
    let configModal = null;
    let quickInputModal = null;
    let handleConfigEsc = null;
    let handleQuickInputEsc = null;

    // 检测系统颜色主题
    function isDarkMode() {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    // 注入样式（使用局部作用域 CSS 变量重构，优雅精简，避免污染）
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
            /* 局部作用域的 CSS 变量，便于维护且杜绝全局样式干扰 */
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

    // 安全检测选区是否位于 code 块内
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

    // 智能转义可能破坏 Markdown 链接格式的字符（如 [] 符号对）
    function escapeMarkdownTitle(text) {
        if (!text) return '';
        return text.replace(/([\[\]])/g, '\\$1');
    }

    // 原生、轻量 HTML-to-Markdown 递归转换解析器
    function htmlToMarkdown(node, listType = null, listIndex = 1, depth = 0) {
        if (!node) return '';

        // 处理纯文本节点
        if (node.nodeType === 3) {
            return node.nodeValue;
        }

        // 处理元素节点
        if (node.nodeType === 1) {
            const tagName = node.tagName.toLowerCase();

            // 安全过滤：拦截可能携带恶意执行逻辑或产生不必要样式的活性标签
            if (['script', 'style', 'noscript', 'iframe', 'object', 'embed'].includes(tagName)) {
                return '';
            }

            let childrenMarkdown = '';
            let nextListType = listType;
            if (tagName === 'ul') nextListType = 'ul';
            if (tagName === 'ol') nextListType = 'ol';

            let liCounter = 1;
            for (let i = 0; i < node.childNodes.length; i++) {
                const child = node.childNodes[i];

                // 忽略列表下无意义的空白文本节点，切断列表中多余空行的产生源头
                if ((tagName === 'ul' || tagName === 'ol') && child.nodeType === 3 && !child.nodeValue.trim()) {
                    continue;
                }

                if (child.nodeType === 1 && child.tagName.toLowerCase() === 'li') {
                    childrenMarkdown += htmlToMarkdown(child, nextListType, liCounter++, depth + 1);
                } else {
                    childrenMarkdown += htmlToMarkdown(child, nextListType, 1, depth);
                }
            }

            switch (tagName) {
                case 'strong':
                case 'b':
                    return childrenMarkdown.trim() ? `**${childrenMarkdown.trim()}**` : '';
                case 'em':
                case 'i':
                    return childrenMarkdown.trim() ? `*${childrenMarkdown.trim()}*` : '';
                case 'a':
                    const href = node.getAttribute('href');
                    const text = childrenMarkdown.trim();
                    if (href && text) {
                        try {
                            // 自动将相对路径转换为绝对路径链接，防止剪贴后失效
                            return `[${escapeMarkdownTitle(text)}](${new URL(href, document.baseURI).href})`;
                        } catch (e) {
                            return `[${escapeMarkdownTitle(text)}](${href})`;
                        }
                    }
                    return text;
                case 'code':
                    const isBlock = node.parentElement && node.parentElement.tagName.toLowerCase() === 'pre';
                    return isBlock ? childrenMarkdown : ` \`${childrenMarkdown.trim()}\` `;
                case 'pre':
                    const codeInfo = getSelectionCodeBlockInfo();
                    const lang = codeInfo ? codeInfo.lang : '';
                    return `\n\`\`\`${lang}\n${node.textContent.trim()}\n\`\`\`\n`;
                case 'li':
                    const indent = '  '.repeat(Math.max(0, depth - 1));
                    const marker = listType === 'ol' ? `${listIndex}. ` : '- ';
                    return `\n${indent}${marker}${childrenMarkdown.trim()}`;
                case 'ul':
                case 'ol':
                    return `${childrenMarkdown}\n`;
                case 'img':
                    const src = node.getAttribute('src');
                    const alt = node.getAttribute('alt') || 'image';
                    if (src) {
                        try {
                            return `![${escapeMarkdownTitle(alt)}](${new URL(src, document.baseURI).href})`;
                        } catch (e) {
                            return `![${escapeMarkdownTitle(alt)}](${src})`;
                        }
                    }
                    return '';
                case 'td':
                case 'th':
                    return ` ${childrenMarkdown.trim()} |`;
                case 'tr':
                    return `\n| ${childrenMarkdown.trim()}`;
                case 'p':
                case 'div':
                case 'h1':
                case 'h2':
                case 'h3':
                case 'h4':
                case 'h5':
                case 'h6':
                    return `\n${childrenMarkdown.trim()}\n`;
                case 'br':
                    return '\n';
                default:
                    return childrenMarkdown;
            }
        }
        return '';
    }

    // 智能获取选区内的富文本并转换为高质量 Markdown 格式
    function getSelectedMarkdown() {
        try {
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) return '';

            const range = sel.getRangeAt(0);
            const container = document.createElement('div');
            container.appendChild(range.cloneContents());

            let markdown = htmlToMarkdown(container).trim();

            // 智能消除多层级列表项之间残留的繁杂空行
            markdown = markdown.replace(/(^(\s*)-\s+.*)\n\s*\n(?=\s*-\s+)/gm, '$1\n');
            markdown = markdown.replace(/(^(\s*)\d+\.\s+.*)\n\s*\n(?=\s*\d+\.\s+)/gm, '$1\n');

            // 去除连续的多段空行
            markdown = markdown.replace(/\n{3,}/g, '\n\n');

            return markdown;
        } catch (e) {
            console.error('[Memos] 转换选区至 Markdown 时出错:', e);
            return window.getSelection().toString().trim(); // 出错退回到纯文本
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

    // 发送内容到 Memos 的基础函数（支持成功回调）
    function sendToMemos(content, onSuccessCallback) {
        if (!isConfigured) {
            showNotification('请先配置 Memos API URL 和 Token', true);
            showConfigModal();
            return;
        }

        if (MEMOS_API_URL.startsWith('http://')) {
            console.warn('[发送到 Memos] 您当前使用的 API URL 为非安全的 http 链接，建议升级至 https 保护 Token 安全。');
        }

        setFloatButtonState('loading');

        GM_xmlhttpRequest({
            method: 'POST',
            url: MEMOS_API_URL,
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                content: content,
                visibility: 'PRIVATE'
            }),
            onload: function (response) {
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
                showNotification('发送到 Memos 时出错: ' + error, true);
                setFloatButtonState('error');
            }
        });
    }

    // 存储当前右键点击的链接
    let currentLink = null;

    // 监听右键点击事件，捕获链接
    document.addEventListener('contextmenu', function (event) {
        currentLink = event.target.closest('a');
    }, false);

    // 注册菜单命令
    GM_registerMenuCommand('发送选中内容到 Memos', function () {
        handleSendAction();
    });

    GM_registerMenuCommand('配置 Memos API', function () {
        showConfigModal();
    });

    // 处理普通发送动作（智能富文本检测与 Markdown 排版适配）
    function handleSendAction() {
        const selectedMarkdown = getSelectedMarkdown();
        const meta = getPageMetadata();

        if (selectedMarkdown) {
            const codeInfo = getSelectionCodeBlockInfo();
            let content;

            // 如果全选了代码段，或者富文本转换已经正确将其封装为围栏代码块
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
            // [右键网页链接书签]
            const linkText = escapeMarkdownTitle(currentLink.textContent.trim() || '无文本');
            const linkUrl = currentLink.href;
            const content = `#书签 🔗 **[${linkText}](${linkUrl})**\n\n---\n**来源**：[${meta.title}](${meta.url})`;
            sendToMemos(content);
        } else {
            showQuickInputModal();
        }
    }

    // 清理 currentLink
    document.addEventListener('click', function () {
        currentLink = null;
    }, false);

    // 创建/激活配置模态框（极致性能：DOM复用单例模式设计）
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
                    <small style="color:#666;display:block;margin-top:5px;">注意：保留 /api/v1/memos 路径</small>
                </div>
                <div class="memos-form-group">
                    <label for="memos-api-token">API Token:</label>
                    <input type="password" id="memos-api-token" placeholder="输入您的 API Token">
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

            const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
            colorSchemeQuery.addEventListener('change', (e) => {
                modalContent.className = `memos-modal-content ${e.matches ? 'dark-mode' : 'light-mode'}`;
            });

            cancelButton.addEventListener('click', closeConfigModal);

            saveButton.addEventListener('click', function () {
                const apiUrl = apiUrlInput.value.trim();
                const apiToken = apiTokenInput.value.trim();

                if (!apiUrl || !apiToken) {
                    showNotification('API URL 和 Token 不能为空', true);
                    return;
                }

                GM_setValue('MEMOS_API_URL', apiUrl);
                GM_setValue('API_TOKEN', apiToken);
                isConfigured = true;

                showNotification('配置已保存');
                closeConfigModal();
                updateFloatButton();
            });
        }

        const modalContent = configModal.querySelector('.memos-modal-content');
        modalContent.className = `memos-modal-content ${isDarkMode() ? 'dark-mode' : 'light-mode'}`;

        const apiUrlInput = configModal.querySelector('#memos-api-url');
        const apiTokenInput = configModal.querySelector('#memos-api-token');
        if (apiUrlInput) apiUrlInput.value = GM_getValue('MEMOS_API_URL', '');
        if (apiTokenInput) apiTokenInput.value = GM_getValue('API_TOKEN', '');

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

    // 创建/激活快捷记录模态框（极致性能：DOM复用单例模式设计 + 文字精炼优化）
    function showQuickInputModal() {
        if (!isConfigured) {
            showNotification('请先配置 Memos API URL 和 Token', true);
            showConfigModal();
            return;
        }

        // 首次打开时：创建静态 DOM 
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

            const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
            colorSchemeQuery.addEventListener('change', (e) => {
                modalContent.className = `memos-modal-content ${e.matches ? 'dark-mode' : 'light-mode'}`;
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

        let buttonWidth = 36;
        let buttonHeight = 36;

        function onMouseMove(e) {
            if (isDragging) {
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
        }

        function onMouseUp() {
            if (isDragging) {
                GM_setValue('MEMOS_BUTTON_POSITION', {
                    left: parseInt(floatButton.style.left, 10) || 0,
                    top: parseInt(floatButton.style.top, 10) || 0
                });
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

        const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const updateButtonStyle = (e) => {
            if (e.matches) {
                floatButton.classList.add('dark-mode');
            } else {
                floatButton.classList.remove('dark-mode');
            }
        };

        updateButtonStyle(colorSchemeQuery);
        colorSchemeQuery.addEventListener('change', updateButtonStyle);
    }

    function updateFloatButton() {
        if (isConfigured) {
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
        if (!isConfigured || !cachedFloatButton) return;

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