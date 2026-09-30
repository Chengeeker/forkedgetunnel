<!--
forkedgetunnel development record.
This document records modifications and additions made by Chengeeker on
2026-09-30 to the upstream edgetunnel project. See ../LICENSE for the
GNU General Public License, version 2.
-->

# 开发记录

## Fork 品牌与默认配置

- 当前项目仓库地址为 `https://github.com/Chengeeker/forkedgetunnel`；管理面板、登录页、异常提示页的 GitHub 链接，以及管理面板的 Telegram、版本检查和下载链接均指向当前 fork。原作者的优选数据、订阅转换配置和开源致谢链接仍保留为外部依赖或来源说明，不能为了改品牌而替换。
- 新建配置默认订阅名称为 `forkedgetunnel`，默认开启 ECH，默认 `PROXYIP` 为 `proxyip.cmliussss.net`。
- `_worker.js` 对仍保留原项目三项默认值（订阅名 `edgetunnel`、ECH 关闭、PROXYIP 为 `auto`）且未完成 fork 默认迁移的旧 KV 配置执行一次迁移；检测到这些字段已有不同自定义值时不会覆盖。迁移后写入 `_forkedgetunnelDefaultsVersion`，用户后续手动修改会被保留。
- `Pages静态页面` 仍是普通 Worker 无 `ASSETS` 绑定时的外部管理页回退地址；Pages 合并部署优先读取本仓库的本地 `admin/`、`login/` 等资源，不能把 GitHub 仓库 URL 直接当作 HTML 回退地址。

## GPL-2.0 合规整理

- `LICENSE` 保留上游完整的 GNU GPL-2.0 文本，未改写；README 现在明确说明本仓库是上游 `edgetunnel` 的修改版，并将当前 fork 的新增和修改内容继续置于 GPL-2.0 下。
- `_worker.js`、`admin/`、`login/`、`noADMIN/`、`noKV/` 页面和 README/开发记录均带有上游来源、修改者、修改日期及许可证指针，满足对本次 fork 修改内容的显著说明要求。
- README 的“教育/研究/个人安全测试”和部署删除内容已改成风险提示与安全建议，不作为限制 GPL-2.0 权利的附加条件；法律法规遵守和无担保说明继续保留。
- `cdn-cgi/trace` 是登录页使用的静态探测数据，`patches/EDT-Pages-admin-speed.patch` 是可应用的补丁记录，不是程序源文件；没有向这些格式中插入会改变其数据或补丁可应用性的许可证注释。
- 本次是仓库层面的静态合规整理，不构成法律意见；第三方 CDN 组件、外部服务和独立数据源仍需按其各自许可证或服务条款处理。

## 自定义优选一键排序

- “自定义优选”输入框旁新增“一键排序”按钮，只重排当前文本，不改变节点地址、标签或测速结果；排序后仍需点击页面底部“保存”才会写入 `ADD.txt`。
- 排序优先级固定为：端口分组（443 → 2053 → 其他端口），再按预设的国家/地区顺序分组（`HK → CN → MO → TW → JP → KR → SG → US → MY → TH → VN → PH → ID → AU → IN → AE → RU → DE → NL → GB → FR → CA`，未知地区放后面）。这里把美国放在新加坡后面，兼顾地理位置、节点热度和通用性；最后在同一端口和地区内按 `Mbps` 下载速度从高到低排列。
- 同端口、同地区、同网速时保留原始顺序，不使用延时作为排序依据。没有显式端口的主机按 Worker 默认的 443 处理；无法识别为节点地址的非空行会稳定地放到最后，避免把订阅 URL 当作节点解析。
- 国家/地区主要读取节点行中 `#HK`、`#JP` 这类两位代码，同时兼容常见中英文地区名称。排序不引入第三方库，空行会按新的端口和地区分组重新生成。
- 管理页面的用户模式默认改为“高手模式”；仍会保留浏览器 `localStorage` 中已经保存的小白/高手选择，不强制覆盖用户的主动选择。

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

## 可选免费家宽链式

- 功能定位：这不是 Cloudflare 直接提供的住宅出口，而是“客户端 → 当前 fork 的 CF Worker 节点 → VPN Gate 志愿者共享 OpenVPN 节点 → 目标站”的链式连接。VPN Gate 的节点是公开志愿者资源，不能承诺住宅属性、可用率或隐私；因此 UI 和订阅注释都使用“志愿者共享节点”，没有把它宣传成稳定家宽。
- 资料依据：借鉴 [byJoey/cfnew](https://github.com/byJoey/cfnew) 中的链式思路和公开数据字段，但没有直接复制其实现；节点清单使用 [VPN Gate 官方 API](https://www.vpngate.net/api/iphone/)，链式字段依据 [mihomo OpenVPN 配置](https://wiki.metacubex.one/en/config/proxies/openvpn/) 和 [dialer-proxy 配置](https://wiki.metacubex.one/en/config/proxies/dialer-proxy/) 实现。
- 配置入口：后端配置字段仍为 `订阅转换配置.免费家宽`，默认 `false`；管理面板已把它从「订阅转换配置」中移到独立的「🏠 免费家宽链式」模块，模块内提供开关、详细说明和单独的保存/取消按钮。开启并保存后，顶部「获取节点链接」才显示独立的 Clash 家宽订阅链接。正常的 Base64、Clash、Sing-box、Surge 等订阅路径不改变。
- 订阅接口：家宽链接使用当前订阅 token 加 `target=home` 请求，例如 `/sub?token=...&target=home`；也兼容 `target=vg`、`target=jk` 和 `target=家宽`。未开启时返回 403，清单拉取或解析失败时返回 503，不覆盖客户端已有订阅。
- 节点处理：Worker 通过 HTTPS 拉取 VPN Gate API，只接受 TCP OpenVPN 配置，过滤 `public-vpn-*` 主机和 `219.100.37.*` 官方节点网段，按 API 的 Speed 字段降序去重，最多保留 48 个节点。VPN Gate 公开账号固定为 `vpn/vpn`；CA、证书、私钥和可用的 `tls-auth` 会写入 Clash YAML，并用 YAML 锚点复用重复证书内容。
- 前置处理：使用当前请求域名和配置中的 `HOSTS`，最多生成 4 个 CF VLESS WS/TLS 前置节点；ECH、随机路径和跳过证书验证跟随现有配置。家宽 OpenVPN 节点统一设置 `dialer-proxy: ⚡ CF前置`，前置组使用 `url-test`，家宽自动组使用延迟探测的 `fallback`，并保留手动选择组。
- 性能与兼容性：节点清单只在请求家宽订阅时拉取，并在当前 Worker isolate 内缓存 30 分钟；最大响应体 12 MiB、最大输出 48 个节点，避免普通订阅请求增加外部请求和 YAML 体积。订阅头部明确要求 mihomo / Clash Meta 1.19.25+，因为较老内核可能不识别 `openvpn` 或 `dialer-proxy` 类型；该链路只承载 TCP，不向 UDP 能力作出承诺。
- 风险边界：VPN Gate 是公开共享网络，用户应避免通过不信任的落地节点传输敏感数据。当前实现坚持 HTTPS 拉取公开清单，没有为了兼容旧 TLS 而降级到 HTTP；请求 token 仍按现有订阅鉴权逻辑校验。
- 验证：已完成 `_worker.js` 语法检查、管理页面内联脚本编译、离线伪造 VPN Gate CSV/OpenVPN 配置的解析和 YAML 生成检查，以及 `git diff --check`。没有进行 Cloudflare 部署、真实 VPN Gate 拨号或中国直连环境验收；这些需要用户在自己的部署环境中测试。
- 使用说明：管理页面的独立「🏠 免费家宽链式」模块提供可展开的家宽链式说明，明确“开启并保存 → 复制专用 Clash 家宽配置链接 → 用 mihomo / Clash Meta 1.19.25+ 作为配置文件导入 → 选择 `🏠 家宽自动`”的流程，并提示 403、503、旧内核、TCP-only 和志愿者节点风险。

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
- 自定义优选排序样例已覆盖 443/2053/其他端口分组、无端口按 443、IPv6、美国紧跟新加坡、Mbps 降序、同速保持原序、无速度值和订阅 URL 末尾稳定保留。
- 对 `proxyip.cmliussss.net` 的源码核对确认：它属于独立 ProxyIP 检测工具，已有批量检测但没有下载测速端点；本项目未伪造该指标。
- `_worker.js` 已改为本地 `ASSETS` 优先、外部面板回退；静态页面仅复制面板展示所需文件，动态的 `admin/config.json`、`admin/check`、`locations` 等仍由 Worker 原路由处理。
- `admin/index.html` 的 2 个内联脚本块可由 Node.js 编译，`_worker.js` 通过 `node --check`，并通过 `git diff --check`。
- 按要求未进行真实浏览器出口网络和 Cloudflare 部署验证；这类验证由用户在符合中国直连网络条件的环境中自行完成，不能由静态语法检查替代。
