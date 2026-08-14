# Glossary

本仓库是若干 Tampermonkey userscript 的集合。以下术语适用于单个脚本上下文（主要指 `steamdb-dlc-extractor.user.js`）。

## 术语

- **appid**：Steam 应用 ID。游戏与 DLC 在 Steam 中都以独立 appid 标识。
- **DLC**：游戏的可下载内容包。SteamDB 的 DLC 选项卡中每行一个，挂在该游戏 appid 下。
- **DLC 清单（manifest）**：为各类解锁工具生成的解锁配置文件，是脚本的最终产物（.ini / .json / .bat / .lua）。
- **格式模板（format template）**：定义"清单如何从 DLC 列表渲染出来"的模板，即脚本中 `DLC_FORMATS` 的每一条目。
- **Unknowns DLC**：SteamDB 页面中名称未确认或未发行的 DLC（单元格带 `muted` 样式）。默认排除出清单，勾选 **Include Unknowns** 复选框后可包含。
- **OpenSteamTool**：一款 Steam 解锁工具，读取 Lua 格式清单（`applist.lua`）。同一脚本中也指代对应的格式模板。
- **Lua 清单**：OpenSteamTool 的清单格式。每行 `addappid(<appid>) -- <名称>`；DLC 与游戏都用 `addappid` 解锁（OpenSteamTool 无 `adddlc` 函数），函数名不区分大小写。
- **Include Unknowns**：弹窗中的复选框，控制 Unknowns DLC 是否进入清单。

## 已定决策

- OpenSteamTool 格式模板只输出 DLC 行，不含主游戏行。
- 生成的 Lua 清单使用英文 DLC 名称作为行尾注释。