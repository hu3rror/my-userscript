// ==UserScript==
// @name                    Apple Music Link Helper
// @name:zh-CN              Apple Music 链接助手
// @name:zh-TW              Apple Music 連結助手
// @name:ja                 Apple Music リンク助手
// @namespace               https://github.com/hu3rror/my-userscript
// @version                 2.5.0
// @description             Copy ID, switch regions, and copy links for different countries on Apple Music.
// @description:zh-CN       快速复制 Apple Music 页面 ID、切换或复制不同国家/地区的歌曲链接。
// @description:zh-TW       快速複製 Apple Music 頁面 ID、切換或複製不同國家/地區的歌曲連結。
// @description:ja          Apple Music ページで ID コピー、地域切り替え、および地域限定リンクのコピーを簡単に行えます。
// @match                   https://music.apple.com/*
// @match                   https://beta.music.apple.com/*
// @grant                   GM_setClipboard
// @grant                   GM_addStyle
// @license                 MIT
// @homepageURL             https://github.com/hu3rror/my-userscript
// @downloadURL             https://raw.githubusercontent.com/hu3rror/my-userscript/main/apple-music-enhanced/apple-music-enhanced.user.js
// @updateURL               https://raw.githubusercontent.com/hu3rror/my-userscript/main/apple-music-enhanced/apple-music-enhanced.user.js
// ==/UserScript==

(function () {
    'use strict';

    // --- Internationalization (i18n) ---
    const translations = {
        'en': {
            copyId: 'Copy ID',
            idCopied: 'ID Copied',
            copyAlbumIdTitle: 'Copy Album ID',
            copyLink: 'Copy Link',
            switchRegion: 'Switch Region',
            manualInput: 'Manual Input...',
            manualInputHint: 'Enter region & press Enter',
            copyLinkHint: 'Enter region to copy link',
            regionLinkCopied: (regionName) => `${regionName} link copied`
        },
        'zh': {
            copyId: '复制ID',
            idCopied: 'ID已复制',
            copyAlbumIdTitle: '复制专辑ID',
            copyLink: '复制链接',
            switchRegion: '切换地区',
            manualInput: '手动输入...',
            manualInputHint: '输入地区简称后回车',
            copyLinkHint: '输入地区简称回车复制',
            regionLinkCopied: (regionName) => `${regionName} 链接已复制`
        },
        'ja': {
            copyId: 'IDコピー',
            idCopied: 'IDをコピーしました',
            copyAlbumIdTitle: 'アルバムIDをコピー',
            copyLink: 'リンクをコピー',
            switchRegion: '地域を切り替え',
            manualInput: '手動入力...',
            manualInputHint: '地域を入力してEnter',
            copyLinkHint: '地域を入力してEnterでコピー',
            regionLinkCopied: (regionName) => `${regionName} のリンクをコピーしました`
        }
    };

    function getLang() {
        const lang = navigator.language.split('-')[0];
        return translations[lang] ? lang : 'en';
    }

    const lang = getLang();
    const i18n = translations[lang];

    // --- End of i18n ---

    const regions = [
        { name: '🇭🇰', code: 'hk', fullName: 'Hongkong' },
        { name: '🇯🇵', code: 'jp', fullName: 'Japan' },
        { name: '🇺🇸', code: 'us', fullName: 'US' },
        { name: '🇨🇳', code: 'cn', fullName: 'China' }
    ];

    // Add styles
    GM_addStyle(`
        .region-switcher,
        .custom-button,
        .region-input {
            background-color: #1c1c1e;
            border: 1px solid #3c3c3e;
            color: #fff;
            font-size: 14px;
            font-family: inherit;
            padding: 8px 16px;
            border-radius: 16px;
            box-sizing: border-box;
            margin-right: 10px;
            transition: background-color 0.3s;
        }
        .region-switcher,
        .custom-button {
            height: 36px;
            cursor: pointer;
        }
        .region-switcher:hover,
        .custom-button:hover {
            background-color: #2c2c2e;
        }
        .custom-button:active {
            transform: scale(0.95);
        }
        .region-switcher:focus,
        .custom-button:focus,
        .region-input:focus {
            outline: none;
            box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
        }
        .region-switcher option {
            background-color: #1c1c1e;
            color: #fff;
            padding: 8px;
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
            padding: 8px 12px;
            width: 180px;
        }
        .region-input::placeholder {
            color: #8e8e93;
        }
    `);

    function createButton(text, onClick, title) {
        const button = document.createElement('button');
        button.textContent = text;
        button.className = 'custom-button';
        button.addEventListener('click', onClick);
        if (title) button.title = title;
        return button;
    }

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

    // Album ID is the numeric path segment; ?i= carries the song ID and is not part of it.
    function getAlbumId(url) {
        const match = new URL(url).pathname.match(/\/album\/[^/]*\/(\d+)\/?$/);
        return match ? match[1] : null;
    }

    function withRegion(url, code) {
        return url.replace(
            /^([a-z]+:\/\/[^/]+)(?:\/[a-z]{2}(?=[/?#]|$))?/i,
            (_, origin) => `${origin}/${code}`
        );
    }

    function regionLabel(code) {
        const region = regions.find((entry) => entry.code === code);
        return region ? region.fullName : code.toUpperCase();
    }

    function createRegionSelect(labelText) {
        const select = document.createElement('select');
        select.className = 'region-switcher';
        select.setAttribute('aria-label', labelText);

        const defaultOption = document.createElement('option');
        defaultOption.textContent = labelText;
        defaultOption.value = '';
        defaultOption.disabled = true;
        defaultOption.selected = true;
        select.appendChild(defaultOption);

        regions.forEach((region) => {
            const option = document.createElement('option');
            option.value = region.code;
            option.textContent = `${region.name} ${region.fullName}`;
            select.appendChild(option);
        });

        const manualOption = document.createElement('option');
        manualOption.value = 'manual';
        manualOption.textContent = i18n.manualInput;
        select.appendChild(manualOption);

        return select;
    }

    function createManualInput(placeholder) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'region-input';
        input.placeholder = placeholder;
        input.style.display = 'none';
        return input;
    }

    // The select and the manual input share one slot: only one of them is visible.
    function pairWithManualInput(select, input, onRegion) {
        const closeManual = () => {
            input.value = '';
            input.style.display = 'none';
            select.style.display = '';
            select.selectedIndex = 0;
        };

        select.addEventListener('change', () => {
            if (select.value === 'manual') {
                select.style.display = 'none';
                input.style.display = '';
                input.focus();
            } else if (select.value) {
                onRegion(select.value);
                select.selectedIndex = 0;
            }
        });

        input.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter') return;
            const code = input.value.trim().toLowerCase();
            if (!code) return;
            onRegion(code);
            closeManual();
        });

        input.addEventListener('blur', () => {
            if (input.style.display !== 'none') closeManual();
        });
    }

    function addButtons() {
        const previewButton = document.querySelector('button[data-testid="click-action"]');
        if (!previewButton) return;

        const albumId = getAlbumId(window.location.href);
        const existingContainer = document.querySelector('#buttons-container');
        if (existingContainer) {
            const hasCopyIdButton = Boolean(existingContainer.querySelector('button'));
            if (hasCopyIdButton === Boolean(albumId)) return;
            existingContainer.remove();
        }

        const container = document.createElement('div');
        container.id = 'buttons-container';

        if (albumId) {
            container.appendChild(createButton(i18n.copyId, function () {
                const currentAlbumId = getAlbumId(window.location.href);
                if (!currentAlbumId) return;
                GM_setClipboard(currentAlbumId);
                showFeedback(i18n.idCopied);
            }, i18n.copyAlbumIdTitle));
        }

        const copySelect = createRegionSelect(i18n.copyLink);
        const copyInput = createManualInput(i18n.copyLinkHint);
        pairWithManualInput(copySelect, copyInput, (code) => {
            GM_setClipboard(withRegion(window.location.href, code));
            showFeedback(i18n.regionLinkCopied(regionLabel(code)));
        });
        container.appendChild(copySelect);
        container.appendChild(copyInput);

        const switchSelect = createRegionSelect(i18n.switchRegion);
        const switchInput = createManualInput(i18n.manualInputHint);
        pairWithManualInput(switchSelect, switchInput, (code) => {
            window.location.href = withRegion(window.location.href, code);
        });
        container.appendChild(switchSelect);
        container.appendChild(switchInput);

        previewButton.parentNode.insertAdjacentElement('afterend', container);
    }

    addButtons();
    setInterval(addButtons, 1000);

})();
