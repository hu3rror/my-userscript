// ==UserScript==
// @name Apple Music Enhanced
// @namespace http://tampermonkey.net/
// @version 2.0
// @description 增强Apple Music页面功能，提供ID复制和地区切换
// @match https://music.apple.com/*
// @grant GM_setClipboard
// @grant GM_addStyle
// @license GNU GPLv3
// @downloadURL https://update.greasyfork.org/scripts/499970/Apple%20Music%20Enhanced.user.js
// @updateURL https://update.greasyfork.org/scripts/499970/Apple%20Music%20Enhanced.meta.js
// ==/UserScript==

(function () {
    'use strict';

    // 定义可用地区
    const regions = [
        { name: '🇭🇰', code: 'hk', fullName: 'Hongkong' },
        { name: '🇯🇵', code: 'jp', fullName: 'Japan' },
        { name: '🇺🇸', code: 'us', fullName: 'US' },
        { name: '🇨🇳', code: 'cn', fullName: 'China' }
    ];

    // 添加样式
    GM_addStyle(`
        .region-switcher {
            background-color: #1c1c1e;
            border: 1px solid #3c3c3e;
            color: white;
            font-size: 14px;
            font-family: inherit;
            padding: 8px 16px;
            border-radius: 16px;
            cursor: pointer;
            display: flex;
            align-items: center;
            transition: background-color 0.3s;
            margin-right: 10px;
        }
        .region-switcher:hover {
            background-color: #2c2c2e;
        }
        .region-switcher:before {
            content: '🌍';
            margin-right: 5px;
        }
        .region-switcher:focus {
            outline: none;
            box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
        }
        .region-switcher option {
            background-color: #1c1c1e;
            color: white;
            padding: 8px;
        }
        .custom-button {
            background-color: #1d1d1f;
            border: 1px solid #3c3c3e;
            color: #fff;
            font-size: 14px;
            font-weight: bold;
            padding: 8px 16px;
            border-radius: 16px;
            cursor: pointer;
            margin-right: 10px;
            transition: background-color 0.3s, transform 0.1s;
        }
        .custom-button:hover {
            background-color: #2c2c2e;
        }
        .custom-button:active {
            transform: scale(0.95);
        }
        .feedback-message {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 9999;
            transition: opacity 0.3s;
            opacity: 1;
        }
        #buttons-container {
            display: flex;
            align-items: center;
            margin-top: 10px;
            flex-wrap: wrap;
        }
    `);

    // 创建通用按钮
    function createButton(text, onClick, title) {
        const button = document.createElement('button');
        button.textContent = text;
        button.className = 'custom-button';
        button.addEventListener('click', onClick);
        if (title) button.title = title;
        return button;
    }

    // 显示反馈消息
    function showFeedback(message) {
        const existingFeedback = document.querySelector('.feedback-message');
        if (existingFeedback) {
            existingFeedback.remove();
        }

        const feedback = document.createElement('div');
        feedback.textContent = message;
        feedback.className = 'feedback-message';
        document.body.appendChild(feedback);

        setTimeout(() => {
            feedback.style.opacity = '0';
            setTimeout(() => feedback.remove(), 300);
        }, 2000);
    }

    // 获取专辑ID
    function getAlbumId(url) {
        const match = url.match(/\/album\/.*?\/(\d+)(?:\?i=\d+)?$/);
        return match ? match[1] : null;
    }

    // 添加按钮到页面
    function addButtons() {
        // 检查按钮容器是否已存在
        const existingContainer = document.querySelector('#buttons-container');
        if (existingContainer) return;

        // 查找插入点
        const previewButton = document.querySelector('button[data-testid="click-action"]');
        if (!previewButton) return;

        // 创建按钮容器
        const container = document.createElement('div');
        container.id = 'buttons-container';

        // 添加复制ID按钮
        const copyIdButton = createButton('复制ID', function () {
            const albumId = getAlbumId(window.location.href);
            if (albumId) {
                GM_setClipboard(albumId);
                showFeedback('ID已复制');
            } else {
                showFeedback('未找到ID');
            }
        }, '复制专辑ID');
        container.appendChild(copyIdButton);

        // 创建地区选择器
        const regionSwitcher = document.createElement('select');
        regionSwitcher.className = 'region-switcher';

        // 添加默认选项
        const defaultOption = document.createElement('option');
        defaultOption.textContent = '切换地区';
        defaultOption.value = '';
        defaultOption.disabled = true;
        defaultOption.selected = true;
        regionSwitcher.appendChild(defaultOption);

        // 添加地区选项
        regions.forEach(region => {
            const option = document.createElement('option');
            option.value = region.code;
            option.textContent = `${region.name} ${region.fullName}`;
            regionSwitcher.appendChild(option);
        });

        // 添加地区切换事件
        regionSwitcher.addEventListener('change', function() {
            if (this.value) {
                const currentUrl = window.location.href;
                const newUrl = currentUrl.replace(
                    /\/\/music\.apple\.com\/[a-z]{2}/,
                    `//music.apple.com/${this.value}`
                );
                window.location.href = newUrl;
            }
        });

        container.appendChild(regionSwitcher);

        // 添加区域复制按钮
        regions.forEach(region => {
            const regionCopyButton = createButton(region.name, function () {
                const currentUrl = window.location.href.split('?')[0];
                const newUrl = currentUrl.replace(
                    /\/\/music\.apple\.com\/[a-z]{2}/,
                    `//music.apple.com/${region.code}`
                );
                GM_setClipboard(newUrl);
                showFeedback(`${region.fullName} 链接已复制`);
            }, `复制 ${region.fullName} 链接`);
            container.appendChild(regionCopyButton);
        });

        // 将按钮容器添加到页面
        previewButton.parentNode.insertAdjacentElement('afterend', container);
    }

    // 持续检查并添加按钮
    function persistentlyAddButtons() {
        addButtons();
        setTimeout(persistentlyAddButtons, 1000);
    }

    // 初始化
    persistentlyAddButtons();

    // 监听URL变化
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            setTimeout(addButtons, 1000);
        }
    }).observe(document, { subtree: true, childList: true });
})();