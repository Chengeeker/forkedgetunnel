# CFData 本地启动器

这是独立的本机组件，用来从 forkedgetunnel 的“本地优选IP”按钮启动 **PoemMisty/CFData-WEB v1.8.5** 并打开浏览器。首次安装后使用 `forkedgetunnel-cfdata://open` 唤起，只监听 `127.0.0.1:13336`，不配置开机自启。

Windows 安装包解压后运行 `install.cmd`，以后直接点击网页按钮。安装位置为当前用户的 `%LOCALAPPDATA%\forkedgetunnel\CFData`，不需要管理员权限；使用结束可运行安装包中的 `stop.cmd`。卸载浏览器关联可用 `launcher.ps1 -Uninstall`，已有结果文件保留。

按当前使用方式，仅提供 Windows 本地启动器。Android 直接导入 Windows 配置好的订阅链接。浏览器首次唤起本机程序时可能要求确认，需由用户完成。

上游后端未改动，通过固定版本官方发布的 SHA-256 校验。后端、缓存、扫描和下载均在本机执行；本启动器不接受传入 URI 的命令、URL、端口或管理凭据。不要将本机服务映射到公网。

## 构建

在 Windows PowerShell 7 环境执行：

```powershell
./local-cfdata/build.ps1
```

构建脚本校验官方 Windows 两种架构程序，生成 Windows ZIP、校验清单和对应上游源码 ZIP。产物位于 `build/local-cfdata/release`，不提交 EXE 到源码分支。Windows 安装脚本兼容系统 Windows PowerShell 5.1，无需用户安装 PowerShell 7。

## 许可证与来源

本目录独立程序和脚本采用 **GPL-3.0-or-later**，见 LICENSE。它们与 GPL-2.0 的 Worker 通过独立进程和网页链接通信，未将 GPL-3.0 源码混入 Worker。CFData-WEB 版权归 PoemMisty，上游采用 GPL-3.0-or-later。

- 上游源码：[PoemMisty/CFData-WEB v1.8.5](https://github.com/PoemMisty/CFData-WEB/tree/v1.8.5)
- 对应源码包：[v1.8.5 source ZIP](https://github.com/PoemMisty/CFData-WEB/archive/refs/tags/v1.8.5.zip)
- 原始发布：[v1.8.5](https://github.com/PoemMisty/CFData-WEB/releases/tag/v1.8.5)

本目录及构建脚本构成启动器对应源码；正式发布同时提供上游源码 ZIP 和许可证。修改版本、后端或启动参数时同步更新 `upstream.json`、校验值及文档。
