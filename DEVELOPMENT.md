<!--
forkedgetunnel development record.
This document records modifications and additions made by Chengeeker on
2026-09-30 to the upstream edgetunnel project. See LICENSE for the
GNU General Public License, version 2.
-->

# 开发记录

## Windows 再次部署确认支持回车

- 再次部署的最后一步显示已核对的目标项目名。按回车等同于输入该项目名，显式输入原项目名也可确认。其他内容或输入流结束取消，保留此前的项目 ID、KV、密钥检查与重建备份流程。首次创建和恢复时的新项目 ID 核对继续要求显式输入。
- 用 Windows PowerShell 5.1 验证 `Read-Host` 可区分回车空字符串和输入流结束。模拟 API 回归确认回车仅重建一次且复用 KV，取消与输入流结束不发写请求、不改部署状态。按现有打包流程生成本地 `build/pages-deploy/release/Pages-Deploy-Windows.zip`，通过文件清单、源码字节、BOM 和 SHA256 校验。未运行真实 Pages 重建。
- 本次发行使用 `pages-deploy-v1.0.1`，由既有标签工作流跑模拟回归、构建并发布 ZIP 与 SHA256 文件。README 与部署指南同步指向新版，保留 v1.0.0 供回退。

## WebSocket 下行 CPU 排查与本地优化（2026-11-12）

- Pages API 复核生产仍为 `d43a208`，已包含固定凭据和下行合包优化。以北京时间 11-11 11:00 至 12:00（Pages 指标 180 次资源超限的峰值小时）查询同账号自定义域名的边缘 HTTP 统计。该小时可见 1,395 次请求全部为 HTTP/1.1 GET 的 WebSocket 101 握手，路径都携带显式 `proxyip` 参数形式。按 UTC 11-11 全日自定义域名返回 12,535 次 101，另外只有 97 次其他响应，其中 2 次 POST 均为 403。边缘数据与 Pages 执行结果来自不同数据集，无法按请求关联，也不覆盖 `pages.dev`；101 只证明成功握手，无法确定后续哪条连接超限、具体载荷协议、上下行阶段或是否真的使用备用出口。查询字符串维度不可用，仅保留聚合分类，未保存原始路径、域名、查询参数、客户端信息或认证内容。
- 已尝试生产 Pages 的短时 `wrangler pages deployment tail`，JSON 模式 85 秒未收到请求级事件；Pretty 模式确认连通，42 秒内也没有事件，单次根路径探针未收到 HTTP 响应。Cloudflare Pages 实时日志不存储。历史聚合证据优先指向 WebSocket，不能把 180 次合并分类全部定为 CPU，也不能从 101 数量推导失败率。[Pages 日志](https://developers.cloudflare.com/pages/functions/debugging-and-logging/)、[Cloudflare Workers CPU 限制](https://developers.cloudflare.com/workers/platform/limits/#cpu-time)。
- 确认大块下行直发前会调用共享排空函数。之前就算没有待发送的合包数据，也会创建异步发送任务和清理链。本次在等待已有排空、清理定时器及判断连接有效后，队列为空即返回。正在发送的数据、合包顺序、首包响应头、已有错误传递和 BYOB 缓冲所有权检查仍走原路径。固定开销降低不会消除免费套餐单次 CPU 限制；尚无线上样本把这项开销定为告警根因。
- 旧 Worker 源码保留在忽略的 `tmp/cf-cpu-downlink-baseline.js`，对照脚本 `tmp/cf-cpu-downlink-bench-long.cjs`。Node v26.12.1，交替顺序执行 7 轮、每轮 100 万次 64 KiB 合成读取，使用同步模拟发送并断言字节数及正常关闭。进程 CPU 时间中位数 1,266 ms → 1,015 ms，约下降 20%。另按 Async Hooks 统计每 1,000 次读取初始化 Promise 21,036 → 14,022。10 万次的短测 CPU 中位数均为 125 ms，存在系统计时粒度与本机负载影响。以上只衡量大块直发调度路径，不代表真实代理速度、整体 CPU 降幅或错误率。
- 必要检查通过：现有 CPU 与协议兼容回归、7 项 KV 回归、源码和 Pages 包语法检查、`git diff --check`。Wrangler 4.128.0 用生产兼容日期 2026-11-07 本地构建至 `build/cpu-20261112/pages/`，用与生产兼容日期匹配的 workerd 在阻断外网的情况下验证 300,000 字节 TCP 到 WebSocket 内容及首包响应头，以及 gRPC、XHTTP、普通 WS、early-data 和 SS 升级握手。
- 按用户要求提交到 `Chengeeker/forkedgetunnel:main`。基线 `d43a208` 可用于回退源码，Pages 保留旧生产部署。GitHub 推送后以 Pages 的生产提交和成功状态确认自动部署；待收集相近使用强度下的线上样本后再比较 CPU 超限率。真实出口和平台内部错误率变化未验证。

## Cloudflare 超额提示复查（2026-11-12）

- 通过已登录 Wrangler 的 Cloudflare API 只读核对生产部署及账户 GraphQL 指标。Pages 项目 `forkedgetunnel` 的生产提交为 `d43a208`，2026-11-09 10:03（北京时间）部署成功，已包含 `b3a768f` 的 CPU 优化，两提交之间只有开发文档变化。上次记录中生产仍指向旧提交的状态已过时。
- 按 Pages API 返回的生产脚本标识匹配 `pagesFunctionsInvocationsAdaptiveGroups`。北京时间 11-11 00:00 至 11-12 00:00 共 13,248 次调用，其中成功 3,114、客户端断开 3,969、平台内部错误 5,473、资源超限 692。资源超限与内部错误的最高小时均为 11-11 11:00 至 12:00，分别为 180 和 683 次。北京时间 11-11 23:18 至 11-12 23:18 共 2,565 次调用，成功 526、客户端断开 986、平台内部错误 1,053，未见资源超限记录。GraphQL 的 `exceededResources` 是合并分类，不应把 692 次全部记为 CPU 超限，也不能将 `internalError` 或客户端断开累加到 CPU 告警计数。
- 按账户配额的 UTC 日期汇总，11-10 与 11-11 的 Pages Functions 加 Workers 观测调用量分别约 3,984 和 13,334，11-12 查询时约 3,709，远低于免费账户日上限 100,000。KV 同期每日读取最多 522 次、写入最多 4 次，未见 429。以上是分析指标，不是计费台账。Workers 请求与 KV 日限额在北京时间 08:00 重置，免费 HTTP 调用的 10 ms CPU 限制按单次调用执行。前次通知按过去 24 小时累计失败次数统计，与日请求额度分开。
- 用户随后提供邮件 PDF，发信时间为北京时间 2026-11-12 22:19，主题为「[需要操作]限制已超出」，正文明确指账户在过去 24 小时至少 100 次达到免费套餐 CPU 时间限制，并说明持续超限期间每日发一次摘要。邮件未列项目或内部聚合截止时间。只记录与诊断有关的内容，不保存邮件地址、账号标识、邮件链接或原件。
- 以发信时间为截止重查北京时间 11-11 22:19 至 11-12 22:19 的账户 Pages 与 Workers 调用指标。`forkedgetunnel` 共 2,130 次调用，其中成功 534、客户端断开 757、`internalError` 839，未返回 `exceededResources` 记录。其他可见项目也未返回资源超限记录。再往前一个 24 小时窗口（11-10 22:19 至 11-11 22:19），Pages 资源超限类别共 692 次，均来自 `forkedgetunnel`，对应时段的独立 Workers 未见资源超限。前一窗口峰值是线索，但 `exceededResources` 包含多种运行限制，且邮件与按发信时间回看图表的数字不匹配，不能确认具体告警统计窗口、将 692 次都归为 CPU，或把内部错误算进邮件计数。
- Wrangler 的凭据可查分析数据，通知历史接口返回 403。若再次出现资源超限，采集同一时段的失败请求、协议类型与 CPU 指标再定位热点。尚未用真实客户端复现或确认平台内部失败的原因，本轮仅查询和记录。
- 依据：[Pages 调用指标](https://developers.cloudflare.com/pages/functions/metrics/)、[Pages 请求计费](https://developers.cloudflare.com/pages/functions/pricing/)、[Workers 限制](https://developers.cloudflare.com/workers/platform/limits/)、[KV 指标](https://developers.cloudflare.com/kv/observability/metrics-analytics/)及[日配额](https://developers.cloudflare.com/kv/platform/pricing/)。

## 固定凭据与下行合包 CPU 开销优化（2026-11-09）

- 用户在上一轮排查后明确要求优化并重新推送 GitHub。本轮基线为 main 的 0a123fd8ae0706c3a10596d87532a30346eceedd，工作区仅已有上一轮诊断文档修改，已一并保留；原 Worker 与诊断文档保存到 build/rollback/20261109-cpu/。修改范围只有 _worker.js、tests/worker-cpu.test.cjs 和本开发记录；不改面板、部署脚本、配置、原 KV、公开响应、套餐或博客效果。本项目没有 APK 构建目标。
- 请求入口以前即使有合法显式 UUID，也先做两次 MD5；仅 ADMIN/KEY 派生身份时，每次请求都重复计算同一结果。现在合法 UUID 直接沿用，否则只缓存一份固定派生输入及已完成的身份结果，输入变化即重新计算，失败不覆盖已有结果，不缓存进行中的 Promise、请求对象、UA 会话摘要、KV 配置或多用户列表。派生算法、默认密钥、UUID 格式、密码别名优先级和鉴权结果不变；并发请求使用各自局部结果，不从可能已被另一个请求更新的缓存读取返回值。
- WebSocket 下行的共享 Grain 合包器原先先复制到一个容量大小的可复用缓冲，再 slice 整份结果交给异步发送。现在独立结果分支直接按真实合包长度分配最终缓冲并只写一次，取消第二次整包复制以及每连接保留的中间合包缓冲；上行的复用缓冲分支、单块直发、队列条目与完成回调保持原语义。BYOB 小块进入延迟合包前的 slice 仍保留，不能为省复制删掉这个所有权保护；也保留异步发送等待、关闭前排空、背压、认证和拨号行为，没有调整合包等待时间来换取基准成绩。
- 新增 worker-cpu.test.cjs：先在原代码复现暖请求重复两次摘要的失败，再验证缓存复用、显式/无效 UUID、密码/密钥变化、摘要失败后重试、已有缓存不被失败覆盖、两组同时未命中的并发身份隔离；合包计数断言每 16 字节结果只 set 16 字节且不再 slice，验证后续合包不覆盖前一份、不同块长顺序/边界和两种所有权模式，以及异步发送、一次性响应头和 BYOB 缓冲复用的内容完整性。测试凭据都是显式测试值，不使用用户账号数据。
- 本机 V8 VM 微基准由 build/cpu-20261109/cpu-bench.cjs 保留，Node v26.12.1，每个场景预热后重复 5 轮、每轮 10,000 次，取当前进程 user+system CPU 时间中位数。8×4KiB 合成 32KiB：187ms→110ms，约下降 41%；2×16KiB：141ms→109ms，约下降 23%；暖凭据入口（含模拟响应）：282ms→156ms，约下降 45%。这是当前主机的微基准和机制验证，存在系统计时粒度及运行波动，不能换算成 Cloudflare 生产 CPU、全协议吞吐提升或超限错误降幅。未修改的 32KiB 直发路径不计入优化收益。
- 必要检查通过：新 CPU 回归、原 worker-compatibility 离线协议/登录/探测/加密检查、pages-kv 的 7 项回归；源码及两份构建产物的 node --check、git diff --check。Wrangler 4.128.0 的 Worker deploy --dry-run 与 Pages Advanced Mode 构建均成功，产物位于 build/cpu-20261109/worker/ 与 pages/，Worker 上传估算 475.68KiB、gzip 88.50KiB。UTF-8 BOM 与供面板读取的 Version 保持原样，Version 仍代表已合入的上游版本，不冒充新的上游修复。
- 用已安装 Wrangler 的 Miniflare/workerd 检查源码和最终 Pages 包：合法/无效 gRPC、XHTTP、普通 WS 子协议、early-data 和 SS 升级握手通过；去掉显式 UUID 后，独立计算旧派生身份，多次实际请求仍通过。另用本机 127.0.0.1 TCP 服务经真实 workerd 转发到 WebSocket，核对 300,000 字节连续内容和首包响应头，源码与 Pages 产物均一致，无外部 fetch。SS 这里只验证升级握手，未冒称完整加密下载验收。临时运行脚本位于忽略的 tmp/check-worker-cpu-runtime.cjs 与 tmp/check-worker-cpu-bundle.cjs。
- 测试夹具曾在去掉 UUID 后遗漏 KV，导致公开请求进入无存储提示页并被外网禁止规则拦截；补上临时原生 KV 后重跑通过，这是夹具问题，未据此修改生产回退逻辑。首次编辑时发现源码原有 BOM，已恢复，避免夹带无关文件格式变化。后续回归不得为通过测试放开公网出口或把无存储页面当作 CPU 故障。
- 推送目标为远端 forkedgetunnel 对应的 Chengeeker/forkedgetunnel:main；origin 仍指向另一个仓库，不能混用。推送前 fetch 确认 main 未分叉，保留旧生产部署和 0a123fd 作为源码回退。GitHub 关联的 Pages 会按原配置自动构建；部署状态需核对具体提交，不能把源码推送成功当作线上更新完成，更不能把打包和本机测试当作 CPU 超限已消除。
- 仍需线上观察：实际代理出口、真实客户端的持续下载/流式会话、相近使用强度下的 CPU 超限率及平台内部错误率。本次只减少已测得的重复计算与合包复制，不能突破免费套餐 CPU 限制，也不承诺修复 internalError；内部错误沿用下面诊断章节的独立处理边界。不删除旧部署、不清空 KV、不升级付费套餐。

- 推送后复核：运行代码提交 b3a768f65f68b8ffbbe9ed08ba68dbda74c54e83 已成功推送到 Chengeeker/forkedgetunnel:main。检查时 Cloudflare 生产仍指向 cb9667d，部署列表没有出现本次新构建；控制台显示 main 自动部署已启用、包含路径为 *，GitHub status API 也未见该提交的状态条目。源码已发布与线上已生效是两件事，不能报告优化已在生产起效；未变更 Git 集成、手动重试旧部署或删除重建项目。自动构建未出现的具体原因尚未定位，生产部署需要后续单独更新核对。
- 后台生产兼容日期实际为 2026-11-07，而仓库 Wrangler 配置为 2025-11-04。附带的旧 workerd 1.20260831.1 拒绝前一日期，提示最高支持到 2026-09-07，不能把这个工具链错误当作应用不兼容，也不能据此降低生产日期。已从官方 npm 在忽略的 build/cpu-20261109/toolchain/ 隔离安装 @cloudflare/workerd-windows-64@1.20261108.1，不改全局工具、项目依赖或线上配置；通过 MINIFLARE_WORKERD_PATH 指向该二进制。最终 Pages 包在兼容日期 2026-11-07 下再次通过跨请求派生身份、300,000 字节本机 TCP/WS 传输以及原 gRPC/XHTTP/WS/early-data/SS 握手回归。可从项目根目录运行 tmp/check-worker-cpu-current-runtime.cjs 复现；完整真实代理出口及线上错误率改善仍未验收。
## Cloudflare CPU 告警与代理链路排查（2026-11-08）
- 更新/优化可行性复核（2026-11-09）：用户追问能否通过更新和优化项目解决。经 GitHub API 核对，上游 cmliu/edgetunnel 的 main 最新仍为 a8ab11125ece9bc27983f609a6359be81b21050c（2026-10-08）；本地 merge-base --is-ancestor 确认当前 fork 已包含它，不能声称存在尚未同步的主线 CPU 修复。当前代码已有 XHTTP 下行 pipeTo/IdentityTransformStream、上行合包、WS 下行合包及 BYOB；BYOB 小块 slice 保证读取缓冲复用时发送数据仍有效，未经所有权测试不得为减复制直接删掉。每次入口仍会派生固定凭据摘要，WS 分块/调度/并发拨号也是可进一步测量的方向，但本轮没有性能剖析或失败请求级证据，不能把静态候选当作已证实热点。
- 可行性边界：针对确认的热点减少计算、复制及调度有机会降低 CPU 超限；免费套餐的执行预算仍然存在，不能承诺任何流量下零超限。平台 internalError 与代码异常/CPU 超限必须分开验收，不承诺更新项目能消除平台内部失败。先取得失败请求的传输类型、CPU 和完整链路证据，再做最小修改；离线兼容检查与打包通过不能代替线上相近使用强度下的错误率对照。本次复核仅补充诊断，不改运行代码、配置或部署。

- 用户收到 2026-11-08 22:07（北京时间）的账户级邮件：过去 24 小时至少 1,000 次免费套餐 CPU 超限，并反馈多个项目变慢。已通过本人当前登录的 Cloudflare 控制台读取生产指标、KV 用量和短时实时日志；不记录账号 ID、邮件地址、令牌、密码、UUID 或完整订阅。KV 命名空间只有两个不代表只有两个计算项目，实际列表为六个 Pages 项目、两个 Workers 服务。
- 为避免滚动窗口变化误判，以发信时间为截止回看 2026-11-07 22:07 至 2026-11-08 22:07（GMT+8）：forkedgetunnel 成功 5,546、执行错误 6,532，其中 CPU 超限 1,362、内部错误 5,170，脚本异常/内存超限/客户端断开分类均为 0；共 12,078 次执行，错误约 54.1%。1,362 次足以达到邮件所述门槛，但邮件未提供精确聚合截止时刻，不能把发信时间当作其内部作业的已证实截止时间。早先滚动过去 24 小时读到 CPU 738 次，随查询时间推移降至 723/721 次，是旧高峰移出窗口，不是清空额度或已修复。
- 约 23:49 查询过去 1 小时：成功 67、错误 38，错误全部归为内部，CPU/内存超限与脚本异常均为 0，执行错误率约 36.2%。CPU 高峰主要在 11 月 7 日深夜和 11 月 8 日凌晨，11 月 8 日 00:00 小时桶为 702 次；不能仅凭旧告警断言此刻仍在 CPU 超限，也不能把所有内部错误加到 CPU 超限计数。
- 其他动态项目按各自查询当时的过去 24 小时读取：cloudflare-imgbed 成功 170、执行错误 0；nodewarden 调用 413、执行错误与 CPU 超限 0；hinge-relay 调用 22、执行错误 0。三个时间窗口与上述固定发信回看窗口略有不同，不能作为严格同窗口全账户对账，但未见这些项目出现同类运行故障。未逐个验证所有静态 Pages 项目或登录后的业务接口。
- KV 控制台显示周期 November 5–December 5 的全账户约 1.63k 读取、48 写入、24 删除、4 列出，当前存储 749 kB；未见容量或日总操作数耗尽的证据。最初账户计算用量为当日 UTC 2,774/100,000 次请求，远未达到日请求总额；与按北京时间选取的滚动/固定 24 小时指标不是相同口径。
- 用户确认访问其他项目时也在使用 forkedgetunnel 节点，因此该代理链路异常可以同时拖慢多个访问目标，这是请求延迟优先验证的共同依赖。用户随后关闭代理，反馈博客滚动仍卡；这是渲染流畅度测试，不能当作图床/密码库请求延迟已经完成独立节点对照。必要低频 HTTP 检查：图床自定义域与 pages.dev、游戏站、密码库首页均返回 200，隧道公开根路径返回预期 404；这些请求仍可能经过现有代理/TUN，不能冒称直连或独立网络测试，也不代表代理拨号、上传、密码库登录等功能验收。
- Pages 实时日志连接成功，观察到公开根路径 GET 为 Ok，以及一条 WebSocket 形态路径 /proxyip=proxyip.cmliussss.net 的 GET 为 Canceled；未采集到带异常栈的 CPU 超限事件，Cancelled 不能擅自归为 CPU 超限或平台内部错误。采样结束已暂停；未开启持久日志、调试变量或新增采样代码。公开备用出口仅是观察到的配置线索，未验证其实际参与比例、速度或可用性。
- 官方定义：免费套餐 HTTP 执行 CPU 预算为 10 ms，网络/KV 等待不计入 CPU；超过 CPU 预算与耗尽全账户日请求数是两回事。内部错误 internalError 表示 Workers 运行平台内部失败，官方明确区别于脚本问题和资源限额。查询时官方状态 API 的 Workers、Pages、Workers KV 显示 operational，但这不能排除个别请求或机房异常。不能承诺升级付费套餐会解决内部错误，也不能凭名称把已知上游 1101 版本提交当作修复，继续遵循前面的 1101 差异核对记录。
- 本地工作区最初干净，HEAD 为 0a123fd8ae0706c3a10596d87532a30346eceedd；线上生产部署为 cb9667de14d0c8b0d36414a87728c014c45fed59，两者 _worker.js 无差异。本轮只记录诊断，不修改运行代码、KV 内容、线上配置、部署或付费套餐，无 APK 目标。不用无依据的缓存/协议重写掩盖平台内部错误。后续先用不经该 Pages 项目的独立节点访问同一目标作对照；持续内部错误应按时间窗、部署和可取得的请求 Ray ID 向平台定位；CPU 优化需要再采集真实失败请求和性能剖析，确认热点后做最小兼容修复。
- 一手依据：[Workers 限制](https://developers.cloudflare.com/workers/platform/limits/)、[调用状态及内部错误定义](https://developers.cloudflare.com/workers/observability/metrics-and-analytics/#invocation-statuses)、[KV 限制](https://developers.cloudflare.com/kv/platform/limits/)、[平台状态 API](https://www.cloudflarestatus.com/api/v2/summary.json)。本地/线上统计只证明各自时间窗口内的观察，不是修复或恢复成功的证明。

- 后续区分滚动卡顿（跨至 2026-11-09 凌晨）：用户关闭代理后反馈自己的博客滑动依然卡。读取实际博客 DOM 和公开源码，桌面根元素为 glass-full/lg-full；10 个文章卡片和 7 个侧栏卡片使用 blur(34px) saturate(1.65)，导航 blur(35px)，body 固定多层渐变背景及 ::before 的 blur(52px)。这些前端效果由访问端浏览器处理；不能把页面已加载后的滚动掉帧归为 Worker CPU 预算或 KV 额度问题。
- 在新建的临时博客标签页用现有 ButterflyGlass.setMode 做 full/fallback/full 对照，只改变当前标签页运行状态，未写入存储、源码或部署。早期标签页未前置时 requestAnimationFrame 被后台节流，样本无效并已排除；Profiler 域不可用、Tracing 未返回有效数据，不伪造性能剖析结论。前置标签页后每轮约 1.5 秒，使用 PageUp/PageDown 滚动并采集 rAF 间隔：full 向上两轮 P95 均为 72.3ms，fallback 向下为 41.0ms；补齐方向对照后 full 向下 P95 为 133.3ms、fallback 向上为 44.4ms。完整模式的间隔中位数为 33.3/35.8/61.2ms，fallback 两轮为 22.3/22.2ms。支持当前设备/页面的玻璃效果是明显渲染负担，但短时自动化采样不是标准刷新率、长期跑分或逐帧 GPU 分析；未逐项隔离全屏背景、卡片、导航及浏览器扩展的贡献。
- 对照结束通过 finally 恢复 setMode('auto')，读回为 full 且卡片仍为原来的 blur(34px)，未留下显示模式更改；临时诊断标签页不保留。博客效果应在博客自身工程优化，不能为了滚动流畅度修改隧道协议、增加 KV、升级 Workers 套餐或重建 Pages。网络请求异常与前端掉帧可同时存在，当前两组证据分别记录；本轮仍仅诊断，不发布任何修复。源码依据：[玻璃卡片](https://github.com/Chengeeker/Chengeeker.github.io/blob/main/butterfly-glass/css/glass-core.css)、[全屏环境层](https://github.com/Chengeeker/Chengeeker.github.io/blob/main/butterfly-glass/css/glass-environment.css)、[模式运行时](https://github.com/Chengeeker/Chengeeker.github.io/blob/main/butterfly-glass/js/glass-runtime.js)。

## Windows 部署包加入 GitHub 发行版（2026-11-07）

- 用户指出发行版只有 CFData 本地优选包，普通用户找不到部署 CMD。新增独立 Pages-Deploy-Windows.zip：根目录提供 redeploy-pages.cmd、refresh-pages-token.cmd、使用说明.txt、LICENSE，scripts/redeploy-pages.ps1 保持原相对路径。CMD 依赖脚本，不能只上传一个无法独立运行的入口；不引入在线下载执行器或修改部署逻辑。
- scripts/build-pages-deploy.ps1 使用固定文件白名单直接生成 ZIP 和 SHA256SUMS.txt，不递归打包工作区，不收录 Token、DPAPI 恢复记录、测试文件或缓存。使用系统 PowerShell/.NET，无额外依赖；保留部署脚本的 UTF-8 BOM。部署工具与 CFData 是独立用途、独立包和许可证。
- 新增 pages-deploy-v* 标签触发的 Windows release 工作流：先执行模拟 API 的部署恢复回归、再检查 ZIP 文件清单/源码字节/入口路径/BOM/校验和，通过后发布部署包及 SHA256SUMS。首次发布标签 pages-deploy-v1.0.0，README、部署指南及发行说明直接列出部署包下载和根目录 CMD；保留 CFData 入口，明确需要本地优选时下载哪个包。后续部署脚本变更须发布新的 pages-deploy-v* 标签并同步版本下载链接，不能误把更新 main 当作旧 ZIP 自动更新。
- 本地 Windows PowerShell 5.1 打包检查和部署脚本模拟回归通过；发布后需核对 Actions 结果、公开资产、校验和及压缩包中脚本与标签源码一致。无 Worker/管理面板改动，无 APK 目标，不执行用户 Cloudflare 账号的创建、删除或真实部署。

## 自定义地址入口与优选输入、导入对应关系（2026-11-07）

- 用户反馈外部优选域名粘贴后初筛会变掉、导入顺序不对应，并要求地址库可选自定义。用用户给出的三行域名格式复现 `prepareCandidates` 将明确输入随机洗牌，`startLatencyRun` 再把规范化候选写回编辑器，导致原顺序、备注丢失；`selectedResults` 取内部延迟数组顺序，未跟随表头排序。旧测试只验证单条域名往返，没覆盖完整初筛入口和排序后批量导入。
- 地址来源增加默认的“自定义 IP / 域名”，保留已缓存的库选择。自定义隐藏库导入按钮、提供粘贴说明；直接编辑/清空切到自定义，切换来源不覆盖文本。异步库导入用请求身份检查，编辑或切换来源后丢弃旧响应与旧错误，避免迟到请求覆盖用户内容；仍复用原库和网络检测逻辑，无新依赖。
- 候选统一携带 address/remark，显式域名和 IP 保留输入顺序后去重、限量；只有 CIDR/区间保持随机抽样。初筛不回写编辑器。原备注跟随结果、经过 HTML 转义展示并随测量信息导入；测速仍用初筛实际解析出的 IP，显示/导入仍用原域名，多个域名共用解析 IP 也不合并。共享候选函数的生产调用、测试及网段备注同步调整。
- 导入按 getSortedResults 的当前排序选取稳定结果 ID，仍追加所有已勾选结果并标记待保存，不直接写 KV。输入不因 DNS 解析或排序改变，表格排序与编辑器原始顺序是两个独立用途。
- 必要验证覆盖用户示例格式的顺序/限量、原备注、完整 startLatencyRun、同 IP 多域名、速度排序后勾选导出和父面板原样追加、自定义选择缓存、内置库导入、迟到库响应失效；检查既有网络警告、本地 Clash、专用监听及启动器回归、内联脚本编译与 Pages 运行资源准备。Chrome 本地隔离页面用模拟 DNS/测速验证自定义切换、输入不变、表格升降序与剪贴板导出一致；测量数字为测试数据，不是这些域名的真实网速。截图仅保存在忽略的 tmp 中。
- 不改 Worker 协议、KV、真实账号配置或线上部署；本项目无 APK 目标。域名仍测解析 IP 经外部优选服务的路径，不承诺外部站点的每个域名在用户网络均可测，也不把本地模拟测试当作真实代理连接验收。

## 删除 Pages 前解除自定义域名关联（2026-11-07）

- 用户实际运行到 DELETE 项目时收到 HTTP 400 / 8000028，指向仍有自定义域名关联。发现初版只备份域名、重建后恢复，漏掉删除项目之前解除关联的必要步骤；先前模拟接口未体现此平台约束，不能用通过的本地测试推断线上删除可行。
- prepared 阶段读取官方 Pages domains 接口，将当前域名与原恢复记录合并，校验并成功保存加密备份后才解除关联；每次解除以及最终删除前复核旧项目 ID。重建后沿用原域名恢复流程。部分解除失败或响应丢失仍保留 prepared，续跑重新读取剩余关联，不能用剩余列表覆盖备份而丢失已解除的域名。无需新状态字段，兼容前版的中断记录。
- DELETE 范围从初版仅目标项目，扩展为精确目标项目及 prepared 恢复记录中的合法自定义域名关联；仍拒绝其他项目、KV、DNS、部署历史路径、pages.dev 和路径/查询注入。域名错误单独标注解除关联，8000028 解释前置条件；列表为空仍拒绝时保留恢复记录，不循环强制删除或泛化为权限错误。
- API 模拟现已在自定义域名尚存时拒绝删除项目，并覆盖先备份再解除再删除再恢复、解除失败不删项目、响应丢失和多域名恢复、操作中项目替换、畸形域名无副作用、删除范围限制；沿用 Windows PowerShell 5.1、真实 DPAPI、初次/再次、KV 保留及恢复回归。官方域名解除接口需要 Pages Write，未引入 DNS 权限或调用 DNS 修改接口；同步 README 与部署指南。
- 验证仅使用本机模拟 API，未操作线上项目或读取用户 Token；不改 Worker、不构建 APK。解除关联开始后自定义域名可能中断，恢复后证书可能等待，不保证零停机或平台残留关联可由脚本清理。

## 部署输入间距、令牌入口与错误定位（2026-11-07）

- 用户截图显示输入挤在一起，且把 `HTTP 403 / 10000` 理解成 KV ID 无效。截图在输入 Token 后读取 Pages 项目时停止，尚未走到 KV 校验；用户补充是在个人资料 `/profile/api-tokens` 修改权限，因此不能断言入口选错，更不能仅凭状态码判定具体权限/账号问题。
- 统一输入函数为每项提示/输入增加空行，密码仍使用 SecureString；缩短 Token 输入行，将权限说明移到独立行。读取项目时显示当前步骤，接口错误按 Pages 配置/部署/KV 区分并保留 HTTP 状态与数字错误码，提示核对同一 Token、账号范围、Pages Write 而非 Page Rules、有效期和 IP 限制，不打印响应正文或凭据，不将权限失败转换为资源不存在。
- Windows PowerShell 5.1 复现了另一个实际 bug：空的 `kv_namespaces` 属性经管道进入 ForEach-Object 会产生一个 null ID，导致无原生绑定时误报“KV ID 无效”。改为逐个实际绑定收集 ID，缺失/null 绑定集合正常走运行时配置；真实存在但缺 namespace_id 的畸形绑定仍停止，不能通过过滤无效 ID 掩盖丢失配置。
- 官方 2026-11-07 核对：个人令牌与账号令牌属于不同列表，账号令牌兼容矩阵已支持 Pages 和 Workers KV。README 增加入口对照，保留个人入口的实际界面教程，并在部署指南区分 Pages 与 KV 权限、运行时和本机 IP 来源以及 403 与 ID 格式错误。未把用户账号 ID、截图或令牌写入仓库。
- 必要回归覆盖缺失/null 原生 KV、空预览绑定、畸形绑定拒绝、Pages 403 不继续到 KV 或删除、错误上下文与敏感信息排除，既有初次/再次部署、原 KV 复用及中断恢复继续检查。使用模拟 API 和本机 DPAPI，不访问用户账号、不创建/删除线上项目，不构建 APK；尚未确认用户真实 Token 被拒绝的具体原因。

## 部署脚本增加初次/再次选择与项目名提示（2026-11-07）

- 用户要求输入 1 初次、输入 2 再次，并在项目名处给正确/错误示例。入口加入选择菜单及重输校验：名称仅接受小写字母、数字、短横线，展示 `my-tunnel` 与完整 URL、pages.dev 域名、中文等常见误填；再次可回车沿用已保存名称。选初次遇到已有项目、选再次找不到项目时停止，不隐式转换为删除操作。
- 初次流程补齐 GitHub 用户/仓库、分支（默认 main）、两次 ADMIN 密码和可选原 KV ID；使用当前构建脚本，API 创建时携带原生 KV 绑定。无 ID 时按项目专用固定标题查找或创建 KV；已有 ID 始终复用。初次创建需 Pages 编辑 + KV 编辑，部署 Token 只保存在本机，不写进 Worker；GitHub 仓库访问仍须由用户在 Cloudflare 授权，脚本不代替授权。默认关闭预览部署，不把生产 KV 随意共享给预览。
- 增加 initializing/creating 阶段，准备存储前先保存加密计划，KV 创建响应丢失后按固定标题找回；复用原来的项目创建、绑定校验、构建等待与恢复逻辑。未完成记录优先恢复，不出现可覆盖记录的 1/2 菜单。再次部署保留原有删除确认与 KV 保护，不调用 KV 创建或删除。旧版本的 complete/failed/prepared/deleted/created 记录继续支持。
- Windows PowerShell 5.1 回归增加菜单无效输入、URL/域名/大写/下划线/中文拒绝、默认项目名、初次计划字段、首次创建与原 ID 复用、KV 响应丢失恢复、选择与远端状态不一致时不删除；原有重建和 DPAPI 回归继续通过。同步 README 和详细教程，保留此前“模拟 API 不等于线上账号验收”的边界。本轮不修改 Worker、不构建 APK、不执行真实 Cloudflare 创建或删除。

## Windows Pages 删除重建部署（2026-11-07）

- 用户明确要求按其项目实际操作方式自动“删除原 Pages 项目后重建”，不采用重新触发原项目的部署挂钩。新增 `redeploy-pages.cmd` 与 Windows PowerShell 5.1 脚本，使用 Cloudflare API 保留 GitHub 来源、构建设置、生产/预览变量、原 KV 绑定和自定义域名关联，然后构建原生产分支；不需要本机 Node、Git 或 Wrangler。首次创建项目仍沿用现有 README，不手动删除旧项目后再运行脚本。
- 删除前读取配置、补齐 API 不可读的原密钥、核验所有原 KV ID；运行时按名称使用 KV 时分页查找并固定原 ID，不创建新 KV、不写 KV 数据。部署 Token 仅需 Pages 编辑和 KV 读取，与运行时 KV Token 分开，本机 DPAPI 加密整个状态，读回成功并留存备份后才允许删除。
- 必须展示目标项目、GitHub 来源、分支及 KV，输入项目名确认才执行真实删除。删除会失去旧部署、挂钩和预览地址，服务会中断；Access 等项目外集成不在恢复范围，自定义域名需重新关联和等待证书。遇到非空未知绑定或 Wrangler 配置托管字段停止，不宣称通用项目完整克隆。
- 状态区分 prepared/deleted/created/complete/failed：中断后恢复未完成步骤；删除请求响应丢失时读取原 ID，禁止误删新项目；创建响应丢失时需核对新 ID；构建成功以 deploy/success 为准，失败或超时不报成功。构建失败后修复 GitHub/配置，再执行新一轮重建确认。部署 Token 可通过 `refresh-pages-token.cmd` 更新；控制台改过密钥必须先用 `-RefreshSecrets` 刷新，否则 API 无法检测本机缓存已过时。
- 请求只发往固定 Cloudflare API，禁跟随重定向、45 秒超时，错误不输出 API 响应正文；初版 DELETE 仅允许精确的目标 Pages 项目路径，域名解除修复后也允许恢复记录中的本项目域名关联，仍不支持删除命名空间。新旧项目 ID 不符即停止。脚本为 UTF-8 BOM，保持 Windows PowerShell 5.1 中文兼容；互斥锁避免同时运行两次。
- 必要验证：`tests/pages-redeploy.test.ps1` 在 Windows PowerShell 5.1 运行，使用模拟 API 验证本机真实 DPAPI 保存/读取、隐藏密钥重填及缓存、原生及运行时 KV、域名恢复、创建失败续跑、删除响应丢失、项目 ID 冲突、失败部署不报成功。API 路径和请求格式对照 Cloudflare 官方项目/部署/域名接口。尚未使用真实账号删除重建，不能把模拟测试当作线上验收。
- 本轮只新增本机部署工具、测试及使用说明，不改 Worker 传输、存储实现或 Pages 构建入口，不生成 APK。源码恢复可回到本次前提交 `23508d8`；项目配置的本地备份不等于已删除部署产物的恢复，不能承诺零停机回滚。

## README 按当前 fork 整理（2026-11-07）

- 用户要求核对大量继承自上游、可能与当前 fork 不符的说明。本轮只修改文档：主 README、来源清单和本开发记录；不改代码、配置、存储或安装包。
- 删除上游演示站、视频部署入口、上游自动生成问答站、无逐项验收依据的跨平台客户端推荐表、赞助推广和旧后台截图。明确本教程只覆盖 Pages 关联 GitHub，保留三个既有稳定锚点及实际 Chrome 核对过的新版 Token 操作，不恢复已撤下的 Workers 粘贴/Pages 上传教程。
- 自定义域名示例改为占位地址并指向平台实际分配的 Pages 主机名，不再沿用“根域名不可用”的上游说法。保留首次部署前填齐四项、运行时初始化 KV、旧部署补变量仍须发布、原生绑定优先及原命名空间复用的说明。构建仍只复制运行资源，不能回退为构建期自动绑定的旧方案。
- 补齐优选结果导入后的关键顺序：追加到自定义地址不等于保存，须选择“自定义订阅（支持汇聚订阅）”、保存并在客户端更新。区分在线解析 IP 测量、本机 mihomo 真实延迟和 CFData 本地扫描；CFData 结果目前手动复制，Android 仅导入订阅，不承诺自动回传或零安装。
- 对照当前默认配置、入口和链式参数解析修正环境变量表：移除弱密码/上游密钥示例；说明 UUID 是确定性派生，固定 UUID 不固定域名变化后的 Token；OFF_LOG 只关闭本项目 KV 日志；BEST_SUB 有特定请求条件；并发增加不保证加速。链式示例使用远端占位域名，修正 HTTP 全局模式误写为 SOCKS5，避免将 Worker 的回环地址误认为 Windows 本机。
- 保留开源来源与 GPL 声明，上游历史引用完整移至 ACKNOWLEDGEMENTS.md，新增本 fork 使用的组件/数据来源；明确 CHANGELOG 是上游记录，本文件才记录 fork 改动。1101 排错沿用已核对结论，不把同名上游版本标题当作实际异常修复证据。
- 核验范围为源码/面板字段、部署脚本、现有开发记录及 Cloudflare 官方文档，检查本地链接、显式锚点、折叠/代码块配对和 git diff --check。文档变更不重建 Worker/Windows 包、不生成 APK、不重新部署或进行真实网络/客户端验收；无运行时性能影响。后续更改 UI 文案、默认值、部署方式或来源时必须同步这些说明。

## Windows 本地 CFData-WEB 启动接入（2026-11-07）

- 用户要求点击“本地优选IP”直接启动 CFData-WEB 并打开浏览器，随后明确取消 Android 本机启动，只在 Windows 配置，Android 导入订阅。已撤回未提交的 Android 组件，不构建或发布 APK。此前在线优选故障修复、域名解析测速及导入已单独推送为 `edd2081`。
- 上游为 `PoemMisty/CFData-WEB`，使用未修改的正式版 `v1.8.5`。默认 `-host` 留空会监听全部地址，因此启动器固定传入 `-host 127.0.0.1 -port 13336`。网页不能直接启动未安装的程序；首次安装组件和浏览器首次唤起确认仍需用户完成，不能宣传零安装。
- 旧本地工具目录替换为 CFData 专用入口及安装指引，删除相应目录拉取、排序和筛选 JS。Windows 选择按钮直接发起固定 `forkedgetunnel-cfdata://open`，已有在线警告中的本地入口复用同一流程；非 Windows 只展示订阅使用说明，不尝试本机唤起。启动请求不代表启动成功，页面不伪造服务就绪状态，也不主动跨域访问本机管理接口。
- 用户级 Windows 启动器安装到 `%LOCALAPPDATA%\forkedgetunnel\CFData`，注册独占名称的 HKCU 协议，URI 内容不传给 PowerShell 或后端。每次运行校验后端 SHA-256；互斥锁阻止重复启动，已有同路径进程复用，端口冲突不杀其他程序；启动就绪最多等待约 90 秒，再打开固定本机地址。停止只匹配自身安装路径。重复安装同版本不覆盖正在运行的 EXE，卸载关联保留结果文件，不设置开机自启。
- 官方 Windows AMD64 和 ARM64 的固定 SHA-256 保存在 `local-cfdata/upstream.json`，打包和启动均校验；源码分支只提交脚本、清单和许可证。ZIP 附带两种架构原始程序、UTF-8 BOM 的脚本（兼容 Windows PowerShell 5.1）及说明；发布附带对应上游源码 ZIP、许可证和 SHA256SUMS。原生组件独立采用 GPL-3.0-or-later，根 README 明确此例外；Worker/网页继续 GPL-2.0，未混入上游 GPL-3.0 程序源码。
- `tests/cfdata-launcher.test.cjs` 检查 Windows 唤起、Android 引导、弹窗生命周期、固定端点与 URI 隔离；原在线检测、域名输入、非 CN 警告、本地 Clash 和专用监听测试继续通过，内联脚本编译及 Pages functions build 成功。源码按当前 Windows 包独立发布；`local-cfdata-v*` 标签触发 Windows Actions 构建和 GitHub Release，下载入口指向固定 1.0.0 版本。
- Windows 实机完成安装、冷启动、重复启动与同版本重复安装复用进程、停止后重启；核对实际进程参数为固定回环地址及端口，直接 TCP 和 HTTP 成功。Chrome 真实页面显示 v1.8.5 且“已连接服务器”，核对截图位于忽略的 `build/local-cfdata/browser-check.png`。测试后本机服务已重新启动，未进行大规模扫描或修改用户 CFData 配置。浏览器的首次外部应用确认不自动绕过；网页按钮请求由回归验证，不将程序单独启动验收混称为所有浏览器唤起策略都已验收。
- 正式标签 `local-cfdata-v1.0.0` 指向 `f13c3ab`，Actions [42353157988](https://github.com/Chengeeker/forkedgetunnel/actions/runs/42353157988) 构建及发布成功。实际重新下载公开 ZIP，SHA-256 为 `0cd897a8b9652335e801b10a781d0b882c0a3f0ffad52ecd3342a1cdd8a11de0`，解包检查启动/安装/停止脚本、许可证及清单齐全，两个后端 EXE 的流式 SHA-256 均与固定官方值一致。源码仓库不包含发布二进制。

## 在线优选失效恢复及域名输入（2026-11-07）

- 用户反馈双栈均显示“不具备优选条件 / 线路不可用”，同时 IP 库消失。根因在于 `resolveBestHost` 直接信任 localStorage 中的旧域名，不验证或切换；`updateLibraryOptions` 又以线路检测结果过滤静态 IP 库，`updateActionAvailability` 禁用初筛按钮，导致外部服务失败后页面没有重试入口。复查既有“非 CN 仅警告”修复，没有恢复地区硬限制。
- 在当前网络实测一个主服务 IPv4 地址超时，而备用服务地址可返回 HTTP 200 JSON；这只能证明当前采样路径的差异，不能推断主服务全球失效。旧 `cf.090227.xyz/ips-v4` 则返回 HTTP 200 的 HTML 网页而非网段文本。未将用户出口 IP、Token 或真实配置写入仓库。
- 服务缓存现在只决定尝试顺序，每轮复用同一批真实双栈检测结果；缓存服务双栈失败后尝试备用服务，全部失败时清除缓存，保留失败状态，不重复执行选服务和测线路两批相同请求。IP 库独立显示，初筛按钮允许重新验证；失败提示改为“检测服务未连通”，不把第三方请求失败推断成本机线路失效。下载测速仍要求服务就绪。
- 官方网段改用 2026-11-07 核对的内置 IPv4/IPv6 快照，来源为 `https://www.cloudflare.com/ips-v4` 和 `/ips-v6`，不再依赖失效的第三方路径。远程库返回空内容或 HTML 时拒绝覆盖输入框。官方发布范围改变时需更新快照；导入网段不等于已验证网段内所有 IP 可用。
- 用户补充从 `bestcf.fxxk.dedyn.io` 带回域名结果测速和导入的需求。原 `prepareCandidates` / `normalizeAddress` 仅接受 IP，导致域名被忽略；增加共享域名规范化与解析，支持域名、域名:端口#备注和 IP 混合输入，校验 DNS 标签及端口。域名默认 443；固定端口设置仍生效。外站入口保留，用户复制后粘贴，不跨站读取数据或改变外部页面。
- 域名使用固定 Cloudflare/Google JSON DNS 端点，不向 DNS 请求发送 Cookie 或管理凭据；并发查询 A/AAAA，失败切换供应方，运行内缓存 Promise，取消时停止派发。每域名最多交错尝试四个有效 IPv4/IPv6 地址，首个可测地址复用现有 IP 初筛、下载、排序和筛选流程。结果地址保留原域名，`parsed` 保存真正测量的 IP，避免速度测试误把域名编码成 IP 标签；类型标注“域名解析IP”。测量不是对原域名的 SNI/网页或完整代理连接验收，DNS 更新后出口可能变化。
- 复用既有勾选 / 全选和 `saveSelectedResults` → `appendOnlineOptimizeSelections`，按钮改为“导入到优选列表”，追加域名及测速结果到 `customIPs` 并标记待保存，不直接覆盖或提交 KV。README 和输入提示同步格式、测量含义、操作顺序及内置库限制。
- 新增 `tests/optimizer-network.test.cjs` 覆盖过期缓存切换、缓存重检、全部失败清缓存、无线路时库导入、HTML 拒绝、重试按钮；`tests/optimizer-domains.test.cjs` 覆盖混合输入与拒绝非法域名/端口、A/AAAA 与 IPv6 退路、DNS 缓存/备用/取消、下载目标保持已测 IP、原域名带测速结果导入。既有非 CN 警告、本地 Clash 和应用专用监听回归继续通过，内联脚本编译通过。Pages 资源准备及 Wrangler functions build 成功；本项目无 APK 构建目标。
- 真实 Chrome 打开本地独立优选模板，验证备用服务完成 IPv4 检测、IPv6 请求失败仍可操作、内置库导入 15 行，以及一个可测域名的解析→初筛→下载→速度表头排序，输出保留域名及测量值。截图保存在忽略的 `tmp/optimizer-check/domain-speed.png`，未写入公开仓库；列表导入由离线回归验证，没有修改用户线上配置。另一个公开域名的解析 IP 被第三方服务返回 403，因此未得到可用结果；追加零结果时的具体错误提示，不能把“接受域名”描述成任何域名均可测试。浏览器通过不替代用户 Pages 线上部署、其他网络和完整代理连接验收。
- DNS 请求头及 JSON 参数依据 [Cloudflare 文档](https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/make-api-requests/dns-json/)和[Google 文档](https://developers.google.com/speed/public-dns/docs/doh/json)。后续若改成直接检测域名自身 trace/SNI，需单独实现和标注，不应把当前解析 IP 测量混称为原域名链路。

## 上游差异及 1101 更新核对（2026-11-07）

- 在线读取 `cmliu/edgetunnel` 的 `refs/heads/main`，当前为 `a8ab11125ece9bc27983f609a6359be81b21050c`。本地 Git 确认它是当前分支祖先，`HEAD..a8ab111` 为 0 个提交，没有待同步的上游 main 提交；本轮只核对，没有进行合并。
- 用户提到的更新是 [66f1c51](https://github.com/cmliu/edgetunnel/commit/66f1c51c4ecee058b959104cb0517e073cdb1213)，提交日期为 2026-10-08，标题含“修复报错1101信仰”。逐文件差异只有 `_worker.js` 首行版本号更新和 CHANGELOG 新增 6 行，没有新增异常处理或传输修复逻辑。该提交已包含在本 fork 历史中；当前 Version 同为 `2026-10-08 22:23:27`，CHANGELOG 与上游 main 完全相同。不能仅凭该标题声称所有 1101 错误已经修好，旧同步记录的笼统表述在本轮更正。
- 相对上游，本 fork 的主要功能差异为：管理面板及登录/提示页随 Pages 合并部署；缺少原生 KV 时通过环境变量使用 KV API；可选 VPN Gate 链式订阅；批量测速、排序、本地 mihomo 延迟检测和应用专用端口配置生成；fork 默认值、订阅 YAML 兼容性、内部中文命名及未认证请求处理调整。差异涉及源码、页面、脚本、测试和文档共 15 个文件，不能把行数差异当作功能增减数量。
- 上游 `8ca1012` 的大段无运行作用注释仍按此前审阅结果移除，协议和接口兼容性调整见既有开发记录。本轮通过提交祖先关系、版本号、CHANGELOG 和文件差异核对结论；未重新构建、运行代理拨号或验证线上 1101。

## 部署教程只保留 Pages 关联 GitHub（2026-11-07）

- 用户明确以“首次填齐后一次部署到位”为目标，要求移除不能满足这一操作顺序的其他部署说明。README 删除 Workers 粘贴代码、Pages 网页上传及通用上游部署教程入口，只保留现有 Pages + GitHub 教程；同步收敛特性介绍和快速部署入口，避免读者按旧教程先发布再补配置。
- 已有项目仅填 `ADMIN` 的处理保留为独立“已有项目补救”，增加 `#existing-pages-recovery` 锚点，明确补变量后仍需新部署，不与首次填齐的步骤混用。继续保留新版 Token 创建步骤、原命名空间 ID 复用及 API 失败提示；没有改运行逻辑、部署配置或存储数据，也没有新增其他部署脚本。
- 文档检查限于差异、锚点、折叠标签和删除后的引用；不重新构建或进行线上部署。旧教程可从 `f83fb73` 查看。按既有要求推送到 `Chengeeker/forkedgetunnel/main`。

## API Token 教程适配新版策略界面（2026-11-07）

- 用户反馈 Token 教程的设置与官网不符，并授权通过 computer-use 查看 Chrome。实际个人资料创建页已使用 `Policies`：`从头开始（Custom）` → `Start with an Account policy` → `Edit 帐户 policy`；账号资源在策略内的“包括 / 帐户”中设置，权限改为搜索组并勾选，不再是独立的 `Account Resources` 加三列权限选择。之前只核对官方权限名称就把旧版布局当作当前布局，是本轮需要纠正的文档错误。
- README 改为新版实际中文及保留英文的逐步操作，增加 `#kv-api-token` 稳定锚点；旧版三列界面仅作为条件说明。搜索 `KV` 后可见“开发人员平台 → Workers KV 存储”的“读取 / 编辑”，只选编辑；官方说明 Edit 包含 CRUDL，因此不额外要求读取权限。账号限定为项目所属账号，不授予 Workers 模板的其他权限。
- 说明过期时间及客户端 IP 过滤的影响：运行时调用来自 Cloudflare，不能把用户电脑 IP 当作调用来源。继续保留 Token 完整值、加密填写、账号 ID 对应关系及已有项目补变量后需新部署的说明。
- 浏览器仅准备了名称、指定账号和单项 KV 编辑权限的草稿，并在“令牌摘要”中确认；没有点击最终“创建令牌”，没有生成、复制或发布凭据，没有修改 Pages 变量。核对截图保存在被忽略的 `build/token-guide-check/`，不提交用户账号截图或标识到公开仓库。最终创建属于新增持久访问，应在用户决定后执行。
- 本轮仅修改 README 和开发记录，检查差异、锚点及字段说明；不重跑运行代码构建或代理测试。当前界面经真实 Chrome 验证，Token/API 权限执行和线上 KV 创建仍未验收。官方依据为 [创建 Token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)及[权限列表](https://developers.cloudflare.com/fundamentals/api/reference/permissions/)，按既有授权推送到 `forkedgetunnel/main`。

## README 部署操作补全（2026-11-03）

- 用户确认目前只设置了 `admin`，随后要求把 README 讲清楚。该条件会在 `获取配置存储` 中因缺少账号 ID、Token、名称/ID 而返回原 KV 空值，进入未配置页面；此时未调用创建 API，不能把现象归因于 API 权限拒绝或平台创建失败。本轮仅补文档，没有再改存储逻辑或扩大部署承诺。
- 在快速部署开头加入醒目说明和稳定锚点 `#pages-github-setup`；Pages + GitHub 教程默认展开，增加账号 ID 获取位置、自定义 Token 的账号级 KV 编辑权限与指定账号资源、Token 完整值和 Token ID 的区别、固定存储名称及原 ID 的填写示例、四个变量各自的加密/文本类型和填写顺序。
- 单独覆盖“已经部署且只填了 ADMIN”：保留原密码（小写 admin 也兼容），在当前生产/预览环境补三项变量，保存后触发一次新部署加载。首次部署前填齐可避免补绑再发布，但已运行的旧部署不能凭代码自动得到后来新增的环境变量；上一轮文档没有把这两种情况讲清楚，后续不得再混用“无需二次部署”的表述。
- 排查表区分“缺变量尚未进入创建流程”、API 401/403、网络错误、换名称后选到另一份配置；指导只提供变量名和错误码，不索取密码或 Token。平台步骤核对 Cloudflare 官方账号 ID、Token 创建、Pages 变量与 Secrets 文档，未采用宣传文章作为依据。
- 这是文档改动，只检查差异、文档锚点/链接及说明与现有判断逻辑是否一致；不重跑构建或代理测试。仍未访问用户 Cloudflare 账号，也未完成其线上部署验收。按既有要求推送至 `Chengeeker/forkedgetunnel/main`。

## 无原生 KV 绑定的首次部署可用性修复（2026-11-03）

- 用户实际部署仍看到“绑定名为 KV 的命名空间”页面，说明上一轮本地 multipart 元数据检查不足以证明 Pages Git 线上绑定已经建立；尚未取得该次构建日志，不能断言是脚本未执行、平台配置快照还是其他原因。确定的代码问题是运行时仍硬依赖 `env.KV`。本轮从运行时消除该硬依赖，不再把构建通过当作线上绑定成功。
- 有原生 `KV` 时直接复用，保持原路径。没有绑定时，首次部署的环境变量填写 `ADMIN`、`CLOUDFLARE_ACCOUNT_ID`、加密的 `CLOUDFLARE_API_TOKEN`、固定项目专用的 `KV_NAMESPACE_NAME`；Token 只需当前账号的 Workers KV Storage 编辑权限。已有数据用 `KV_NAMESPACE_ID` 指向原命名空间，优先于名称；绝不为失效 ID 自动创建另一份空配置。
- 新增 `获取配置存储` 兼容现有全部文本 get/put 调用，不提供未使用的接口。首次实际读取配置时才查找/创建命名空间，后续缓存 ID；名称必须固定，不从请求域名、随机部署 URL、密码或 UUID 派生，防止换域名或改密码后误选另一份数据。生产和预览在环境变量中明确使用不同名称。并发初始化共享 Promise，跨实例重名创建错误后重新查找，失败可重试；原生绑定始终优先。
- 入口仅在普通 HTTP 配置处理分支补充兼容存储。对象创建本身不发请求；未经鉴权的后台访问、登录页面、公开页面和 WS/gRPC/XHTTP 数据转发都不会创建或调用存储 API。后台/订阅使用 API 相比原生绑定有额外延迟和账号 API 额度消耗，不能宣传与原生 KV 等价的性能。没有缓存键值或增加配置并发写入规则，避免带入新的一致性问题。
- API 只允许固定 Cloudflare 域名，Bearer Token 仅发给该域名；键名 encodeURIComponent，使用 15 秒超时，不输出上游响应正文或 Token。**本地真实 workerd 发现 `redirect: 'error'` 不受此边缘运行时支持，而 Node 模拟会接受；已改用 `manual` 并把 3xx 当失败，禁止跟随携带凭据的重定向。** 后续不能仅靠 Node 测试验证平台 fetch 选项。
- API 异常带专用标记，由入口转换为清楚的 503 JSON。配置初始化及可选 TG/CF 配置读取遇到存储接口错误会重新抛出，不套用原来“出错就用默认值”的逻辑；保存失败不返回成功。真正不存在的键才返回 null，初始化、权限、网络、非 404 读取失败不能假装无数据。KV 日志仍遵循原有 OFF_LOG 和后台任务处理。
- `scripts/prepare-pages.cjs` 改为只复制运行资源到 dist，不再创建资源、生成绑定或改写 Wrangler 配置；保留同一构建命令以减少现有设置改动。`noKV/index.html` 和 README 改为同时说明原生绑定及首次填写变量的方案，不再只让用户去补绑。运行时兼容存储不等于平台原生绑定，也不需要补绑或重新发布才能使用刚创建的命名空间。
- 替换 `tests/pages-kv.test.cjs`：7 项回归覆盖完整无原生绑定登录→创建→保存→新运行实例重开、域名切换复用、原生优先、原 ID 复用、键名编码、并发与重名恢复、权限失败 503、初始化重试和读写失败、构建不需要 Token 且不改配置。另有本地 Miniflare/workerd 测试使用假 API、禁止外网，验证实际 Worker 无原生 KV 时的登录/创建/保存/重读通过；旧传输入口本地运行检查通过。真实 Cloudflare 账号权限及线上部署仍未验收。
- Pages `functions build` 编译和实际 multipart 包检查通过：上传元数据不再提交/覆盖绑定清单，由平台保留控制台变量与绑定；dist 仅包含运行资源，源码 Wrangler 配置未被改写。原有 Worker 与三个前端离线测试、源码语法和 `git diff --check` 通过。保存配置、CF/TG 配置、优选和重置的内层错误捕获均需重新抛出存储接口错误，否则会挡住入口统一的 503 处理；测试已覆盖“初始化成功但后续 PUT 被拒绝”的情况，而不只测试首次读取失败。
- 回退文件位于 `build/rollback/20261103-kv-runtime/`；原生 KV 数据没有迁移、删除或清空。若切换为原生绑定，必须绑定相同 ID。上轮已经生成的命名空间也可直接复用，不应重新建一个不同名称后误以为原配置丢失。
- 一手依据：[命名空间创建 API](https://developers.cloudflare.com/api/resources/kv/subresources/namespaces/methods/create/)、[KV 文本值读写 API](https://developers.cloudflare.com/api/resources/kv/subresources/namespaces/subresources/values/)。本轮不宣称网络代理识别问题已解决。

## Pages Git 构建自动准备 KV（2026-11-03，已由运行时备用方案替代）

- 用户确认使用 Pages 关联 GitHub。当前需求是减少部署操作；用户反馈之前网络特征隐藏效果仍不足，但没有新的网络识别验收证据，本轮不宣称已解决识别问题，也不修改传输逻辑。
- 新增 `scripts/prepare-pages.cjs`。Pages 构建命令设为 `node scripts/prepare-pages.cjs`，输出目录设为 `dist`，首次部署前一次性设置 `ADMIN`、`CLOUDFLARE_ACCOUNT_ID` 和加密 `CLOUDFLARE_API_TOKEN`。Token 权限为当前账号的 Cloudflare Pages 读取与 Workers KV Storage 编辑；脚本使用 Pages 提供的 `CF_PAGES_URL` 和 `CF_PAGES_BRANCH` 确定项目及环境，不需要另填项目名。
- 先读取当前项目、生产分支和对应环境配置。已有 `KV` 必须先确认原命名空间仍可读取，保持其数据和 ID，不按新标题替换。未绑定时分页查找固定标题 `forkedgetunnel-项目名-环境-KV`，存在即复用，否则创建；并发重复名称错误会重新查找，不删除或清空任何命名空间。新生产/预览资源隔离，已有共享绑定保留原意。
- 创建后在构建检出目录生成 Pages 专用 `wrangler.toml`（移除普通 Worker 的 `main` 等字段，保留兼容日期和 flags），将 KV ID 写入当前上传配置，使创建和绑定都发生在同一次部署前。不是只创建资源，也不在构建中调用重新部署接口。当前 Worker 部署配置文件在源码仓库中保持原样，脚本只在构建检出目录改写；本地测试必须使用隔离目录，避免误改正常 Worker 入口。
- Wrangler Pages 配置会成为对应配置字段的来源，因此复制当前环境可读取的普通变量和所有 KV 绑定；加密变量仍由 Pages 管理，不输出其值。额外的非 KV 资源绑定会先报错，防止静默覆盖。API Token 被排除于生成的明文变量；禁止输出 API 响应正文及认证头，异常只报告状态。请求限定 Cloudflare API，禁止重定向，设置 30 秒超时。资源创建失败或数据格式不完整时停止构建，不发布半成品；若创建后构建失败，新资源留待下次按固定标题复用，不做有数据损失风险的自动删除。
- 静态输出仅复制本应用运行所需的 `_worker.js`、`admin/`、`login/`、`noADMIN/`、`noKV/`、`cdn-cgi/`，不将构建脚本、Token、部署配置、测试、回退文件或开发文档发布为静态文件。源码未引入依赖，使用 Node.js 20+ 的标准库和 fetch；额外 API 操作仅在构建阶段，不增加代理请求开销。
- 新增 `tests/pages-kv.test.cjs`，6 项模拟 API 测试覆盖创建、已有绑定及其他 KV 保留、分页和失败重试复用、预览隔离、并发重名、缺少授权/上下文、权限失败、失效绑定和额外绑定的保护、Token 不写入静态输出及生成配置。未接入真实 Cloudflare 账号创建资源。
- 使用实际 `_worker.js` 与管理资源，在 `build/pages-kv-check/` 内生成模拟配置并执行 Wrangler 4.128.0 的 `pages functions build`。成功解析实际 multipart 上传包，确认 `KV` 类型为 `kv_namespace`、包含指定命名空间 ID，保留模拟 `ADMIN`，兼容日期为 `2025-11-04`，不含构建 Token；build metadata 正确指向 `dist`。这证明本地打包能携带绑定，不替代 Pages Git 线上构建/首次发布验收。
- 一手依据：[Pages Wrangler 配置及配置来源说明](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)、[Pages 构建变量](https://developers.cloudflare.com/pages/configuration/build-configuration/)、[Pages 项目 API](https://developers.cloudflare.com/api/resources/pages/subresources/projects/methods/get/)。Workers 原生省略资源 ID 的自动创建功能不能直接照搬到当前 Pages Git 流程；不能把取消注释原 Worker KV 配置当作 Pages 自动绑定已经完成。
- 回退方式：恢复之前的 Pages 构建设置和原输出目录，保留既有 KV 绑定；若该项目已经采用文件配置，按 Pages 官方规则移除配置文件后重新部署以恢复控制台编辑。不要为回退删除 KV。推送目标继续为 `forkedgetunnel` 远端的 `Chengeeker/forkedgetunnel/main`，避免误推 `origin` 指向的另一个仓库。

## 减少未认证网络探测线索（2026-11-03）

- 本轮在前一轮中文命名结果上继续修改，保留其未提交代码。变更前的 Worker、开发记录、README 和兼容性测试保存于 `build/rollback/20261103-network/`；不要把前一轮的原始英文版回退副本误当成本轮基线。
- 原先无效 POST 返回 `Bad Request`、`Invalid request`，gRPC 在鉴权前即返回 `application/grpc`；默认公开页还是固定 nginx 模板。本轮使无效传输返回调用入口，由入口统一处理公开回退。`URL` 留空时普通访问和无效传输统一返回 `404 Not Found`，不附带协议响应头；后台、登录、订阅鉴权和版本接口保留。README 的 `URL` 说明已同步，显式设置 `URL=nginx` 或 `1101` 仍保留原页面行为。
- 使用外部 `URL` 回退时，无效传输只 GET 公开首页，不透传失败请求的正文、路径/查询参数、Cookie 或认证头，避免把节点参数和会话交给第三方。读取失败、错误凭据和超限请求会释放读取锁并取消未完成的上传；不向外部站点重放已消费的流。普通非传输请求的既有页面转发行为保留。
- gRPC 复用原解析器，VLESS/Trojan 首包解析并校验凭据后才返回协议响应头。只等待完整首包，不等待上传结束或出口拨号，不增加额外往返、随机延迟或填充流量。首包未认证时拒绝声明超过既有 16 MiB 上行队列上限的帧，并按无符号长度读取，避免恶意高位长度导致异常循环或持续缓存。已认证的数据帧、封装和上下行队列不变。
- WebSocket 只把原来必然失败的超限早期数据提前到升级前拒绝；普通子协议（例如 `binary`）、无早期数据的客户端、合法早期数据、SS 模式禁用 early-data 的历史修复均保留。没有强制所有客户端先提供路径密钥或 early-data，避免旧节点断连。畸形百分号路径不再使链式参数解码抛出未处理异常，不能用平台异常页暴露该内部错误。
- 新生成的 XHTTP 链接在现有 `extra` 内增加 Xray 原生 `noGRPCHeader: true`，支持该选项的客户端不再为原始 XHTTP 上传额外附加 gRPC 内容类型头；现有随机 padding、本机标识和 stream-one 模式保留。旧链接仍可使用原来带 gRPC 头和 padding 标记的方式。面板使用后端生成的 `LINK`，无须另造前端编码实现；需要重新获取节点或更新订阅才能获得新参数，第三方转换器和客户端是否保留该字段仍需实际验收。
- 不改外层 TLS、客户端指纹、默认 ECH、代理协议字节、成功连接必需的响应头、订阅转换 User-Agent 或本机标识规则，避免重犯先前的上游兼容问题。保留 WS 禁用压缩的现有处理和 `X-Accel-Buffering` 流式提示，没有为了减少头字段改变压缩或缓冲行为。管理入口仍保留既有访问方式。本轮是减少具体探测线索，不保证流量不可识别，也不能阻止托管平台看到源码、连接和转发行为。
- 扩展 `tests/worker-compatibility.test.cjs` 并通过：无效/空 POST、错误凭据和超大 gRPC 帧、读取异常、超限 WS early-data、畸形路径的公开响应一致；失败上传取消；合法 VLESS/Trojan 的 gRPC/XHTTP 结果、旧 XHTTP 带 gRPC 头的方式；分片首包鉴权前不泄露响应头，鉴权后在上传和模拟拨号未结束时仍可读取响应；外部回退不泄露凭据；原来的登录、协议、加密和链式测试保留通过。另三个前端离线测试也通过。
- 使用已安装 Wrangler 附带的 Miniflare/workerd 做本地运行检查，阻断外网出口：gRPC/XHTTP 返回内容、WebSocket 普通消息及合法 early-data 的 204 往返、`binary` 子协议、SS 升级握手和无效探测的 404 均通过。测试只走本机，没有验证真实代理出口、SS 完整加密会话、Bettbox/其他实际客户端、Cloudflare 线上响应或真实流量识别效果。临时运行脚本位于 Git 忽略的 `tmp/check-worker-runtime.cjs`，没有新增项目依赖。
- 源码及打包输出的 `node --check`、`git diff --check` 和 Wrangler `deploy --dry-run` 均通过。当前产物为 `build/network-worker/_worker.js`，gzip 为 86.74 KiB，相比本轮前的中文版本 86.39 KiB 增加约 0.35 KiB。没有执行 Cloudflare 发布或修改线上配置；后续 GitHub 推送若关联平台自动构建，发布状态需另行核对。
- 本轮推送目标为远端 `forkedgetunnel` 的 `Chengeeker/forkedgetunnel:main`。本地 `main` 跟踪 `forkedgetunnel/main`，而 `origin` 指向 `Chengeeker/edgetunnel`；推送时必须按实际仓库地址选择远端，避免重复此前推错仓库的问题。
- 依据使用协议与平台的一手资料，不采纳宣传性结论：[Xray XHTTP 请求头实现](https://github.com/XTLS/Xray-core/blob/main/transport/internet/splithttp/config.go)、[Xray gRPC 写入实现](https://github.com/XTLS/Xray-core/blob/main/transport/internet/grpc/encoding/hunkconn.go)、[Cloudflare WebSocket 压缩兼容开关](https://developers.cloudflare.com/workers/configuration/compatibility-flags/#websocket-compression)。Xray 的 gRPC 写入会发送首条消息，不以先收到应用响应头作为发送前提；其他客户端的运行行为不由这项源码核对代替。

## Worker 中文内部命名（2026-11-03）

- 修改基线为本地 `main` 的 `597431d`，开始时工作区干净。本轮只修改 Worker 内部名称，管理面板 HTML/事件入口、部署配置和现有功能不变；这是 JavaScript 的中文标识符整理，不是另一种编程语言。
- 212 个内部函数、类、常量和主要变量改用中文，共更新 2,448 处引用。范围包括请求入口、字节流/数据报转发、链式连接、安全层握手和加解密、订阅热补丁及平台用量查询。局部算法变量、平台 API 和对外数据字段仍有英文，不宣称全项目已经完全中文化。
- 兼容性重点：管理面板 `fetchLatestOnlineVersionNumber()` 会以正则匹配 Worker 源码首行的 `const Version`，因此保留名称和版本值；`/version` 仍返回数字 `Version`。保留环境变量和 KV/JSON 键、认证算法、UUID、Cookie、URL/查询参数、协议字节、订阅格式、User-Agent 和本机标识派生规则。特别不能重犯上次同步修复过的版本识别、本机标识或订阅转换兼容问题。
- 使用语法树定位标识符，只修改内部绑定和引用；对象简写展开为原英文键加中文变量，避免重命名时连带改变 API、配置或协议字段。名称目标经过全文件碰撞检查。对改名后的语法树逆映射比较通过，确认表达式、分支、字面量、对象键和协议内容一致。没有引入运行时解码、额外依赖、填充代码或新的网络请求；函数显示名称和异常栈中的内部名称会随改名变化。
- 中文命名只减少源码中直接可见的英文内部名称，不改变也不隐藏 WebSocket、gRPC、XHTTP、安全层握手、出口连接和流量行为；不能据此保证不被平台或网络识别。许可证和来源说明保留，没有通过删掉认证、校验或错误处理来减少特征。
- 新增 `tests/worker-compatibility.test.cjs`：离线检查登录成功/失败、未授权访问、版本接口与源码识别、三种传输入口分发、客户端字段、凭据解析和五种链式参数、字节流协议解析、分片记录及握手消息、中继报文；流式认证加密和分组认证加密与 Node 原生实现对比，包含认证篡改拒绝。同一套检查在改名前的临时副本上也通过。入口路由测试替换处理器，不代表真实网络握手或拨号验收。
- 原有本地 Clash 实测、网络警告、应用专用监听配置三个离线测试均通过。未执行 Cloudflare 发布、真实代理拨号、实际客户端订阅更新或设备验收；本项目没有安卓构建目标，不生成 APK。
- `node --check`（源码和打包输出）、`git diff --check`、Wrangler 4.128.0 的 `deploy --dry-run` 均通过；改名前后均进行了本地打包，没有上传。打包后 gzip 从 82.94 KiB 增至 86.39 KiB，约增加 3.45 KiB；没有增加逐请求计算步骤，但未测量平台真实冷启动、吞吐和延迟。当前产物在 `build/chinese-worker/_worker.js`，项目主入口仍为根目录 `_worker.js`。
- 本地回退副本保存为 `build/rollback/20261103/_worker.js`（Git 忽略，不能当作新的部署入口）；原始版本也可从 `597431d` 恢复。后续合并上游时需按函数逻辑核对新旧命名，禁止对全文件进行文本替换，以免误改协议字符串、HTML 内联事件或对象键。

## 上游同步（2026-10-15）

- 合并 `cmliu/edgetunnel` 的 `main` 至 `a8ab111`（对应上游 2026-10-08 更新），同时保留本 fork 的管理页面合并部署、默认配置、家宽链式、排序和本地 mihomo 测试等改动。
- 同步上游 Worker 修复：版本接口统一返回数字版本；统一本机标识头/键的生成和读取；优选 API、订阅生成器和订阅转换请求附带本机标识及版本 User-Agent；保留上游标注 1101 的版本更新及 `CHANGELOG`。该 1101 提交仅修改版本号和日志，具体差异见 2026-11-07 的核对记录，不能据此确认线上异常已解决。
- 上游提交 `8ca1012` 还在 `_worker.js` 尾部追加了约 26,499 行 Tanakh 希伯来文文本，全部位于无运行作用的块注释中。同步时只保留实际代码和版本修复，移除该数据块，避免 Worker 源码额外增加约 2.55 MB；后续同步若上游改为实际功能代码，需重新审阅，不能按相同规则直接删除。
- 合并期间唯一冲突为 `_worker.js` 文件头：保留 fork 的许可证声明、Pages 本地资源回退和家宽缓存，同时采用上游版本号及数字版本常量。
- 验证：`node --check _worker.js`、现有 3 个离线测试及 `git diff --check` 均通过；未做 Cloudflare 部署或真实代理网络测试。

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

### 2026-10-04：应用专用代理端口配置生成

- 编码前确认项目没有专用入站配置生成器；mihomo 已有 mixed listeners 和 proxy 直绑节点能力，无需新增代理协议或依赖。官方依据：https://wiki.metacubex.one/config/inbound/listeners/ 、https://wiki.metacubex.one/config/inbound/listeners/mixed/ 。
- 「在线优选」中新增独立「应用专用代理端口」卡片，用户每行填写本地端口=客户端完整独立节点名称（最多 16 条）。仅在页面生成/下载 YAML 覆写片段及 HTTP/SOCKS5 本地地址，不自动修改 Bettbox、Worker/KV 或远程订阅，不上传节点名称。无需先连接控制接口，可直接从 Bettbox 复制节点名。
- 每个端口使用 mixed、listen=127.0.0.1、udp=false、users=[]，proxy 直接指定节点而非日常策略组；不会改动已有规则、日常代理端口或策略组。输入仅允许 1024～65535、禁止重复及常见代理/控制端口 7890/7891/9090/9443；网页无法确认其他端口占用，用户仍需检查本机实际配置和监听状态。
- YAML 节点名用 JSON 双引号转义，拒绝控制字符、链接、内置 DIRECT/REJECT/GLOBAL 等出口；支持中文及名称中的等号、引号和反斜杠。修改输入立即清空旧输出、防止误下载旧配置。不引入认证凭据，不提供 TLS 入站，不能把 http:// 改成 https:// 当作加密代理。
- 使用顺序：复制节点完整名称 → 生成片段 → 合并到客户端支持的本地 listeners 覆写 → 重载 → 目标软件填 127.0.0.1 和专用端口 → 验证实际地区与切换日常节点后独立性。已有 listeners 必须合并同一个列表，不重复顶层键，不用此片段替换完整订阅；客户端是否支持保留该覆写尚需用户确认。
- 仍依赖 Bettbox 内核运行（不承诺关闭客户端后可用）；不需要接管系统流量，用户可按需关闭系统代理/TUN。节点名更改后要同步绑定。优选地区标签不保证真实落地地区；生成器不增加跨地区或直连回退，节点不可用时需用户手动更换。
- 离线验证覆盖多端口、独立绑定、JSON/YAML 字符转义、非法/重复端口、内置出口/订阅 URL 拒绝、条目上限及输出失效；复跑本地实测、非 CN 警告回归和脚本编译。未修改用户的本地客户端或进行真实拨号/监听验收。

### 2026-10-02：非 CN 出口只警告、不禁止

- 已有网络检测、警告弹窗及确认入口可复用，无需新库。检测成功的 IPv4/IPv6 都纳入可用线路，不再以 country=CN 作为 HTTPS 初筛、IP 库和下载测速的资格条件；country/allowed 字段仍保留真实检测结果，用于警告展示。
- 警告保留，确认按钮改为「我知道了，继续进入」，仅关闭弹窗，不再刷新父页面。非 CN 卡片可见，说明结果只代表当前出口路径，不等同中国直连或 Clash 实测；双栈中任一出口非 CN 也会提醒。相同出口地区不在每次操作时重复弹窗，地区变化后再次提醒，切回 CN 会清除该提醒状态。
- 检测服务真实请求失败仍保留错误及原可用性判断，不伪造线路；页面及本地 Clash 实测仍可访问。保留本地优选快捷入口。改动仅限本仓库内置在线优选，不改变独立第三方域名工具。
- 离线回归覆盖 CN、非 CN、双栈混合、失败、同地区去重、恢复 CN 后再次警告、确认不刷新及后续操作放行；同时复跑本地 Clash 测试和脚本编译。未做真实网络测速。

### 2026-10-02：本地 Clash 实测

- 已检查现有功能：原延迟是 OPTIONS 预探测后请求优选服务的 ip.json，不验证本项目代理。新增入口复用 mihomo 的 GET /proxies、GET /proxies/{name}/delay 和已有 runPool，无新依赖。原按钮、表头、CSV 改称「HTTPS 初筛」，下载速度来源不变。
- 使用流程：保存候选节点，在 Bettbox 导入/更新并启用订阅，在「本地 Clash 实测」读取节点，按名称筛选，再一键实测。只测独立节点，排除策略组、DIRECT/REJECT 等；不按名称猜测 IP、不覆盖初筛结果/ADD.txt、不切换当前节点、不修改客户端配置。
- 数值直接取内核 delay，不是网页 API 耗时。默认测试网址 https://www.gstatic.com/generate_204、超时 5000ms、并发 4（1～10）。测试网址和超时应与客户端一致；内核版本、统一延迟、连接复用、负载仍影响数值。不受原 HTTPS 初筛的中国直连检查限制。
- 接口只允许本机 127.0.0.1/localhost/[::1] HTTP/HTTPS 根地址，拒绝 URL 凭据、路径/查询参数及外部地址。secret 仅在页面内存中使用，以 Authorization 发往本机，不保存、不上传 Worker；请求只用 GET、不携带 cookie、不允许重定向。关闭在线优选或离开页面会停止前端任务、清空密钥并清除连接状态。
- 页面说明动态提供当前管理页面 origin 的 CORS 配置（不用通配来源）；需要用户在 Bettbox 本地覆写中配置 external-controller、secret、external-controller-cors，并允许浏览器本地网络访问。若 HTTP 被拦截，可配置可信证书的本地 HTTPS 接口，不能关闭浏览器防护或暴露公网。订阅更新可能覆盖控制设置，因此不要依赖直接编辑远程订阅。
- 节点上限 1000，测试中锁定设置；每次完成只更新对应单元格，结束后排序，避免重复重建整表。超时/失败保留。停止中断浏览器请求，已派发的内核测试最多持续到所设超时。
- 新日志 dial tcp 104.19.52.52:443: i/o timeout 属于该次 TCP 建连失败，不应据此修改 ECH/PROXYIP；单独的 connect error: context deadline exceeded 不能精确区分 TCP 和后续握手。
- 离线验证：2 个内联脚本编译，覆盖本机地址限制、组过滤、特殊名称编码、内核数值/排序、GET/重定向限制、错误/无效 delay、筛选、停止/并发、密钥及连接状态清理。真实浏览器 CORS/本机权限、Bettbox 配置及拨号仍由用户验收。
- 官方依据：https://github.com/MetaCubeX/mihomo/blob/Meta/hub/route/proxies.go 、https://wiki.metacubex.one/config/general/ 。

### 2026-10-02：在线有速度但 Clash 超时

- 在线优选通过 `buildProbeUrl` 请求优选服务域名的 `__down` 端点。它验证该服务的 HTTPS 下载能力，不验证本项目 Worker 的 SNI、WebSocket/gRPC、UUID 或后续代理出口；下载速度不能作为 Clash 可用性的保证。
- 现有 `Clash订阅配置文件热补丁` 可复用，无需新库。修复其中 UUID/password 带 YAML 引号或行尾注释时无法匹配本项目节点的问题，使这些节点也能补齐 ECH；已有 `ech-opts` 不再重复添加，保留订阅转换器已有配置。
- 用户反馈来自 Bettbox 普通订阅，其提供的节点已存在 ECH 配置且 UUID 未加引号，因此上述兼容性修复不能当作这条节点超时的根因。需要客户端日志定位 TCP、TLS/ECH、WS 握手或出口失败阶段。
- 本次保留默认 ECH 配置，未进行真实代理拨号或中国直连环境验收，实际网络测试由用户执行。不得保存用户提供的节点认证值或完整订阅。

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

以 README 的 [Pages + GitHub 教程](./README.md#pages-github-setup) 为准，只部署一个项目。此节按 2026-11-07 当前流程更新，替代最初“发布后再绑定 KV”的顺序：

1. 在 Cloudflare Pages 中连接自己的 GitHub 仓库，生产分支选 `main`，框架选 `None`，构建命令为 `node scripts/prepare-pages.cjs`，输出目录为 `dist`，使用 Node.js 20+。
2. 首次保存并部署前填齐 `ADMIN`、`CLOUDFLARE_ACCOUNT_ID`、加密的 `CLOUDFLARE_API_TOKEN`、固定 `KV_NAMESPACE_NAME`；已有数据用原 `KV_NAMESPACE_ID` 替代名称。已有原生 `KV` 绑定则继续优先使用它，无需改动存储方式。
3. 发布后访问 `/admin`，首次鉴权读取配置时自动创建/复用 KV；保存后重开验证持久化。运行时 API 读写不等于向平台添加原生绑定。已发布且只填了 `ADMIN` 的旧部署，补变量后仍需一次新部署。
4. `EDT_PAGES_URL` 留空使用当前仓库面板；外部面板仅作为兼容入口，可能没有本 fork 新功能。优选结果导入后选择自定义订阅模式、保存并在客户端更新。

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
