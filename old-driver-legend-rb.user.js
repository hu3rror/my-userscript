// ==UserScript==
// @name                    OldOld Driver Legend (Rebuild)
// @namespace               https://github.com/hu3rror
// @version                 0.204
// @description             Old driver take you fly. Auto change secret code to magnet link. Auto fill Baidu cloud disk extraction password. Very fast, no bug, 100% safe. Please enjoy the car!
// @author                  ocrosoft & Security Expert
// @match                   *://*.liuli.app/*
// @match                   *://*.liuli.cat/*
// @match                   *://*.hacg.cat/*
// @match                   *://*.hacg.icu/*
// @match                   *://www.kkgal.com/*
// @match                   *://pan.baidu.com/s/*
// @match                   *://pan.baidu.com/disk/main*
// @match                   *://pan.baidu.com/share/init?surl=*
// @grant                   GM_setValue
// @grant                   GM_getValue
// @grant                   GM_addStyle
// @grant                   GM_openInTab
// @run-at                  document-end
// @downloadURL             https://raw.githubusercontent.com/hu3rror/my-userscript/main/old-driver-legend-rb.user.js
// @updateURL               https://raw.githubusercontent.com/hu3rror/my-userscript/main/old-driver-legend-rb.user.js
// ==/UserScript==

(function () {
    'use strict';

    // --- 核心工具库 ---
    const Utils = {
        config: {
            get: (key) => GM_getValue(key),
            set: (key, val) => GM_setValue(key, val)
        },
        // 安全地插入链接，防止 XSS
        safeAnchor: (text, href, style = "") => {
            const a = document.createElement('a');
            a.textContent = text;
            a.href = href;
            if (style) a.style.cssText = style;
            a.target = "_blank";
            return a;
        },
        // 观察者模式：检测 DOM 节点变化，发现目标后即时回调并自动断开，避免性能损耗
        observe: (selector, callback) => {
            const target = document.body;
            if (!target) return;

            // 首次尝试直接获取
            const element = document.querySelector(selector);
            if (element) {
                callback(element, null);
                return;
            }

            const observer = new MutationObserver((mutations, obs) => {
                const el = document.querySelector(selector);
                if (el) {
                    obs.disconnect(); // 找到后立即停止监听
                    callback(el, obs);
                }
            });
            observer.observe(target, { childList: true, subtree: true });
        }
    };

    // --- 站点处理器 ---
    const Handlers = {
        // 链接格式化处理逻辑
        formatter: {
            match: /liuli|hacg|kkgal/, // 已移除 reimu 匹配
            magnets: [], // 用于存储页面上生成的所有磁力链接 A 标签元素
            init() {
                this.magnets = [];
                this.processMagnet();
            },
            processMagnet() {
                const contents = document.querySelectorAll('.entry-content, #entry-content');
                if (!contents.length) return;

                // 精确匹配：
                // 1. 十六进制 40 位 (Hex 格式)
                // 2. Base32 格式 32 位 (常用于部分老旧或特定的磁力哈希，仅包含 a-z, 2-7)
                const magnetRegex = /\b([a-fA-F0-9]{40}|[a-zA-Z2-7]{32})\b/g;

                contents.forEach(contentEl => {
                    const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT, null, false);
                    const nodesToReplace = [];
                    let node;

                    while (node = walker.nextNode()) {
                        // 排除已在 <a> 标签内部的文本，避免重复嵌套
                        if (node.parentNode && node.parentNode.tagName.toLowerCase() === 'a') {
                            continue;
                        }
                        if (magnetRegex.test(node.nodeValue)) {
                            nodesToReplace.push(node);
                        }
                    }

                    nodesToReplace.forEach(textNode => {
                        const fragment = document.createDocumentFragment();
                        let lastIdx = 0;
                        const text = textNode.nodeValue;

                        // 重置正则索引
                        magnetRegex.lastIndex = 0;
                        let match;
                        while ((match = magnetRegex.exec(text)) !== null) {
                            const offset = match.index;
                            const matchedText = match[0];

                            // 插入匹配项之前的文本
                            fragment.appendChild(document.createTextNode(text.slice(lastIdx, offset)));

                            // 创建安全的 A 标签
                            const link = Utils.safeAnchor(
                                `[磁力: ${matchedText.slice(0, 8)}]`,
                                `magnet:?xt=urn:btih:${matchedText}`,
                                "color: #ff4757; font-weight: bold; margin: 0 4px; transition: color 0.3s ease;"
                            );
                            fragment.appendChild(link);

                            // 将生成的 A 标签推入数组，用于后续定位滚动
                            this.magnets.push(link);

                            lastIdx = offset + matchedText.length;
                        }

                        // 插入剩余文本
                        fragment.appendChild(document.createTextNode(text.slice(lastIdx)));
                        if (textNode.parentNode) {
                            textNode.parentNode.replaceChild(fragment, textNode);
                        }
                    });
                });

                // 如果页面上有解析出来的磁力链接，则创建悬浮跳转按钮
                if (this.magnets.length > 0) {
                    this.createJumpButton();
                }
            },
            // 创建右下角悬浮跳转按钮
            createJumpButton() {
                let currentIndex = 0;
                const btn = document.createElement('div');
                btn.id = 'magnet-jump-btn';
                btn.textContent = `🧭 Jump Link (1/${this.magnets.length})`;

                // 悬浮按钮样式设计
                btn.style.cssText = `
                    position: fixed;
                    bottom: 80px;
                    right: 25px;
                    z-index: 99999;
                    background-color: #ff4757;
                    color: #ffffff;
                    padding: 10px 16px;
                    border-radius: 20px;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(255, 71, 87, 0.3);
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    font-size: 13px;
                    font-weight: bold;
                    transition: all 0.3s ease;
                    user-select: none;
                `;

                // 悬浮反馈效果
                btn.addEventListener('mouseenter', () => {
                    btn.style.transform = 'translateY(-2px)';
                    btn.style.backgroundColor = '#ff6b81';
                    btn.style.boxShadow = '0 6px 16px rgba(255, 71, 87, 0.4)';
                });
                btn.addEventListener('mouseleave', () => {
                    btn.style.transform = 'translateY(0)';
                    btn.style.backgroundColor = '#ff4757';
                    btn.style.boxShadow = '0 4px 12px rgba(255, 71, 87, 0.3)';
                });

                // 点击滚动至对应的磁力链接
                btn.addEventListener('click', () => {
                    const target = this.magnets[currentIndex];
                    if (target) {
                        // 平滑滚动至视口中央
                        target.scrollIntoView({ behavior: 'smooth', block: 'center' });

                        // 高亮闪烁提示
                        const originalColor = target.style.color;
                        target.style.color = '#1e90ff'; // 闪烁为蓝色
                        setTimeout(() => {
                            target.style.color = originalColor;
                        }, 1000);

                        // 轮转索引并更新按钮文字
                        currentIndex = (currentIndex + 1) % this.magnets.length;
                        btn.textContent = `🧭 Jump Link (${currentIndex + 1}/${this.magnets.length})`;
                    }
                });

                document.body.appendChild(btn);
            }
        },

        // 表单辅助填充
        formHelper: {
            match: /pan\.baidu\.com/,
            init() {
                const hash = location.hash;
                if (hash.includes('tq=')) {
                    const code = hash.split('tq=')[1].split('&')[0];
                    this.fillCode(code);
                }
            },
            fillCode(code) {
                const inputSelector = 'input[tabindex="1"], .verify-input input';

                // 使用优化后的原生 MutationObserver 替换轮询 setInterval
                Utils.observe(inputSelector, (input) => {
                    // 1. 安全填充
                    input.value = code;
                    // 2. 触发 input 事件以适配 React/Vue 等单页应用状态绑定
                    input.dispatchEvent(new Event('input', { bubbles: true }));

                    // 3. 寻找并点击提交按钮
                    const btn = document.querySelector('#submitBtn, .verify-form a.g-button');
                    if (btn) {
                        setTimeout(() => btn.click(), 150);
                    }
                });
            }
        },

        // 视效优化（原安全模式）
        mediaOptimizer: {
            init() {
                const isEnabled = Utils.config.get('media_opt_enabled');
                if (isEnabled) {
                    GM_addStyle('img { display: none !important; }');
                }

                // 快捷键 Ctrl+Shift+S 切换
                window.addEventListener('keydown', (e) => {
                    if (e.ctrlKey && e.shiftKey && e.code === 'KeyS') {
                        const newState = !Utils.config.get('media_opt_enabled');
                        Utils.config.set('media_opt_enabled', newState);
                        alert(`视觉优化模式已${newState ? '开启' : '关闭'}，请刷新页面。`);
                    }
                });
            }
        }
    };

    // --- 主入口 ---
    const run = () => {
        const url = location.href;
        Handlers.mediaOptimizer.init();

        for (const key in Handlers) {
            const h = Handlers[key];
            if (h.match && h.match.test(url)) {
                console.log(`[Web Helper] Applied module: ${key}`);
                h.init();
            }
        }
    };

    run();
})();