# 开发记录

## Fork 品牌与默认配置

- 当前项目仓库地址为 `https://github.com/Chengeeker/forkedgetunnel`；管理面板、登录页、异常提示页的 GitHub 链接，以及管理面板的 Telegram、版本检查和下载链接均指向当前 fork。原作者的优选数据、订阅转换配置和开源致谢链接仍保留为外部依赖或来源说明，不能为了改品牌而替换。
- 新建配置默认订阅名称为 `forkedgetunnel`，默认开启 ECH，默认 `PROXYIP` 为 `proxyip.cmliussss.net`。
- `_worker.js` 对仍保留原项目三项默认值（订阅名 `edgetunnel`、ECH 关闭、PROXYIP 为 `auto`）且未完成 fork 默认迁移的旧 KV 配置执行一次迁移；检测到这些字段已有不同自定义值时不会覆盖。迁移后写入 `_forkedgetunnelDefaultsVersion`，用户后续手动修改会被保留。
- `Pages静态页面` 仍是普通 Worker 无 `ASSETS` 绑定时的外部管理页回退地址；Pages 合并部署优先读取本仓库的本地 `admin/`、`login/` 等资源，不能把 GitHub 仓库 URL 直接当作 HTML 回退地址。

## 自定义优选一键排序

- “自定义优选”输入框旁新增“一键排序”按钮，只重排当前文本，不改变节点地址、标签或测速结果；排序后仍需点击页面底部“保存”才会写入 `ADD.txt`。
- 排序优先级固定为：端口分组（443 → 2053 → 其他端口），再按预设的近中国国家/地区顺序分组（`HK → CN → MO → TW → JP → KR → SG → MY → TH → VN → PH → ID → AU → IN → AE → RU → DE → NL → GB → FR → CA → US`，未知地区放后面），最后在同一端口和地区内按 `Mbps` 下载速度从高到低排列。
- 同端口、同地区、同网速时保留原始顺序，不使用延时作为排序依据。没有显式端口的主机按 Worker 默认的 443 处理；无法识别为节点地址的非空行会稳定地放到最后，避免把订阅 URL 当作节点解析。
- 国家/地区主要读取节点行中 `#HK`、`#JP` 这类两位代码，同时兼容常见中英文地区名称。排序不引入第三方库，空行会按新的端口和地区分组重新生成。

## 在线优选批量测速

- `edgetunnel` 的 `_worker.js` 负责 Worker 后端，管理面板原本位于独立的 `EDT-Pages/EDT-Pages.github.io` 仓库。
- 在线优选前端原本已经包含单条测速、批量测速 `startAllSpeedTests`、并发池和停止测速逻辑，缺陷是 `onlineOptimizeTemplate` 的速度列没有渲染 `#speedAllBtn` 控件，因此批量逻辑没有入口。
- 面板 fork `Chengeeker/EDT-Pages.github.io` 已在 `ce389dd` 增加“一键测速”按钮。本仓库当前已将该版本的 `admin/index.html`、登录页、无配置提示页和登录页所需的 `cdn-cgi/trace` 静态资源纳入根目录，后续 Pages 部署直接使用这些文件。
- 本次没有引入依赖，也没有修改 Worker 的测速协议或并发策略。批量测速仍沿用原实现：按“并发线程”设置换算测速并发，单个地址最多读取约 20,000,000 字节、最长 10 秒；批量测试可能产生较大的浏览器出口流量，用户可以点击同一按钮停止。
- 后续测速调整：原实现把测速并发按“并发线程 ÷ 8”换算，并且拖选批量最多限制为 4 个。现在高级设置增加独立的“测速并发”输入，默认 10、范围 1～32；“一键测速”和拖选批量统一使用该值，延迟优选的“并发线程”不再影响下载测速并发。
- “测速并发”每个任务最多请求约 20,000,000 字节并可持续约 10 秒；设置为 10 或更高会明显增加浏览器出口流量，应根据本地网络和目标站点承载能力调整。

## 合并部署实现

- `_worker.js` 新增 `获取管理页面资源`：Cloudflare Pages Advanced mode 提供 `ASSETS` 绑定时，`/admin`、`/login`、`/noADMIN`、`/noKV` 和 `/cdn-cgi/trace` 优先从当前仓库读取；本地资源缺失时才回退到外部面板地址。
- Pages 部署不需要额外的构建依赖或配置文件，现有 `_worker.js` 继续作为 Advanced mode 入口，静态目录与 Worker 位于同一个仓库根目录。
- `EDT_PAGES_URL` 仍保留，作为普通 Worker 部署或需要切换外部面板时的兼容回退变量。合并后的 Pages 部署不需要设置它。
- 这样主程序和管理页面只需要创建一个 Cloudflare Pages 项目、连接一个 GitHub 仓库即可。原来的 `EDT-Pages.github.io` fork 保留为面板源码来源和独立维护副本，但不再是合并部署的前置步骤。
- 在线优选域名仍然跳转到独立的 `CF-Pages-BestCF` 项目（当前链接为 `https://bestcf.fxxk.dedyn.io/`）。它不是管理面板仓库的一部分，且其“优选延迟”本来就是批量流程；本次没有把第三方域名站点复制进来。

## 在线优选域名的边界

- 面板中的“在线优选域名”不是 `EDT-Pages` 的内置页面，而是跳转到独立的 `CF-Pages-BestCF` 项目。
- 该项目当前的“优选延迟”按钮已经通过 `startLatencyRun` 和并发池批量遍历全部输入域名，不存在需要补上的“逐个点击延迟测试”入口。
- 该项目没有下载速度列或可用于测量 Mbps 的下载端点，只有对候选域名 `/cdn-cgi/trace` 的延迟测量。不能把这个小型 trace 响应的耗时换算成下载速度，否则结果没有可靠含义；因此本次没有伪造域名 Mbps 测速功能。
- `proxyip.cmliussss.net` 不是上述域名优选页，而是跳转到独立的 `CF-Workers-CheckProxyIP` 检测工具。该工具已经有批量解析与 ProxyIP 可用性检测，前端检查并发为 32；其 `responseTime` 来自 ProxyIP 的 TCP/TLS 探针，不能当作下载速度。
- 因此，当前仓库不会把 `proxyip.cmliussss.net` 强行塞进 CF CDN 域名优选逻辑，也不会把连通性探测结果显示成 Mbps。要增加真实下载测速，仍需要目标服务提供公开、大小稳定的测试资源或专用测速端点。
- 如果实际部署页面显示的行为与上述源代码不同，应先确认部署版本和来源。要增加域名真实下载测速，需要为所有候选域名约定一个可公开读取、大小稳定的测试资源或服务端点，再单独设计流量上限、并发和跨域策略。

## 当前部署顺序

现在只需要部署一个项目：

1. 在 GitHub 上选择自己的 `forkedgetunnel` 仓库，在 Cloudflare Pages 中使用“连接到 Git”创建项目，生产分支选择 `main`，构建设置沿用原项目。
2. 在 Pages 的生产环境变量中设置 `ADMIN`，并绑定 KV 命名空间，绑定名称必须是 `KV`。
3. 保存并部署后访问主域名的 `/admin`。登录页和在线优选页面都来自同一个仓库，速度列旁边应显示“一键测速”。
4. `EDT_PAGES_URL` 不需要填写。只有当使用普通 Worker（没有 Pages `ASSETS` 绑定），或者明确要使用另一个外部面板时，才填写外部面板根地址，且不要包含 `/admin`。

原先“主程序一个 Pages 项目、面板一个 Pages 项目、再配置 `EDT_PAGES_URL`”的流程已被当前合并方案取代；这条旧流程只作为兼容回退，不是新部署的必需步骤。

## 本次验证

- 合并前检查确认：批量测速逻辑已经存在，缺少的是页面入口；没有重复实现现成逻辑。
- 面板 `admin/index.html` 的脚本块可由 Node.js `new Function` 编译；`#speedAllBtn` 和 `#speedStatus` 各存在一个，已有 `startAllSpeedTests` 绑定逻辑保持不变。
- 面板脚本包含唯一的 `speedThreadsInput`，默认值为 10；一键测速与拖选批量都使用该设置，不再使用原来的 4 并发上限。
- 自定义优选排序样例已覆盖 443/2053/其他端口分组、无端口按 443、IPv6、Mbps 降序、同速保持原序、无速度值和订阅 URL 末尾稳定保留。
- 对 `proxyip.cmliussss.net` 的源码核对确认：它属于独立 ProxyIP 检测工具，已有批量检测但没有下载测速端点；本项目未伪造该指标。
- `_worker.js` 已改为本地 `ASSETS` 优先、外部面板回退；静态页面仅复制面板展示所需文件，动态的 `admin/config.json`、`admin/check`、`locations` 等仍由 Worker 原路由处理。
- `admin/index.html` 的 2 个内联脚本块可由 Node.js 编译，`_worker.js` 通过 `node --check`，并通过 `git diff --check`。
- 按要求未进行真实浏览器出口网络和 Cloudflare 部署验证；这类验证由用户在符合中国直连网络条件的环境中自行完成，不能由静态语法检查替代。
