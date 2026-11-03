<!--
forkedgetunnel development record.
This document records modifications and additions made by Chengeeker on
2026-09-30 to the upstream edgetunnel project. See ../LICENSE for the
GNU General Public License, version 2.
-->

# 开发记录

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
- 同步上游 Worker 修复：版本接口统一返回数字版本；统一本机标识头/键的生成和读取；优选 API、订阅生成器和订阅转换请求附带本机标识及版本 User-Agent；修复上游记录的 1101 错误。上游 `CHANGELOG` 一并合入。
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
