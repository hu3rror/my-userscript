// ==UserScript==
// @name         Apple Music Link Helper
// @name:zh-CN   Apple Music 链接助手
// @name:zh-TW   Apple Music 連結助手
// @name:ja      Apple Music リンク助手
// @namespace    https://github.com/hu3rror/my-userscript
// @version      2.4.1
// @description  Copy ID, switch regions, and copy links for different countries on Apple Music.
// @description:zh-CN 快速复制 Apple Music 页面 ID、切换或复制不同国家/地区的歌曲链接。
// @description:zh-TW 快速複製 Apple Music 頁面 ID、切換或複製不同國家/地區的歌曲連結。
// @description:ja   Apple Music ページで ID コピー、地域切り替え、および地域限定リンクのコピーを簡単に行えます。
// @match        https://music.apple.com/*
// @match        https://beta.music.apple.com/*
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @license      MIT
// @homepageURL  https://github.com/hu3rror/my-userscript
// ==/UserScript==

(function () {
    'use strict';

    // --- Internationalization (i18n) ---
    const translations = {
        'en': {
            copyId: 'Copy ID',
            idCopied: 'ID Copied',
            idNotFound: 'ID Not Found',
            copyAlbumIdTitle: 'Copy Album ID',
            switchRegion: 'Switch Region',
            manualInput: 'Manual Input...',
            manualInputHint: 'Enter region & press Enter',
            copyLinkHint: 'Enter region to copy link',
            regionLinkCopied: (regionName) => `${regionName} link copied`,
            copyRegionLinkTitle: (regionName) => `Copy ${regionName} Link`
        },
        'zh': {
            copyId: '复制ID',
            idCopied: 'ID已复制',
            idNotFound: '未找到ID',
            copyAlbumIdTitle: '复制专辑ID',
            switchRegion: '切换地区',
            manualInput: '手动输入...',
            manualInputHint: '输入地区简称后回车',
            copyLinkHint: '输入地区简称回车复制',
            regionLinkCopied: (regionName) => `${regionName} 链接已复制`,
            copyRegionLinkTitle: (regionName) => `复制 ${regionName} 链接`
        },
        'ja': {
            copyId: 'IDコピー',
            idCopied: 'IDをコピーしました',
            idNotFound: 'IDが見つかりません',
            copyAlbumIdTitle: 'アルバムIDをコピー',
            switchRegion: '地域を切り替え',
            manualInput: '手動入力...',
            manualInputHint: '地域を入力してEnter',
            copyLinkHint: '地域を入力してEnterでコピー',
            regionLinkCopied: (regionName) => `${regionName} のリンクをコピーしました`,
            copyRegionLinkTitle: (regionName) => `${regionName} のリンクをコピー`
        }
    };

    function getLang() {
        const lang = navigator.language.split('-')[0];
        return translations[lang] ? lang : 'en'; // Default to English
    }

    const lang = getLang();
    const i18n = translations[lang];

    // --- End of i18n ---


    // Define available regions
    const regions = [
        { name: '🇭🇰', code: 'hk', fullName: 'Hongkong' },
        { name: '🇯🇵', code: 'jp', fullName: 'Japan' },
        { name: '🇺🇸', code: 'us', fullName: 'US' },
        { name: '🇨🇳', code: 'cn', fullName: 'China' }
    ];

    // Add styles
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
        .region-input {
            background-color: #1d1d1f;
            border: 1px solid #3c3c3e;
            color: #fff;
            font-size: 14px;
            padding: 8px 12px;
            border-radius: 16px;
            margin-right: 10px;
            width: 180px;
            box-sizing: border-box;
        }
        .region-input::placeholder {
            color: #8e8e93;
        }
        .region-input:focus {
            outline: none;
            box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
        }
    `);

    // Create a generic button
    function createButton(text, onClick, title) {
        const button = document.createElement('button');
        button.textContent = text;
        button.className = 'custom-button';
        button.addEventListener('click', onClick);
        if (title) button.title = title;
        return button;
    }

    // Show feedback message
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

    // Get Album ID from URL
    function getAlbumId(url) {
        const match = url.match(/\/album\/.*?\/(\d+)(?:\?i=\d+)?$/);
        return match ? match[1] : null;
    }

    // Add buttons to the page
    function addButtons() {
        // Check if the button container already exists
        const existingContainer = document.querySelector('#buttons-container');
        if (existingContainer) return;

        // Find the insertion point
        const previewButton = document.querySelector('button[data-testid="click-action"]');
        if (!previewButton) return;

        // Create a container for the buttons
        const container = document.createElement('div');
        container.id = 'buttons-container';

        // Add "Copy ID" button
        const copyIdButton = createButton(i18n.copyId, function () {
            const albumId = getAlbumId(window.location.href);
            if (albumId) {
                GM_setClipboard(albumId);
                showFeedback(i18n.idCopied);
            } else {
                showFeedback(i18n.idNotFound);
            }
        }, i18n.copyAlbumIdTitle);
        container.appendChild(copyIdButton);

        // --- Feature 1: Region Switcher with Manual Input ---

        // Create region switcher dropdown
        const regionSwitcher = document.createElement('select');
        regionSwitcher.className = 'region-switcher';

        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.textContent = i18n.switchRegion;
        defaultOption.value = '';
        defaultOption.disabled = true;
        defaultOption.selected = true;
        regionSwitcher.appendChild(defaultOption);

        // Add region options
        regions.forEach(region => {
            const option = document.createElement('option');
            option.value = region.code;
            option.textContent = `${region.name} ${region.fullName}`;
            regionSwitcher.appendChild(option);
        });

        // Add manual input option
        const manualOption = document.createElement('option');
        manualOption.value = 'manual';
        manualOption.textContent = i18n.manualInput;
        regionSwitcher.appendChild(manualOption);

        // Create manual input field (initially hidden)
        const manualSwitchInput = document.createElement('input');
        manualSwitchInput.type = 'text';
        manualSwitchInput.className = 'region-input';
        manualSwitchInput.placeholder = i18n.manualInputHint;
        manualSwitchInput.style.display = 'none'; // Hide it initially

        // Event listener for the manual input
        manualSwitchInput.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' && this.value.trim() !== '') {
                const regionCode = this.value.trim().toLowerCase();
                const currentUrl = window.location.href;
                const newUrl = currentUrl.replace(
                    /\/\/music\.apple\.com\/[a-z]{2}/,
                    `//music.apple.com/${regionCode}`
                );
                window.location.href = newUrl;
            }
        });

        // Event listener for when the input loses focus
        manualSwitchInput.addEventListener('blur', function () {
            this.style.display = 'none';
            regionSwitcher.style.display = '';
            regionSwitcher.value = ''; // Reset dropdown
        });

        // Add region switch event listener for the dropdown
        regionSwitcher.addEventListener('change', function () {
            if (this.value === 'manual') {
                // Switch to manual input mode
                this.style.display = 'none';
                manualSwitchInput.style.display = '';
                manualSwitchInput.focus();
            } else if (this.value) {
                // Switch to a predefined region
                const currentUrl = window.location.href;
                const newUrl = currentUrl.replace(
                    /\/\/music\.apple\.com\/[a-z]{2}/,
                    `//music.apple.com/${this.value}`
                );
                window.location.href = newUrl;
            }
        });

        container.appendChild(regionSwitcher);
        container.appendChild(manualSwitchInput);

        // --- End of Feature 1 ---

        // Add region copy buttons
        regions.forEach(region => {
            const regionCopyButton = createButton(region.name, function () {
                const currentUrl = window.location.href.split('?')[0];
                const newUrl = currentUrl.replace(
                    /\/\/music\.apple\.com\/[a-z]{2}/,
                    `//music.apple.com/${region.code}`
                );
                GM_setClipboard(newUrl);
                showFeedback(i18n.regionLinkCopied(region.fullName));
            }, i18n.copyRegionLinkTitle(region.fullName));
            container.appendChild(regionCopyButton);
        });

        // --- Feature 2: Manual Copy Link Input ---

        const manualCopyInput = document.createElement('input');
        manualCopyInput.type = 'text';
        manualCopyInput.className = 'region-input';
        manualCopyInput.placeholder = i18n.copyLinkHint;

        manualCopyInput.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' && this.value.trim() !== '') {
                const regionCode = this.value.trim().toLowerCase();
                const currentUrl = window.location.href.split('?')[0];
                const newUrl = currentUrl.replace(
                    /\/\/music\.apple\.com\/[a-z]{2}/,
                    `//music.apple.com/${regionCode}`
                );
                GM_setClipboard(newUrl);
                showFeedback(i18n.regionLinkCopied(regionCode.toUpperCase()));
                this.value = ''; // Clear input after copying
            }
        });

        container.appendChild(manualCopyInput);

        // --- End of Feature 2 ---


        // Insert the button container into the page
        previewButton.parentNode.insertAdjacentElement('afterend', container);
    }

    // Persistently check and add buttons
    function persistentlyAddButtons() {
        addButtons();
        setTimeout(persistentlyAddButtons, 1000);
    }

    // Initialization
    persistentlyAddButtons();

    // Listen for URL changes
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            setTimeout(addButtons, 1000);
        }
    }).observe(document, { subtree: true, childList: true });

})();