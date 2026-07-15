// ==UserScript==
// @name                    SteamDB DLC List Extractor
// @name:zh-CN              SteamDB DLC 清单提取器
// @namespace               https://github.com/hu3rror
// @version                 1.0.0
// @description             Extract DLC list from SteamDB with easy config generator for CreamAPI/GreenLuma.
// @description:zh-CN       在 SteamDB 页面中批量提取 DLC 列表，支持一键生成并复制 CreamAPI、GreenLuma 等补丁所需的配置文件。
// @author                  Hu3rror
// @match                   *://steamdb.info/app/*
// @license                 MIT
// @run-at                  document-end
// @grant                   GM_addStyle
// @downloadURL             https://raw.githubusercontent.com/hu3rror/my-userscript/main/steamdb-dlc-extractor.user.js
// @updateURL               https://raw.githubusercontent.com/hu3rror/my-userscript/main/steamdb-dlc-extractor.user.js
// @homepageURL             https://github.com/hu3rror/my-userscript
// ==/UserScript==

(function () {
    'use strict';

    // DLC 格式模板定义
    const DLC_FORMATS = {
        dlcCreamApi5300WinFull: {
            name: "CreamAPI v5.3.0.0 Windows (FULL)",
            type: "general",
            fileName: "<data>appId</data>_dlcCreamApi5300WinFull.ini",
            text: `[steam]
; Application ID (http://store.steampowered.com/app/%appid%/)
appid=<data>appId</data>
; Current game language.
; Uncomment this option to turn it on.
; Default is "english".
;language=german
; Enable/disable automatic DLC unlock. Default option is set to "false".
; Keep in mind that this option  WON'T work properly if the "[dlc]" section is NOT empty
unlockall=false
; Original Valve's steam_api.dll.
; Default is "steam_api_o.dll".
orgapi=steam_api_o.dll
; Original Valve's steam_api64.dll.
; Default is "steam_api64_o.dll".
orgapi64=steam_api64_o.dll
; Enable/disable extra protection bypasser.
; Default is "false".
extraprotection=false
; Add the specific files to hide from detection.
; Use comma (,) to separate the files. "cream_api.ini" is hidden by default.
;filestohide=steam_appid.txt,steam_emu.ini
; The game will think that you're offline (supported by some games).
; Default is "false".
forceoffline=false
; Some games are checking for the low violence presence.
; Default is "false".
;lowviolence=true
; Purchase timestamp for the DLC (http://www.onlineconversion.com/unix_time.htm).
; Default is "0" (1970/01/01).
;purchasetimestamp=0

[steam_misc]
; Disables the internal SteamUser interface handler.
; Does have an effect on the games that are using the license check for the DLC/application.
; Default is "false".
disableuserinterface=false

[dlc]
; DLC handling.
; Format: <dlc_id> = <dlc_description>
; e.g. : 247295 = Saints Row IV - GAT V Pack
; If the DLC is not specified in this section
; then it won't be unlocked
<dlcs>{dlcId}={dlcName}</dlcs>`
        },
        dlcCreamApi5300LinuxFull: {
            name: "CreamAPI v5.3.0.0 Linux (FULL)",
            type: "general",
            fileName: "<data>appId</data>_dlcCreamApi5300LinuxFull.ini",
            text: `[steam]
; Application ID (http://store.steampowered.com/app/%appid%/)
appid=<data>appId</data>
; Current game language.
; Uncomment this option to turn it on.
; Default is "english".
;language=german
; Enable/disable automatic DLC unlock. Default option is set to "false".
; Keep in mind that this option  WON'T work properly if the "[dlc]" section is NOT empty
unlockall=false
; Original Valve's libsteam_api.so (x86).
; Default is "libsteam_api_o.so".
orgapi=libsteam_api_o.so
; Original Valve's libsteam_api.so (x64).
; Default is "libsteam_api_o.so".
orgapi64=libsteam_api_o.so
; The game will think that you're offline (supported by some games).
; Default is "false".
forceoffline=false
; Some games are checking for the low violence presence.
; Default is "false".
;lowviolence=true
; Purchase timestamp for the DLC (http://www.onlineconversion.com/unix_time.htm).
; Default is "0" (1970/01/01).
;purchasetimestamp=0

[steam_misc]
; Disables the internal SteamUser interface handler.
; Does have an effect on the games that are using the license check for the DLC/application.
; Default is "false".
disableuserinterface=false

[dlc]
; DLC handling.
; Format: <dlc_id> = <dlc_description>
; e.g. : 247295 = Saints Row IV - GAT V Pack
; If the DLC is not specified in this section
; then it won't be unlocked
<dlcs>{dlcId}={dlcName}</dlcs>`
        },
        dlcCreamApi5300MacFull: {
            name: "CreamAPI v5.3.0.0 Mac (FULL)",
            type: "general",
            fileName: "<data>appId</data>_dlcCreamApi5300MacFull.ini",
            text: `[steam]
; Application ID (http://store.steampowered.com/app/%appid%/)
appid=<data>appId</data>
; Current game language.
; Uncomment this option to turn it on.
; Default is "english".
;language=german
; Enable/disable automatic DLC unlock. Default option is set to "false".
; Keep in mind that this option  WON'T work properly if the "[dlc]" section is NOT empty
unlockall=false
; Original Valve's libsteam_api.dylib (ARM64/x86_64).
; Default is "libsteam_api_o.dylib".
orgapi=libsteam_api_o.dylib
; The game will think that you're offline (supported by some games).
; Default is "false".
forceoffline=false
; Some games are checking for the low violence presence.
; Default is "false".
;lowviolence=true
; Purchase timestamp for the DLC (http://www.onlineconversion.com/unix_time.htm).
; Default is "0" (1970/01/01).
;purchasetimestamp=0

[steam_misc]
; Disables the internal SteamUser interface handler.
; Does have an effect on the games that are using the license check for the DLC/application.
; Default is "false".
disableuserinterface=false

[dlc]
; DLC handling.
; Format: <dlc_id> = <dlc_description>
; e.g. : 247295 = Saints Row IV - GAT V Pack
; If the DLC is not specified in this section
; then it won't be unlocked
<dlcs>{dlcId}={dlcName}</dlcs>`
        },
        dlcCreamApi3410Full: {
            name: "CreamAPI v3.4.1.0 (FULL)",
            type: "general",
            fileName: "<data>appId</data>_dlcCreamApi3410Full.ini",
            text: `[steam]
; Application ID (http://store.steampowered.com/app/%appid%/)
appid=<data>appId</data>
; Current game language.
; Uncomment this option to turn it on.
; Default is "english".
;language=german
; Enable/disable automatic DLC unlock. Default option is set to "false".
; Keep in mind that this option is highly experimental and won't
; work if the game wants to call each DLC by index.
unlockall=false
; Original Valve's steam_api.dll.
; Default is "steam_api_o.dll".
orgapi=steam_api_o.dll
; Original Valve's steam_api64.dll.
; Default is "steam_api64_o.dll".
orgapi64=steam_api64_o.dll
; Enable/disable extra protection bypasser.
; Default is "false".
extraprotection=false
; The game will think that you're offline (supported by some games).
; Default is "false".
forceoffline=false
; Some games are checking for the low violence presence.
; Default is "false".
;lowviolence=true
; Installation path for the game.
; Note, that you can use ..\\ to set the parent directory (from where executable file is located).
; Maximum number of parent directories: 5 (..\\..\\..\\..\\..\\)
; Default is the path to current working directory.
;installdir=..\\
; Use DLC id as the appended installation directory.
; e.g. <install_directory>\\480
; Default is "true".
;dlcasinstalldir=false
; Purchase timestamp for the DLC (http://www.onlineconversion.com/unix_time.htm).
; Default is "0" (1970/01/01).
;purchasetimestamp=0
; Turn on the wrapper mode.
; Default is "false".
wrappermode=false

[steam_misc]
; Disables the internal SteamUser interface handler.
; Does have an effect on the games that are using the license check for the DLC/application.
; Default is "false".
disableuserinterface=false
; Disables the internal SteamUtils interface handler.
; Does have an effect on the games that are checking for the actual AppId (only matters when "wrappermode" is set to "true").
; Default is "false".
disableutilsinterface=false
; Disable the internal reserve hook of the "Steam_RegisterInterfaceFuncs" function.
; Default is "false".
disableregisterinterfacefuncs=false
; Unlock/Lock Steam parental restrictions.
; Default is "true".
;unlockparentalrestrictions=false
; SteamId64 to override. Note that this action could be risky !
; This option can only work if "disableuserinterface = false".
;steamid=0
; Bypass VAC signature check. Note that this action could be risky !
; Default is "false".
;signaturebypass=true

[steam_wrapper]
; Application ID to override (used when the wrapper mode is on)
newappid=0
; Use the internal storage system.
; Default is "false".
wrapperremotestorage=false
; Use the internal stats/achievements system.
; Default is "false".
wrapperuserstats=false
; Use the internal workshop (UGC) system.
; Default is "false".
wrapperugc=false
; Store the data in the current directory (incl. stats)
; By default the data is stored at: %appdata%/CreamAPI/%appid%/
; Default is "false".
saveindirectory=false
; Force the usage of a full save path instead of the relative one.
; Default is "false".
forcefullsavepath=false
; Disable internal callbacks system.
; Default is "false".
;disablecallbacks=true
; Disable/Enable a StoreStats callback. Takes effect only if "wrapperuserstats" is set to "true".
; Default is "true".
;storestatscallback=false
; Fixed achievements count.
; Some games can only work if this option is configured properly (e.g. Wolfenstein II).
; Default is "0".
achievementscount=0

[dlc]
; DLC handling.
; Format: <dlc_id> = <dlc_description>
; e.g. : 247295 = Saints Row IV - GAT V Pack
; If the DLC is not specified in this section
; then it won't be unlocked
<dlcs>{dlcId}={dlcName}</dlcs>

[dlc_installdirs]
; Installation path for the specific DLC (dependent from "installdir" option).
; This section works only if "dlcasinstalldir" option is set to "false".
; Format: <dlc_id> = <install_dir>
; e.g. : 556760 = DLCRoot0

[steam_ugc]
; Subscribed workshop items.
; This section works only if "wrappermode" and "wrapperugc" options are set to "true".
; Format: <dlc_id> = <true/false>
; e.g. : 812713531 = true
; Please refer to __README_WORKSHOP_EN__.txt for more details.
`
        },
        dlcSKSLauncherMiniPartial: {
            name: "SKSLauncherMini (ONLY DLC LIST)",
            type: "json",
            fileName: "<data>appId</data>_dlcSKSLauncherMiniPartial.json",
            text: `{
  <dlcs separator=",">
  "{dlcId}": "{dlcName}"
  </dlcs>
}`
        },
        dlcNemirtingasSteamEmuPartial: {
            name: "NemirtingasSteamEmu [Sep 2023] (ONLY DLC LIST)",
            type: "json",
            fileName: "<data>appId</data>_dlcNemirtingasSteamEmuPartial.json",
            text: `{
  <dlcs separator=",">
  "{dlcId}": {
    "Enabled": true,
    "Name": "{dlcName}"
  }
  </dlcs>
}`
        },
        dlcSmokeApiPartial: {
            name: "SmokeAPI (ONLY DLC LIST)",
            type: "json",
            fileName: "<data>appId</data>_dlcSmokeApiPartial.json",
            text: `{
  "<data>appId</data>": {
    "dlcs": {
      <dlcs separator=",">
      "{dlcId}": "{dlcName}"
      </dlcs>
    }
  }
}`
        },
        dlcGreenLumaTwoZeroTwoZeroBatchMode: {
            name: "GreenLuma 2020 (BATCH MODE)",
            type: "general",
            fileName: "<data>appId</data>_dlcGreenLumaTwoZeroTwoZeroBatchMode.bat",
            text: `@ECHO OFF
:: WINDOWS WORKING DIR BUG WORKAROUND
CD /D "%~dp0"
:: CHECK APPLIST DIR
IF EXIST .\\AppList RMDIR /S /Q .\\AppList
:: CREATE APPLIST DIR
MKDIR .\\AppList
:: CREATE DLCS FILES FOR __<data>name</data>__
ECHO <data>appId</data>> .\\AppList\\0.txt
<dlcs>:: {dlcName}
ECHO {dlcId}> .\\AppList\\{dlcIndex}.txt</dlcs>
:: START GREENLUMA 2020
IF EXIST .\\DLLInjector.exe GOTO :Q
GOTO :EXIT
:Q
SET /P c=Do you want to start GreenLuma 2020 [Y/N]?
IF /I "%c%" EQU "Y" GOTO :START
IF /I "%c%" EQU "N" GOTO :EXIT
GOTO :Q
:START
CLS
ECHO Launching Greenluma 2020 - APPID <data>appId</data> - APPNAME <data>name</data>
TASKKILL /F /IM steam.exe
TIMEOUT /T 2
DLLInjector.exe -DisablePreferSystem32Images
:EXIT
EXIT`
        },
        dlcGreenLuma2023ManagerBlueAmulet: {
            name: "GreenLuma 2023 Manager BlueAmulet (ONLY DLC LIST)",
            type: "json",
            fileName: "<data>appId</data>_dlcGreenLuma2023ManagerBlueAmulet.json",
            text: `[
  <dlcs separator=",">
  {
    "id": "{dlcId}",
    "name": "{dlcName}",
    "type": "DLC"
  }
  </dlcs>
]`
        },
        dlcUnsteamPartial: {
            name: "Unsteam (ONLY DLC LIST)",
            type: "general",
            fileName: "<data>appId</data>_dlcUnsteamPartial.ini",
            text: `dlcs=<dlcs separator=",">{dlcId}</dlcs>`
        },
        dlcLumaEmuPartial: {
            name: "LumaEmu (ONLY DLC LIST)",
            type: "general",
            fileName: "<data>appId</data>_dlcLumaEmuPartial.ini",
            text: `<dlcs>; {dlcName}
DLC_{dlcId}=1</dlcs>`
        },
        dlcCodexDlcFiveZeroDlcNamePartial: {
            name: "CODEX (DLC00000 = DLCName) (ONLY DLC LIST)",
            type: "general",
            fileName: "<data>appId</data>_dlcCodexDlc00000DlcNamePartial.ini",
            text: `<dlcs index-start-from-zero="false" index-prefix="5">DLC{dlcIndex}={dlcId}
DLCName{dlcIndex}={dlcName}</dlcs>`
        },
        dlcThreeDmGamePartial: {
            name: "3DMGAME (ONLY DLC LIST)",
            type: "general",
            fileName: "<data>appId</data>_dlcThreeDmGamePartial.ini",
            text: `<dlcs index-start-from-zero="true" index-prefix="3">; {dlcName}
DLC{dlcIndex}={dlcId}</dlcs>`
        },
        dlcSkidrowPartial: {
            name: "SKIDROW (ONLY DLC LIST)",
            type: "general",
            fileName: "<data>appId</data>_dlcSkidrowPartial.ini",
            text: `<dlcs>; {dlcName}
{dlcId}</dlcs>`
        },
        dlcDlcIdDlcName: {
            name: "APPID=APPIDNAME",
            type: "general",
            fileName: "<data>appId</data>_dlcDlcIdDlcName.ini",
            text: `<dlcs>{dlcId}={dlcName}</dlcs>`
        },
        dlcDlcIdDlcNameDQuoted: {
            name: "APPID=\"APPIDNAME\" (WITH DOUBLE QUOTES)",
            type: "dquote",
            fileName: "<data>appId</data>_dlcDlcIdDlcNameDQuoted.ini",
            text: `<dlcs>{dlcId}="{dlcName}"</dlcs>`
        },
        dlcDlcName: {
            name: "APPIDNAME",
            type: "general",
            fileName: "<data>appId</data>_dlcDlcName.ini",
            text: `<dlcs>{dlcName}</dlcs>`
        },
        dlcDlcId: {
            name: "APPID",
            type: "general",
            fileName: "<data>appId</data>_dlcDlcId.ini",
            text: `<dlcs>{dlcId}</dlcs>`
        }
    };

    // 注入页面所需的样式
    GM_addStyle(`
        .gdd-fab {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 99999;
            background-color: #4e355a;
            color: #ffffff;
            border: 1px solid #6b4c7c;
            border-radius: 6px;
            padding: 10px 18px;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(0,0,0,0.4);
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .gdd-fab:hover {
            background-color: #613b6a;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.5);
        }
        .gdd-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.75);
            z-index: 100000;
            display: none;
            align-items: center;
            justify-content: center;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .gdd-overlay.gdd-show {
            display: flex;
        }
        .gdd-modal {
            background-color: #1b2838;
            border: 1px solid #2a475e;
            border-radius: 8px;
            width: 680px;
            max-width: 90%;
            box-shadow: 0 12px 36px rgba(0,0,0,0.6);
            color: #c7d5e0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            animation: gddFadeIn 0.25s ease-out;
        }
        @keyframes gddFadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        .gdd-header {
            background-color: #171a21;
            padding: 16px 20px;
            border-bottom: 1px solid #2a475e;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .gdd-title {
            font-size: 16px;
            font-weight: 700;
            color: #ffffff;
            margin: 0;
        }
        .gdd-close {
            background: none;
            border: none;
            color: #66c0f4;
            font-size: 24px;
            cursor: pointer;
            line-height: 1;
            padding: 0;
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.1s ease;
        }
        .gdd-close:hover {
            color: #ffffff;
        }
        .gdd-body {
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 14px;
        }
        .gdd-row {
            display: flex;
            align-items: center;
            gap: 16px;
            flex-wrap: wrap;
        }
        .gdd-select {
            background-color: #171a21;
            color: #c7d5e0;
            border: 1px solid #2a475e;
            border-radius: 4px;
            padding: 8px 12px;
            font-size: 14px;
            cursor: pointer;
            outline: none;
            flex-grow: 1;
            min-width: 250px;
        }
        .gdd-select:focus {
            border-color: #66c0f4;
        }
        .gdd-checkbox-label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            cursor: pointer;
            user-select: none;
            color: #8f98a0;
        }
        .gdd-checkbox {
            cursor: pointer;
            margin: 0;
            width: 15px;
            height: 15px;
        }
        .gdd-textarea {
            background-color: #171a21;
            color: #c7d5e0;
            border: 1px solid #2a475e;
            border-radius: 4px;
            padding: 12px;
            font-family: "Courier New", Courier, monospace;
            font-size: 13px;
            line-height: 1.5;
            resize: vertical;
            height: 280px;
            outline: none;
        }
        .gdd-textarea:focus {
            border-color: #66c0f4;
        }
        .gdd-footer {
            background-color: #171a21;
            padding: 14px 20px;
            border-top: 1px solid #2a475e;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 12px;
        }
        .gdd-stats {
            font-size: 13px;
            color: #8f98a0;
        }
        .gdd-btn-group {
            display: flex;
            gap: 10px;
        }
        .gdd-btn {
            background-color: #214b6b;
            color: #ffffff;
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: background-color 0.1s ease;
        }
        .gdd-btn:hover {
            background-color: #2a5e88;
        }
        .gdd-btn-secondary {
            background-color: #3d4450;
        }
        .gdd-btn-secondary:hover {
            background-color: #4c5464;
        }
        .gdd-btn-success {
            background-color: #4b6e22;
        }
        .gdd-btn-success:hover {
            background-color: #5c882a;
        }
    `);

    // 提取 SteamDB 数据的函数
    function extractSteamDBData() {
        const appElement = document.querySelector('.scope-app[data-appid]');
        if (!appElement) return null;

        const appId = appElement.getAttribute('data-appid');
        const nameElement = document.querySelector('.pagehead h1');
        const name = nameElement ? nameElement.textContent.trim() : 'Unknown Game';

        const dlc = {};
        const dlcUnknowns = {};
        let dlcCount = 0;
        let dlcUnknownsCount = 0;

        // 仅在 DLC 选项卡中匹配对应的行
        const dlcRows = document.querySelectorAll('#dlc tr.app[data-appid]');
        dlcRows.forEach(row => {
            const id = row.getAttribute('data-appid');
            const td2 = row.querySelector('td:nth-of-type(2)');
            if (id && td2) {
                // 仅抓取链接 A 标签内的文本，以排除可能存在的 "unreleased" 等外部状态标签
                const link = td2.querySelector('a');
                const dlcName = link ? link.textContent.trim() : td2.textContent.trim();

                if (td2.classList.contains('muted')) {
                    dlcUnknowns[id] = dlcName;
                    dlcUnknownsCount++;
                } else {
                    dlc[id] = dlcName;
                    dlcCount++;
                }
            }
        });

        return {
            appId,
            name,
            dlc,
            dlcUnknowns,
            dlcCount,
            dlcUnknownsCount,
            dlcCountAll: dlcCount + dlcUnknownsCount
        };
    }

    // 格式化解析器辅助方法
    function parseAttributes(attrStr) {
        const attrs = {};
        if (!attrStr) return attrs;
        const matches = attrStr.matchAll(/([\w-]+)="([^"]*)"/g);
        for (const m of matches) {
            attrs[m[1]] = m[2];
        }
        return attrs;
    }

    function escapeString(str, formatType) {
        if (formatType === 'json' || formatType === 'dquote') {
            // 安全转义 JSON & INI 双引号格式中的特殊字符与斜杠
            return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        }
        return str;
    }

    // 核心模板替换逻辑
    function generateDlcOutput(formatKey, appData, includeUnknowns) {
        const format = DLC_FORMATS[formatKey];
        if (!format) return "";

        const dlcsToUse = includeUnknowns
            ? { ...appData.dlc, ...appData.dlcUnknowns }
            : appData.dlc;

        const dlcRegex = /<dlcs(?:\s+([^>]*))?>([\s\S]*?)<\/dlcs>/g;
        let processedText = format.text.replace(dlcRegex, (match, attrStr, content) => {
            const attrs = parseAttributes(attrStr);
            const indexStartFromZero = attrs['index-start-from-zero'] === 'true';
            const indexPrefix = attrs['index-prefix'] ? parseInt(attrs['index-prefix'], 10) : 0;
            const separator = attrs['separator'] !== undefined ? attrs['separator'] : '\n';

            const rows = [];
            let index = indexStartFromZero ? 0 : 1;

            for (const [dlcId, dlcName] of Object.entries(dlcsToUse)) {
                let dlcIndexStr = index.toString();
                if (indexPrefix > 0) {
                    dlcIndexStr = dlcIndexStr.padStart(indexPrefix, '0');
                }

                const escapedDlcName = escapeString(dlcName, format.type);
                let row = content
                    .replaceAll('{dlcId}', dlcId)
                    .replaceAll('{dlcIndex}', dlcIndexStr)
                    .replaceAll('{dlcName}', escapedDlcName);

                rows.push(row);
                index++;
            }

            return rows.join(separator);
        });

        // 全局替换 APP 基础信息
        processedText = processedText
            .replaceAll('<data>appId</data>', appData.appId)
            .replaceAll('<data>name</data>', appData.name);

        // 如果是 JSON 格式，执行格式化校验，确保缩进工整与数据无误
        if (format.type === 'json') {
            try {
                const parsed = JSON.parse(processedText);
                processedText = JSON.stringify(parsed, null, 2);
            } catch (e) {
                console.error("JSON formatting error", e);
            }
        }

        return processedText;
    }

    // 构建 UI 界面
    function createUI(appData) {
        if (document.getElementById('gdd-root')) return;

        // 1. 创建右下角悬浮按钮
        const fab = document.createElement('button');
        fab.className = 'gdd-fab';
        fab.innerHTML = `
            <svg style="width:16px;height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12h14"/>
            </svg>Get DLCs (${appData.dlcCountAll})
        `;
        document.body.appendChild(fab);

        // 2. 创建遮罩层与模态框
        const overlay = document.createElement('div');
        overlay.id = 'gdd-root';
        overlay.className = 'gdd-overlay';

        const modal = document.createElement('div');
        modal.className = 'gdd-modal';

        // 头部
        const header = document.createElement('div');
        header.className = 'gdd-header';
        header.innerHTML = `
            <h3 class="gdd-title">Get DLC Data - AppID ${appData.appId}</h3>
            <button class="gdd-close" title="Close">&times;</button>
        `;
        modal.appendChild(header);

        // 主体
        const body = document.createElement('div');
        body.className = 'gdd-body';

        // 游戏基本信息展示
        const gameInfo = document.createElement('div');
        gameInfo.style.fontSize = '14px';
        gameInfo.style.fontWeight = 'bold';
        gameInfo.style.color = '#ffffff';
        gameInfo.textContent = appData.name;
        body.appendChild(gameInfo);

        // 选项控制行
        const controlRow = document.createElement('div');
        controlRow.className = 'gdd-row';

        const select = document.createElement('select');
        select.className = 'gdd-select';
        Object.entries(DLC_FORMATS).forEach(([key, format]) => {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = format.name;
            select.appendChild(opt);
        });
        controlRow.appendChild(select);

        const checkboxLabel = document.createElement('label');
        checkboxLabel.className = 'gdd-checkbox-label';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'gdd-checkbox';
        // 如果页面没有未定义名字的 Unknown DLC，则禁用该选择框
        if (appData.dlcUnknownsCount === 0) {
            checkbox.disabled = true;
            checkboxLabel.style.opacity = '0.5';
            checkboxLabel.style.cursor = 'not-allowed';
        }
        checkboxLabel.appendChild(checkbox);
        const checkboxText = document.createElement('span');
        checkboxText.textContent = `Include Unknowns (${appData.dlcUnknownsCount})`;
        checkboxLabel.appendChild(checkboxText);
        controlRow.appendChild(checkboxLabel);

        body.appendChild(controlRow);

        // 文本域展示
        const textarea = document.createElement('textarea');
        textarea.className = 'gdd-textarea';
        textarea.readOnly = true;
        body.appendChild(textarea);

        modal.appendChild(body);

        // 底部状态栏与操作按钮
        const footer = document.createElement('div');
        footer.className = 'gdd-footer';

        const stats = document.createElement('div');
        stats.className = 'gdd-stats';

        const btnGroup = document.createElement('div');
        btnGroup.className = 'gdd-btn-group';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'gdd-btn';
        copyBtn.textContent = 'Copy';

        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'gdd-btn gdd-btn-success';
        downloadBtn.textContent = 'Download';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'gdd-btn gdd-btn-secondary';
        closeBtn.textContent = 'Close';

        btnGroup.appendChild(copyBtn);
        btnGroup.appendChild(downloadBtn);
        btnGroup.appendChild(closeBtn);

        footer.appendChild(stats);
        footer.appendChild(btnGroup);
        modal.appendChild(footer);

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // 更新文本内容
        function updateOutput() {
            const formatKey = select.value;
            const includeUnknowns = checkbox.checked;
            const output = generateDlcOutput(formatKey, appData, includeUnknowns);
            textarea.value = output;

            const currentCount = includeUnknowns ? appData.dlcCountAll : appData.dlcCount;
            stats.textContent = `DLCs formatted: ${currentCount}`;
        }

        // 监听配置选项变更
        select.addEventListener('change', updateOutput);
        checkbox.addEventListener('change', updateOutput);

        // 弹窗交互控制
        fab.addEventListener('click', () => {
            overlay.classList.add('gdd-show');
            updateOutput();
        });

        const closeModal = () => {
            overlay.classList.remove('gdd-show');
        };

        header.querySelector('.gdd-close').addEventListener('click', closeModal);
        closeBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });

        // 复制按钮事件
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(textarea.value).then(() => {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = 'Copied!';
                copyBtn.style.backgroundColor = '#4b6e22';
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                    copyBtn.style.backgroundColor = '';
                }, 1200);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        });

        // 下载按钮事件
        downloadBtn.addEventListener('click', () => {
            const formatKey = select.value;
            const format = DLC_FORMATS[formatKey];
            let fileName = format.fileName
                .replaceAll('<data>appId</data>', appData.appId)
                .replaceAll('<data>name</data>', appData.name);

            // 清理文件名中的不合法字符
            fileName = fileName.replace(/[\\/:*?"<>|]/g, '_');

            const blob = new Blob([textarea.value], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });

        // 点击 textarea 自动全选
        textarea.addEventListener('click', () => {
            textarea.select();
        });
    }

    // 初始化入口
    function init() {
        const appData = extractSteamDBData();
        if (appData && appData.dlcCountAll > 0) {
            createUI(appData);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();