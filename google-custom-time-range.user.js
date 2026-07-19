// ==UserScript==
// @name                    Google Search Custom Time Range Helper
// @name:zh-CN              Google 搜索自定义时间范围助手
// @namespace               https://github.com/hu3rror/my-userscript
// @version                 1.8.0
// @description             Add "Past 3 days/3 months/6 months" to Google Search time filter, and "English only/Japanese only" to the language filter. Also fixes a latent bug where combining a language filter with a time filter (or vice versa) silently dropped one directive from the tbs param.
// @description:zh-CN       在 Google 搜索"时间"菜单中添加 3天/3个月/6个月内选项，并在"语言"菜单中添加"仅英语/仅日语"选项。同时修复了时间筛选与语言筛选组合使用时，其中一个筛选条件会被静默覆盖丢失的潜在 bug。
// @author                  YourName
// @match                   *://www.google.com/search*
// @match                   *://www.google.com.hk/search*
// @match                   *://www.google.com.tw/search*
// @match                   *://www.google.co.jp/search*
// @match                   *://www.google.com.sg/search*
// @run-at                  document-end
// @grant                   none
// @license                 MIT
// @downloadURL             https://raw.githubusercontent.com/hu3rror/my-userscript/main/google-custom-time-range.user.js
// @updateURL               https://raw.githubusercontent.com/hu3rror/my-userscript/main/google-custom-time-range.user.js
// @homepageURL             https://github.com/hu3rror/my-userscript
// ==/UserScript==

(function () {
    'use strict';

    const style = document.createElement('style');
    style.textContent = `
        [jsname="qRxief"], [jsname="qRxief"] a {
            white-space: nowrap !important;
        }
    `;
    document.head.appendChild(style);

    const TIME_DICT = {
        'zh-CN': { d3: '过去 3 天内', m3: '过去 3 个月内', m6: '过去 6 个月内' },
        'zh-TW': { d3: '過去 3 天內', m3: '過去 3 個月內', m6: '過去 6 個月內' },
        'en': { d3: 'Past 3 days', m3: 'Past 3 months', m6: 'Past 6 months' },
        'ja': { d3: '3 日以内', m3: '3 ヶ月以内', m6: '6 ヶ月以内' }
    };

    const LANG_DICT = {
        'zh-CN': { en: '仅英语网页', ja: '仅日语网页' },
        'zh-TW': { en: '僅英文網頁', ja: '僅日文網頁' },
        'en': { en: 'English pages only', ja: 'Japanese pages only' },
        'ja': { en: '英語のページのみ', ja: '日本語のページのみ' }
    };
    function detectLanguage(sampleText) {
        if (!sampleText) return 'zh-CN';
        if (sampleText.includes('ヶ月') || sampleText.includes('以内')) return 'ja';
        if (sampleText.includes('內')) return 'zh-TW';
        if (sampleText.includes('内') || sampleText.includes('过去')) return 'zh-CN';
        return 'en';
    }

    // 判断当前页面 UI 语言：优先从已渲染的"时间"菜单文案取样，
    // 取不到（比如该页面没有时间菜单）时退回 <html lang> 属性。
    function getUiLanguage() {
        const qdrMLink = document.querySelector('a[href*="qdr:m"]');
        if (qdrMLink) return detectLanguage(qdrMLink.textContent.trim());

        const htmlLang = (document.documentElement.lang || '').toLowerCase();
        if (htmlLang.startsWith('zh-tw') || htmlLang.startsWith('zh-hant')) return 'zh-TW';
        if (htmlLang.startsWith('zh')) return 'zh-CN';
        if (htmlLang.startsWith('ja')) return 'ja';
        return 'en';
    }

    // tbs 参数可能同时包含多个用逗号分隔的指令（如 "qdr:d,lr:lang_1en"）。
    // 存在对应指令则原地替换，不存在则追加，避免互相覆盖。
    function upsertTbsDirective(tbsValue, matchRegex, newDirective) {
        if (!tbsValue) return newDirective;
        if (matchRegex.test(tbsValue)) {
            return tbsValue.replace(matchRegex, newDirective);
        }
        return `${tbsValue},${newDirective}`;
    }

    function replaceQdr(url, newQdr) {
        try {
            const u = new URL(url, window.location.origin);
            const tbs = u.searchParams.get('tbs');
            u.searchParams.set('tbs', upsertTbsDirective(tbs, /qdr:[a-z0-9]+/i, `qdr:${newQdr}`));
            return u.pathname + u.search + u.hash;
        } catch (e) {
            return url.replace(/qdr:[a-z0-9]+/i, `qdr:${newQdr}`);
        }
    }

    function replaceLang(url, code) {
        try {
            const u = new URL(url, window.location.origin);
            const tbs = u.searchParams.get('tbs');
            u.searchParams.set('tbs', upsertTbsDirective(tbs, /lr:lang_1[^,]*/i, `lr:lang_1${code}`));
            u.searchParams.set('lr', `lang_${code}`);
            return u.pathname + u.search + u.hash;
        } catch (e) {
            return url;
        }
    }

    function cleanAttributes(el) {
        const attrsToRemove = ['jsaction', 'jsdata', 'jsname', 'jscontroller', 'data-ved', 'ved'];
        attrsToRemove.forEach(attr => el.removeAttribute(attr));
        el.querySelectorAll('*').forEach(child => {
            attrsToRemove.forEach(attr => child.removeAttribute(attr));
        });
    }

    // 已通过真实 DOM 验证：时间菜单与语言菜单共用同一套菜单项结构。
    function getMenuItemWrapper(link) {
        if (!link) return null;
        return link.closest('[jscontroller="pzkXnb"][jsname="qRxief"]') || null;
    }

    // 安全校验：wrapper 内必须只有 1 个 <a> 且正是目标链接本身，
    // 防止选择器抓大导致大范围节点被克隆复制（历史上出现过的 bug）。
    function isSafeSingleItemWrapper(wrapper, link) {
        if (!wrapper) return false;
        const anchors = wrapper.querySelectorAll('a');
        return anchors.length === 1 && anchors[0] === link;
    }

    function containsOptionText(container, text) {
        if (!container || !container.textContent) return false;
        const clean = (str) => str.replace(/\s+/g, '').toLowerCase();
        return clean(container.textContent).includes(clean(text));
    }

    function forceReflow(el) {
        if (!el) return;
        void el.offsetWidth;
    }

    function releaseContainerWidth(container) {
        if (!container || !container.style) return;
        container.style.removeProperty('width');
        container.style.removeProperty('max-width');
        forceReflow(container);
    }

    function buildClonedItem(sourceItem, sourceLink, markAttr, markValue, hrefBuilder, text) {
        const clone = sourceItem.cloneNode(true);
        clone.setAttribute(markAttr, markValue);
        clone.classList.remove('Wf7Nsf'); // 防止源节点恰好是当前激活项时，误把激活态一并克隆过去
        cleanAttributes(clone);

        const a = clone.querySelector('a');
        if (!a) return null;
        a.removeAttribute('aria-current');
        a.href = hrefBuilder(sourceLink.getAttribute('href'));
        a.textContent = text;
        return clone;
    }

    function highlightActiveItem(activeItem) {
        if (!activeItem || !activeItem.parentNode) return;
        Array.from(activeItem.parentNode.children).forEach(sibling => {
            sibling.classList.remove('Wf7Nsf');
        });
        activeItem.classList.add('Wf7Nsf');
    }

    // ---------- 时间菜单 ----------

    function injectCustomTimeRanges(lang) {
        const qdrLinks = Array.from(document.querySelectorAll('a[href*="qdr:"]'));
        const qdrDLinks = qdrLinks.filter(a => /qdr:d($|&)/.test(a.href));
        const qdrMLinks = qdrLinks.filter(a => /qdr:m($|&)/.test(a.href));
        if (qdrDLinks.length === 0 || qdrMLinks.length === 0) return;

        const texts = TIME_DICT[lang] || TIME_DICT['en'];
        const touched = new Set();

        qdrDLinks.forEach(qdrDLink => {
            const itemD = getMenuItemWrapper(qdrDLink);
            if (!isSafeSingleItemWrapper(itemD, qdrDLink) || !itemD.parentNode) return;

            const parentD = itemD.parentNode;
            if (parentD.querySelector('[data-custom-qdr="d3"]') || containsOptionText(parentD, texts.d3)) return;

            const itemD3 = buildClonedItem(itemD, qdrDLink, 'data-custom-qdr', 'd3', href => replaceQdr(href, 'd3'), texts.d3);
            if (itemD3) {
                parentD.insertBefore(itemD3, itemD.nextSibling);
                touched.add(parentD);
            }
        });

        qdrMLinks.forEach(qdrMLink => {
            const itemM = getMenuItemWrapper(qdrMLink);
            if (!isSafeSingleItemWrapper(itemM, qdrMLink) || !itemM.parentNode) return;

            const parentM = itemM.parentNode;

            if (!parentM.querySelector('[data-custom-qdr="m3"]') && !containsOptionText(parentM, texts.m3)) {
                const itemM3 = buildClonedItem(itemM, qdrMLink, 'data-custom-qdr', 'm3', href => replaceQdr(href, 'm3'), texts.m3);
                if (itemM3) {
                    parentM.insertBefore(itemM3, itemM.nextSibling);
                    touched.add(parentM);
                }
            }

            if (!parentM.querySelector('[data-custom-qdr="m6"]') && !containsOptionText(parentM, texts.m6)) {
                const referenceItem = parentM.querySelector('[data-custom-qdr="m3"]') || itemM;
                const itemM6 = buildClonedItem(itemM, qdrMLink, 'data-custom-qdr', 'm6', href => replaceQdr(href, 'm6'), texts.m6);
                if (itemM6) {
                    parentM.insertBefore(itemM6, referenceItem.nextSibling);
                    touched.add(parentM);
                }
            }
        });

        touched.forEach(releaseContainerWidth);
    }

    function updateTimeActiveState() {
        const tbs = new URLSearchParams(window.location.search).get('tbs');
        if (!tbs) return;
        const match = tbs.match(/qdr:(d3|m3|m6)/);
        if (!match) return;
        highlightActiveItem(document.querySelector(`[data-custom-qdr="${match[1]}"]`));
    }

    // ---------- 语言菜单 ----------

    // 找一个"单一语言"的原生链接作为克隆模板（如"简体中文网页"）。
    // 判定标准：lr 参数值不含 "|"，即不是"中文网页"这种多语言组合项。
    function findSingleLangTemplateLink() {
        return Array.from(document.querySelectorAll('a[href*="lr=lang_"]')).find(a => {
            try {
                const lr = new URL(a.href, window.location.origin).searchParams.get('lr');
                return lr && !lr.includes('|');
            } catch (e) {
                return false;
            }
        }) || null;
    }

    function injectCustomLanguageOptions(lang) {
        const templateLink = findSingleLangTemplateLink();
        if (!templateLink) return; // 当前页面没有语言菜单（或结构不含单语言样例），跳过不注入

        const itemTemplate = getMenuItemWrapper(templateLink);
        if (!isSafeSingleItemWrapper(itemTemplate, templateLink) || !itemTemplate.parentNode) return;

        const parent = itemTemplate.parentNode;
        const texts = LANG_DICT[lang] || LANG_DICT['en'];
        const touched = new Set();

        ['en', 'ja'].forEach(code => {
            const text = texts[code];
            if (parent.querySelector(`[data-custom-lang="${code}"]`) || containsOptionText(parent, text)) return;

            const clone = buildClonedItem(itemTemplate, templateLink, 'data-custom-lang', code, href => replaceLang(href, code), text);
            if (clone) {
                parent.appendChild(clone);
                touched.add(parent);
            }
        });

        touched.forEach(releaseContainerWidth);
    }

    function updateLangActiveState() {
        const lr = new URLSearchParams(window.location.search).get('lr');
        if (!lr || lr.includes('|')) return; // 组合语言场景交给 Google 原生逻辑处理
        const code = lr.replace(/^lang_/, '');
        if (code !== 'en' && code !== 'ja') return;
        highlightActiveItem(document.querySelector(`[data-custom-lang="${code}"]`));
    }

    // ---------- 统一调度 ----------

    function runAll() {
        const lang = getUiLanguage();
        injectCustomTimeRanges(lang);
        injectCustomLanguageOptions(lang);
        updateTimeActiveState();
        updateLangActiveState();
    }

    let rafScheduled = false;
    const observer = new MutationObserver(() => {
        if (rafScheduled) return;
        rafScheduled = true;
        requestAnimationFrame(() => {
            rafScheduled = false;
            runAll();
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    runAll();
})();