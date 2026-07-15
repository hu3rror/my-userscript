// ==UserScript==
// @name                    Jump to DeepWiki and zread.ai from Github
// @name:zh-CN              Github 跳转至 DeepWiki / zread.ai
// @namespace               https://github.com/hu3rror
// @version                 0.3.0
// @description             Add anchors to jump to DeepWiki and zread.ai from Github. Optimized for branch switching and fast loading.
// @description:zh-CN       在 Github 页面添加链接，跳转至 DeepWiki 及 zread.ai。针对分支切换与加载速度进行了深度优化。
// @author                  Hu3rror (Original script by shiquda)
// @match                   *://github.com/*
// @license                 MIT
// @run-at                  document-end
// @downloadURL             https://raw.githubusercontent.com/hu3rror/my-userscript/main/jump-to-deepwiki.user.js
// @updateURL               https://raw.githubusercontent.com/hu3rror/my-userscript/main/jump-to-deepwiki.user.js
// @homepageURL             https://github.com/hu3rror/my-userscript
// ==/UserScript==

/*
 * Credits (致谢与声明):
 * This script is a modified and optimized version of "Jump to DeepWiki from Github"
 * originally created by shiquda (https://github.com/shiquda / GreasyFork: 534147).
 * 
 * Modifications made by Hu3rror (2026):
 * 1. Restructured URL checking logic to support branch and file sub-pages.
 * 2. Optimized injection time using `@run-at document-end` and GitHub's native `turbo:load` events.
 * 3. Fixed link desync bugs during client-side (SPA) routing transitions.
 * 4. Added zread.ai support with a modular design.
 */

(function () {
    "use strict";

    // 获取当前页面的 GitHub 仓库 Owner 和 Repo
    function getRepoDetails() {
        const path = window.location.pathname;
        const segments = path.split('/').filter(Boolean);

        // 仓库路径至少需要有 [owner, repo] 两个部分
        if (segments.length < 2) return null;

        const [owner, repo] = segments;

        // 过滤掉 GitHub 的顶级保留非仓库页面
        const blacklist = new Set([
            'settings', 'notifications', 'search', 'explore', 'trending',
            'pulls', 'issues', 'marketplace', 'organizations', 'sponsors',
            'features', 'customer-stories', 'readme', 'about', 'enterprise',
            'pricing', 'contact', 'git-lfs', 'personal-files', 'topics',
            'collections', 'events', 'community', 'gists'
        ]);

        if (blacklist.has(owner.toLowerCase())) {
            return null;
        }

        return { owner, repo };
    }

    // 创建 DeepWiki 的 SVG 元素
    function createDeepWikiSvg() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('height', '16');
        svg.setAttribute('width', '16');
        svg.setAttribute('viewBox', '0 0 680 680');
        svg.setAttribute('fill', 'currentColor');

        const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path1.setAttribute('d', 'M418.73,332.37c9.84-5.68,22.07-5.68,31.91,0l25.49,14.71c.82.48,1.69.8,2.58,1.06.19.06.37.11.55.16.87.21,1.76.34,2.65.35.04,0,.08.02.13.02.1,0,.19-.03.29-.04.83-.02,1.64-.13,2.45-.32.14-.03.28-.05.42-.09.87-.24,1.7-.59,2.5-1.03.08-.04.17-.06.25-.1l50.97-29.43c3.65-2.11,5.9-6.01,5.9-10.22v-58.86c0-4.22-2.25-8.11-5.9-10.22l-50.97-29.43c-3.65-2.11-8.15-2.11-11.81,0l-50.97,29.43c-.08.04-.13.11-.2.16-.78.48-1.51,1.02-2.15,1.66-.1.1-.18.21-.28.31-.57.6-1.08,1.26-1.51,1.97-.07.12-.15.22-.22.34-.44.77-.77,1.6-1.03,2.47-.05.19-.1.37-.14.56-.22.89-.37,1.81-.37,2.76v29.43c0,11.36-6.11,21.95-15.95,27.63-9.84,5.68-22.06,5.68-31.91,0l-25.49-14.71c-.82-.48-1.69-.8-2.57-1.06-.19-.06-.37-.11-.56-.16-.88-.21-1.76-.34-2.65-.34-.13,0-.26.02-.4.02-.84.02-1.66.13-2.47.32-.13.03-.27.05-.4.09-.87.24-1.71.6-2.51,1.04-.08.04-.16.06-.24.1l-50.97,29.43c-3.65,2.11-5.9,6.01-5.9,10.22v58.86c0,4.22,2.25,8.11,5.9,10.22l50.97,29.43c.08.04.17.06.24.1.8.44,1.64.79,2.5,1.03.14.04.28.06.42.09.81.19,1.62.3,2.45.32.1,0,.19.04.29.04.04,0,.08-.02.13-.02.89,0,1.77-.13,2.65-.35.19-.04.37-.1.56-.16.88-.26,1.75-.59,2.58-1.06l25.49-14.71c9.84-5.68,22.06-5.68,31.91,0,9.84,5.68,15.95,16.27,15.95,27.63v29.43c0,.95.15,1.87.37,2.76.05.19.09.37.14.56.25.86.59,1.69,1.03,2.47.07.12.15.22.22.34.43.71.94,1.37,1.51,1.97.1.1.18.21.28.31.65.63,1.37,1.18,2.15,1.66.07.04.13.11.2.16l50.97,29.43c1.83,1.05,3.86,1.58,5.9,1.58s4.08-.53,5.9-1.58l50.97-29.43c3.65-2.11,5.9-6.01,5.9-10.22v-58.86c0-4.22-2.25-8.11-5.9-10.22l-50.97-29.43c-.08-.04-.16-.06-.24-.1-.8-.44-1.64-.8-2.51-1.04-.13-.04-.26-.05-.39-.09-.82-.2-1.65-.31-2.49-.33-.13,0-.25-.02-.38-.02-.89,0-1.78.13-2.66.35-.18.04-.36.1-.54.15-.88.26-1.75.59-2.58,1.07l-25.49,14.72c-9.84,5.68-22.07,5.68-31.9,0-9.84-5.68-15.95-16.27-15.95-27.63s6.11-21.95,15.95-27.63Z');

        const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path2.setAttribute('d', 'M141.09,317.65l50.97,29.43c1.83,1.05,3.86,1.58,5.9,1.58s4.08-.53,5.9-1.58l50.97-29.43c.08-.04.13-.11.2-.16.78-.48,1.51-1.02,2.15-1.66.1-.1.18-.21.28-.31.57-.6,1.08-1.26,1.51-1.97.07-.12.15-.22.22-.34.44-.77.77-1.6,1.03-2.47.05-.19.1-.37.14-.56.22-.89.37-1.81.37-2.76v-29.43c0-11.36,6.11-21.95,15.96-27.63s22.06-5.68,31.91,0l25.49,14.71c.82.48,1.69.8,2.57,1.06.19.06.37.11.56.16.87.21,1.76.34,2.64.35.04,0,.09.02.13.02.1,0,.19-.04.29-.04.83-.02,1.65-.13,2.45-.32.14-.03.28-.05.41-.09.87-.24,1.71-.6,2.51-1.04.08-.04.16-.06.24-.1l50.97-29.43c3.65-2.11,5.9-6.01,5.9-10.22v-58.86c0-4.22-2.25-8.11-5.9-10.22l-50.97-29.43c-3.65-2.11-8.15-2.11-11.81,0l-50.97,29.43c-.08.04-.13.11-.2.16-.78.48-1.51,1.02-2.15,1.66-.1.1-.18.21-.28.31-.57.6-1.08,1.26-1.51,1.97-.07.12-.15.22-.22.34-.44.77-.77,1.6-1.03,2.47-.05.19-.1.37-.14.56-.22.89-.37,1.81-.37,2.76v29.43c0,11.36-6.11,21.95-15.95,27.63-9.84,5.68-22.07,5.68-31.91,0l-25.49-14.71c-.82-.48-1.69-.8-2.58-1.06-.19-.06-.37-.11-.55-.16-.88-.21-1.76-.34-2.65-.35-.13,0-.26.02-.4.02-.83.02-1.66.13-2.47.32-.13.03-.27.05-.4.09-.87.24-1.71.6-2.51,1.04-.08.04-.16.06-.24.1l-50.97,29.43c-3.65,2.11-5.9,6.01-5.9,10.22v58.86c0,4.22,2.25,8.11,5.9,10.22Z');

        const path3 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path3.setAttribute('d', 'M396.88,484.35l-50.97-29.43c-.08-.04-.17-.06-.24-.1-.8-.44-1.64-.79-2.51-1.03-.14-.04-.27-.06-.41-.09-.81-.19-1.64-.3-2.47-.32-.13,0-.26-.02-.39-.02-.89,0-1.78.13-2.66.35-.18.04-.36.1-.54.15-.88.26-1.76.59-2.58,1.07l-25.49,14.72c-9.84,5.68-22.06,5.68-31.9,0-9.84-5.68-15.96-16.27-15.96-27.63v-29.43c0-.95-.15-1.87-.37-2.76-.05-.19-.09-.37-.14-.56-.25-.86-.59-1.69-1.03-2.47-.07-.12-.15-.22-.22-.34-.43-.71-.94,1.37-1.51,1.97-.1-.1-.18-.21-.28-.31-.65-.63-1.37-1.18-2.15-1.66-.07-.04-.13-.11-.2-.16l-50.97-29.43c-3.65-2.11-8.15-2.11-11.81,0l-50.97,29.43c-3.65,2.11-5.9,6.01-5.9,10.22v58.86c0,4.22,2.25,8.11,5.9,10.22l50.97,29.43c.08.04.17.06.25.1.8.44,1.63.79,2.5,1.03.14.04.29.06.43.09.8.19,1.61.3,2.43.32.1,0,.2.04.3.04.04,0,.09-.02.13-.02.88,0,1.77-.13,2.64-.34.19-.04.37-.1.56-.16.88-.26,1.75-.59,2.57-1.06l25.49-14.71c9.84-5.68,22.06-5.68,31.91,0,9.84,5.68,15.95,16.27,15.95,27.63v29.43c0,.95.15,1.87.37,2.76.05.19.09.37.14.56.25.86.59,1.69,1.03,2.47.07.12.15.22.22.34.43.71.94,1.37,1.51,1.97.1.1.18.21.28.31.65.63,1.37,1.18,2.15,1.66.07.04.13.11.2.16l50.97,29.43c1.83,1.05,3.86,1.58,5.9,1.58s4.08-.53,5.9-1.58l50.97-29.43c3.65-2.11,5.9-6.01,5.9-10.22v-58.86c0-4.22-2.25-8.11-5.9-10.22Z');

        svg.appendChild(path1);
        svg.appendChild(path2);
        svg.appendChild(path3);
        return svg;
    }

    // 创建 zread.ai 的 SVG 元素
    function createZreadSvg() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('viewBox', '0 0 32 32');
        svg.setAttribute('width', '16'); // 调整为标准的 16px 尺寸以契合 GitHub header 样式
        svg.setAttribute('height', '16');
        svg.setAttribute('fill', 'currentColor');

        svg.innerHTML = `
            <path d="M9.91922 3.2002H4.47922C3.77229 3.2002 3.19922 3.77327 3.19922 4.4802V9.9202C3.19922 10.6271 3.77229 11.2002 4.47922 11.2002H9.91922C10.6261 11.2002 11.1992 10.6271 11.1992 9.9202V4.4802C11.1992 3.77327 10.6261 3.2002 9.91922 3.2002Z" fill="currentColor"></path>
            <path d="M9.91922 20.7998H4.47922C3.77229 20.7998 3.19922 21.3729 3.19922 22.0798V27.5198C3.19922 28.2267 3.77229 28.7998 4.47922 28.7998H9.91922C10.6261 28.7998 11.1992 28.2267 11.1992 27.5198V22.0798C11.1992 21.3729 10.6261 20.7998 9.91922 20.7998Z" fill="currentColor"></path>
            <path d="M27.5208 3.2002H22.0808C21.3739 3.2002 20.8008 3.77327 20.8008 4.4802V9.9202C20.8008 10.6271 21.3739 11.2002 22.0808 11.2002H27.5208C28.2277 11.2002 28.8008 10.6271 28.8008 9.9202V4.4802C28.8008 3.77327 28.2277 3.2002 27.5208 3.2002Z" fill="currentColor"></path>
            <path d="M8 24L24 8L8 24Z" fill="currentColor"></path>
            <path d="M8 24L24 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
        `;
        return svg;
    }

    // 统一处理按钮的创建和更新
    function createOrUpdateBtn(pageheadActions, id, url, textContent, svgCreator) {
        const className = `js-jump-to-${id}-anchor`;
        const existingAnchor = document.querySelector(`.${className}`);

        // 如果链接已经存在，则检查并更新 href（防止 SPA 切换时链接失效）
        if (existingAnchor) {
            if (existingAnchor.href !== url) {
                existingAnchor.href = url;
            }
            return;
        }

        // 创建 A 标签，采用 GitHub 原生样式
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.classList.add('btn', 'btn-sm', className);
        anchor.setAttribute('data-view-component', 'true');

        // 生成对应的图标并应用 GitHub 类名
        const svg = svgCreator();
        svg.classList.add('octicon', 'mr-2', 'v-align-text-bottom', 'd-inline-block');

        // 创建文本层
        const textSpan = document.createElement('span');
        textSpan.classList.add('d-inline');
        textSpan.setAttribute('data-view-component', 'true');
        textSpan.textContent = textContent;

        anchor.appendChild(svg);
        anchor.appendChild(textSpan);

        const li = document.createElement('li');
        li.appendChild(anchor);

        // 插入到 GitHub 行动栏的最前端
        pageheadActions.insertBefore(li, pageheadActions.firstChild);
    }

    function CreateUI(repoDetails) {
        const pageheadActions = document.querySelector('ul.pagehead-actions');
        if (!pageheadActions) return;

        const deepwikiUrl = `https://deepwiki.com/${repoDetails.owner}/${repoDetails.repo}`;
        const zreadUrl = `https://zread.ai/${repoDetails.owner}/${repoDetails.repo}`;

        // 顺序说明：先后注入 zread，再注入 DeepWiki。
        // 由于采用的是 insertBefore 头部插入法，后插入的会排在更左边。
        // 最终界面显示顺序：[DeepWiki] [zread.ai] [GitHub 默认的 Watch/Fork/Star...]
        createOrUpdateBtn(pageheadActions, 'zread', zreadUrl, 'zread.ai', createZreadSvg);
        createOrUpdateBtn(pageheadActions, 'deepwiki', deepwikiUrl, 'DeepWiki', createDeepWikiSvg);
    }

    function checkAndCreateUI() {
        const repoDetails = getRepoDetails();
        if (repoDetails) {
            CreateUI(repoDetails);
        }
    }

    // 1. 首次冷启动（进入页面时运行）
    checkAndCreateUI();

    // 2. 监听 GitHub 的原生单页路由加载完毕事件 (Turbo Load)
    document.addEventListener('turbo:load', checkAndCreateUI);
})();