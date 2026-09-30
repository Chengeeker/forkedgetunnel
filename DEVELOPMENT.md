# 开发记录

## 在线优选批量测速

- `edgetunnel` 的 `_worker.js` 只负责 Worker 后端；管理页面不是本仓库内的静态文件，而是通过 `Pages静态页面`（当前为 `https://edt-pages.github.io`）转发到独立的 `EDT-Pages/EDT-Pages.github.io` 仓库。
- 在线优选前端原本已经包含单条测速、批量测速 `startAllSpeedTests`、并发池和停止测速逻辑，缺陷是 `onlineOptimizeTemplate` 的速度列没有渲染 `#speedAllBtn` 控件，因此批量逻辑没有入口。
- 本次修复只改独立面板仓库的 `admin/index.html`：在速度列标题旁增加“一键测速”按钮，复用现有批量测速逻辑；补充批量状态文本，并让标题在窄屏自动换行。完整补丁保存在 `patches/EDT-Pages-admin-speed.patch`。未引入依赖，也未修改 Worker 的测速协议或并发策略。
- 当前批量测速仍沿用原实现：按“并发线程”设置换算测速并发，单个地址最多读取约 20,000,000 字节、最长 10 秒；批量测试可能产生较大的浏览器出口流量，用户可以点击同一按钮停止。

## 在线优选域名的边界

- 面板中的“在线优选域名”不是 `EDT-Pages` 的内置页面，而是跳转到独立的 `CF-Pages-BestCF` 项目（当前链接为 `https://bestcf.fxxk.dedyn.io/`）。
- 该项目当前的“优选延迟”按钮已经通过 `startLatencyRun` 和并发池批量遍历全部输入域名，不存在需要补上的“逐个点击延迟测试”入口。
- 该项目没有下载速度列或可用于测量 Mbps 的下载端点，只有对候选域名 `/cdn-cgi/trace` 的延迟测量。不能把这个小型 trace 响应的耗时换算成下载速度，否则结果没有可靠含义；因此本次没有伪造域名 Mbps 测速功能。
- 如果实际部署页面显示的行为与上述源代码不同，应先确认部署版本和来源。要增加域名真实下载测速，需要为所有候选域名约定一个可公开读取、大小稳定的测试资源或服务端点，再单独设计流量上限、并发和跨域策略。

## 部署边界

仅修改本仓库的 `_worker.js` 不会改变已部署的管理面板。要让 IP 批量测速修复生效，需要把 `patches/EDT-Pages-admin-speed.patch` 应用到自己 fork 的 `EDT-Pages.github.io/admin/index.html` 并部署该静态站点，然后配置 `EDT_PAGES_URL` 指向自己的面板根地址；未配置时 Worker 仍会继续加载官方面板。

域名优选若要使用自己的页面，需要另外 fork / 部署 `CF-Pages-BestCF`，并修改 `EDT-Pages` 中的域名优选跳转地址；本仓库不会直接修改第三方域名站点。

## 本次验证

- `admin/index.html` 的脚本块可由 Node.js `new Function` 编译。
- `#speedAllBtn` 和 `#speedStatus` 各存在一个，已有 `startAllSpeedTests` 绑定逻辑保持不变。
- 对 `CF-Pages-BestCF` 源码完成只读审计，确认其延迟测速已是批量流程，且没有真实下载测速实现。
- `git diff --check` 通过。
- 按要求未进行真实浏览器出口网络和 Cloudflare 部署验证；这类验证由用户在符合中国直连网络条件的环境中自行完成，不能由静态语法检查替代。
