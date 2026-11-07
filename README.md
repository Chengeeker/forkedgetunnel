<!--
forkedgetunnel is a modified fork of the upstream edgetunnel project.
Upstream source: https://github.com/cmliu/edgetunnel
Fork modifications and additions by Chengeeker, 2026-09-30.
The Worker and web source use GNU GPL version 2; see LICENSE.
The independent local-cfdata launcher uses GPL-3.0-or-later; see its LICENSE.
-->

# forkedgetunnel

[![Stars](https://img.shields.io/github/stars/Chengeeker/forkedgetunnel?style=flat-square&logo=github)](https://github.com/Chengeeker/forkedgetunnel/stargazers)
[![License](https://img.shields.io/github/license/Chengeeker/forkedgetunnel?style=flat-square)](./LICENSE)

基于 [cmliu/edgetunnel](https://github.com/cmliu/edgetunnel) 修改的 Cloudflare Worker / Pages 隧道与订阅管理项目。**本 README 按当前 fork 核对（2026-11-07），部署教程仅针对 Pages 关联 GitHub。** 上游教程、演示站和客户端推荐表不能代替本版本的操作说明或兼容性验证。

当前版本包含：

- 同仓库部署 Worker、管理面板和登录页，不需要另建面板项目。
- 首次部署填齐环境变量后，运行时自动创建或复用 KV，无需补绑后再部署。
- VLESS、Trojan、Shadowsocks 节点及订阅生成；支持 ProxyIP 和链式代理配置。
- 在线 IP / 域名解析优选、批量测速、排序及勾选导入；本地 Clash 实测是独立验证入口。
- Windows 本地 CFData-WEB 启动器；Android 可导入配置好的订阅，无需安装本地组件。
- 默认关闭的 VPN Gate 志愿者节点链式订阅，仅面向指定版本的 mihomo / Clash Meta。

功能和网络结果取决于客户端、Cloudflare 及外部服务。中文内部命名和请求处理调整不保证代理流量无法被识别；面板中的平台用量或请求统计也不等于真实代理流量计费。

## 使用顺序

1. [Pages + GitHub 首次部署](#pages-github-setup)：先准备账号 ID、API Token 和固定存储名称，再与 `ADMIN` 一起填入首次部署。
2. [首次使用与订阅](#first-use)：确认保存成功，选择订阅模式，再导入客户端。
3. [在线优选 IP / 域名](#online-optimize) 或 [Windows 本地优选](#windows-cfdata)：测试后使用自定义订阅模式保存结果。
4. 需要调整配置时查看 [环境变量](#environment-variables)、[升级与排错](#maintenance)。

**已经部署且只填了 `ADMIN` 的项目，请按 [已有项目补救步骤](#existing-pages-recovery) 操作。** 旧部署补变量后仍需一次新部署；首次填齐的项目无需补绑再部署。

<a id="pages-github-setup"></a>

## Pages + GitHub 部署（首次填齐，无需手动绑定 KV）

<details open>
<summary><code><strong>「 Pages + GitHub 部署文字教程 」</strong></code></summary>

本教程使用“通过 API 自动准备存储”的方式：**无需先去 KV 页面创建命名空间，也无需在 Pages 的绑定页面添加 `KV`**。程序在首次登录并读取后台配置时，才创建或复用真正的 KV 存储。创建资源需要你的账号授权，因此只填管理员密码无法完成这一步。

#### 部署前准备：取得账号 ID 和 API Token

**第一步：复制 Cloudflare 账号 ID。**

1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)，选择将要部署 Pages 项目的账号。
2. 打开 **Workers & Pages**，在 **Account Details（账号详情）** 中复制 **Account ID**。也可使用控制台搜索框，输入 `Copy account ID` 后复制结果。
3. 这就是 `CLOUDFLARE_ACCOUNT_ID` 的值，通常是 32 位十六进制字符串。请复制 **Account ID**，不要复制域名的 Zone ID。操作位置见 [Cloudflare 官方说明](https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/)。

<a id="kv-api-token"></a>

**第二步：创建允许读写 KV 的 API Token（按 2026-11-07 实际中文界面核对）。**

本节使用 **我的个人资料 → API 令牌** 中的用户令牌。新版创建页会显示 **Policies**，中文页面也可能保留部分英文。**新版不用找“创建自定义令牌”按钮，也没有单独的“Account Resources（账号资源）”区域**，直接按下面操作：

1. 打开 [我的个人资料 → API 令牌](https://dash.cloudflare.com/profile/api-tokens)，点击 **创建令牌**。如果已经看到“令牌名称”和“Policies”，就已进入创建页。
2. 在 **令牌名称** 填 `forkedgetunnel-kv`，方便以后识别用途。
3. 在 **Policies** 下点击 **从头开始（Custom）**，在菜单选择 **Start with an Account policy**（创建账号级策略）。页面会展开 **Edit 帐户 policy** 编辑区。
4. 编辑区的规则保留 **包括**；打开旁边的 **帐户** 下拉框，将默认的 **所有帐户** 改为 **Pages 项目所属的那个账号**。它应与第一步复制的 `CLOUDFLARE_ACCOUNT_ID` 对应。
5. 在 **搜索权限组……** 中输入 `KV`，找到 **开发人员平台 → Workers KV 存储**，只勾选右侧的 **编辑**。英文界面对应 **Workers KV Storage → Edit**。**编辑已包含创建、读取、写入和列出权限，不用再单独勾“读取”**；本项目只需这一项权限。
6. **令牌过期时间** 按使用期限选择，若设置了期限，需要在过期前替换 Pages 中的 Token。**客户端 IP 地址过滤** 留空，保留默认范围；这里的调用来自 Cloudflare 运行环境，不是你的电脑，不要填自己电脑的 IP。
7. 点击 **继续以显示摘要**，确认 **权限策略** 中显示的是你的项目账号，以及 **Workers KV 存储: 编辑**。检查权限范围正确后，再点击 **创建令牌**。
8. 复制随后显示的 **Token 完整值**，作为 Pages 加密变量 `CLOUDFLARE_API_TOKEN` 的值。它不是 Token ID，也不是 Global API Key；完整值只显示一次，不要发到聊天或提交到 GitHub。填完后继续下面第三步和 Pages 变量表。

**如果你的页面仍是旧版三列下拉框：** 在 **Permissions（权限）** 选择 **Account → Workers KV Storage → Edit**，在 **Account Resources（账号资源）** 选择 **Include → Specific account → 项目所属账号**，然后继续摘要和创建。只有这种旧版界面才按这些字段名查找。

以上流程已在实际 Chrome 创建页走到权限摘要，未生成 Token 或验证线上存储。权限含义及创建流程依据 [Cloudflare 官方教程](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)和[官方权限列表](https://developers.cloudflare.com/fundamentals/api/reference/permissions/)。

**第三步：确定一个固定的存储名称。**

- 如果这是新项目，没有需要保留的配置，`KV_NAMESPACE_NAME` 可以填 `forkedgetunnel-myproject-production-KV`，将 `myproject` 换成你的项目名即可。**这是自己填写的名称，不用预先创建，也不是命名空间 ID。**
- 填好后保持不变：以后换域名、改管理员密码或更新代码，都继续用这个名称。另一个项目应使用另一个名称；预览环境可用 `forkedgetunnel-myproject-preview-KV`，避免修改生产配置。
- **如果原来已经有 KV 配置要保留，改填 `KV_NAMESPACE_ID` 为原命名空间 ID，并优先使用这个 ID。** 可到控制台的 KV 命名空间详情中复制 ID；不要随便填一个新名称，否则会选到一份新的空配置。上一个版本自动创建过命名空间的，也按这个方法使用原 ID，或准确填写它原来的名称。

#### 新建 Pages 项目：首次保存并部署前填齐

1. 部署 CF Pages：
   - 在 GitHub 上 Fork [本仓库](https://github.com/Chengeeker/forkedgetunnel)，使用自己的仓库作为部署来源。
   - 在 CF Pages 控制台中选择 `连接到 Git` 后，选中你自己的 `forkedgetunnel` 仓库，进入构建设置，生产分支选择 `main`。框架选择 `None`，构建命令填写 `node scripts/prepare-pages.cjs`，构建输出目录填写 `dist`，根目录保留仓库根目录；使用 V2 或更新的构建系统及 Node.js 20 或以上版本。
   - 在**首次保存并部署前**展开 **Environment variables（环境变量）**，逐项添加下表四个变量。变量名按表格原样填写，不带空格；不要新增名为 `KV` 的普通文本变量：

     | 变量名 | 值填写什么 | 保存方式 |
     | --- | --- | --- |
     | `ADMIN` | 自己设置的后台登录密码 | 建议加密 |
     | `CLOUDFLARE_ACCOUNT_ID` | 上面第一步复制的 Account ID | 普通文本 |
     | `CLOUDFLARE_API_TOKEN` | 上面第二步创建的 Token 完整值 | **加密 / Secret** |
     | `KV_NAMESPACE_NAME` | 上面第三步确定的固定名称，例如 `forkedgetunnel-myproject-production-KV` | 普通文本 |

   - 有原数据时，用 `KV_NAMESPACE_ID` 替换表中的 `KV_NAMESPACE_NAME`，值填原命名空间 ID。两者同时填写时，ID 优先。
   - 核对四项填写完整后，再点击 **Save and Deploy（保存并部署）**。Token 仅填入 Cloudflare 的加密变量，不放到 GitHub、README 或聊天里。
   - 本仓库已经包含管理面板，构建只复制运行资源到 `dist`，不调用管理 API、不改写 `wrangler.toml`，也不发布 Token 或开发文档。Cloudflare 控制台中填写的环境变量由平台注入运行环境。

2. 首次登录后自动准备存储：
   - 有原生 `KV` 绑定时继续使用它。没有绑定时，程序在首次通过鉴权读取后台配置或订阅时创建/复用上述存储，通过 Cloudflare KV API 读写配置；不会要求补绑后重新部署，也不声称运行时给平台新增了原生绑定。
   - 同一个名称或 ID 会被重复部署、不同访问域名和新的运行实例复用，不清空数据。普通访客、登录页面和代理数据转发不触发存储 API。权限、网络或保存失败会明确返回 503，不冒充“保存成功”。
   - API 方式作为缺少原生绑定时的备用路径，后台和订阅读写会比原生 KV 多一次管理 API 调用并占用 API 额度；代理数据包的转发不经过它。以后添加原生绑定时，应选择同一命名空间以保留配置。
   - 本仓库已验证无原生绑定的完整登录、保存、重开及本地 workerd 运行，真实账号的创建权限和网络仍需首次运行确认。依据：[创建 KV 命名空间](https://developers.cloudflare.com/api/resources/kv/subresources/namespaces/methods/create/)、[KV 值读写 API](https://developers.cloudflare.com/api/resources/kv/subresources/namespaces/subresources/values/)。

3. 可选：绑定自定义域名。
   - 在 Pages 项目的 **自定义域** 中添加你自己的域名，例如 `proxy.example.com`，按控制台提示配置 DNS 并等待证书就绪。
   - 使用控制台实际分配的 `<你的项目>.pages.dev` 地址，不要照抄其他项目的域名。根域名与子域名的 DNS 要求不同，按 [Cloudflare 自定义域名说明](https://developers.cloudflare.com/pages/configuration/custom-domains/) 操作。

4. 访问 `https://<部署域名>/admin` 输入管理员密码，继续下面的 [首次使用与订阅](#first-use)。修改一项设置、保存后重新打开，确认持久化正常；只打开登录页不会创建 KV。

<a id="existing-pages-recovery"></a>

#### 已有项目补救：已经部署过，而且目前只填了 ADMIN

本节只用于补救已发布但缺少配置的项目，仍需重新部署一次使新变量生效。新建项目按上面的首次部署步骤操作即可。保留已有项目和原来的管理员密码，补齐另外三项：

1. 先按上面的准备步骤，取得账号 ID、创建 API Token，并确定存储名称；已有配置则复制原 KV 的 ID。
2. 打开 **Workers & Pages → 你的 Pages 项目 → Settings（设置） → Variables and Secrets（变量和机密） → Add（添加）**。旧版界面可能显示为 **Environment variables（环境变量）**。
3. 在当前访问的部署所对应的环境中添加变量：生产部署使用 **Production（生产）**；预览部署使用 **Preview（预览）**。不要只填在另一个环境里。
4. 保留已有 `ADMIN`，补加 `CLOUDFLARE_ACCOUNT_ID`、加密的 `CLOUDFLARE_API_TOKEN`、`KV_NAMESPACE_NAME`（或已有存储的 `KV_NAMESPACE_ID`），逐项保存。原来使用小写 `admin` 也受程序支持，不必为了改变量名而更换密码。
5. 到 **Deployments（部署）** 中，以新变量触发一次新部署或重试部署，等待成功后再打开 `/admin`。**修改变量不会让旧部署自动获得新值；已有项目补变量后，这一次发布仍然需要。** 以后新建项目时，在首次部署前填齐即可省去这一步，也不用再补绑 KV。

Pages 变量、加密选项和部署生效规则见 [Cloudflare 官方说明](https://developers.cloudflare.com/pages/functions/bindings/#environment-variables)。如果此前采用过本仓库旧版“构建时生成 Wrangler 配置”的方式，请先同步到当前代码；当前构建脚本只复制资源，不再改写平台配置。

#### 出现提示时按现象检查

| 看到的现象 | 优先检查什么 |
| --- | --- |
| “尚未配置持久化存储” | 当前部署没有原生 KV，且没有读到完整的账号 ID、Token、存储名称或 ID。只有 `ADMIN` 会出现这条提示；检查变量名、生产/预览环境和最新部署是否加载了变量。此时程序还没进入创建资源的步骤。 |
| “配置存储 API 请求失败”，HTTP 401/403 | 检查填写的是 Token 完整值、Token 是否有效、是否有 Workers KV Storage 编辑权限，以及所选账号与 Account ID 是否一致。 |
| “配置存储 API 连接失败”或超时 | 检查该次部署的运行日志及 Cloudflare API 连通性；不要把未保存当成保存成功。 |
| 更新或换域名后像是回到了默认配置 | 检查是否改了存储名称或 ID；应继续使用原命名空间。不要删除旧 KV 来尝试修复。 |

如果还有问题，可以提供**变量名列表、部署环境、错误文字或 HTTP 状态码**来排查，不需要提供密码和 Token 值。

</details>

<a id="first-use"></a>

## 首次使用与订阅

1. 打开部署域名的 `/admin`，输入 `ADMIN` 密码。修改一项配置、保存并重新打开页面，确认数据仍在；登录页能打开不代表存储已就绪。
2. 检查协议、传输和优选订阅设置。新配置默认使用 **VLESS、WebSocket、ECH 开启、随机优选 16 个地址**，订阅名称为 `forkedgetunnel`；反代设置中的初始 ProxyIP 为 `proxyip.cmliussss.net`。已有配置、环境变量及手动修改可能覆盖这些值，以面板实际显示为准。
3. 使用自己的地址或优选结果时，将 **优选订阅模式** 设为 **自定义订阅（支持汇聚订阅）**，检查“自定义优选地址”后保存。随机优选模式不会按这份自定义列表下发节点。
4. 在“获取节点链接”中复制客户端对应的链接，例如普通节点/订阅、Clash 订阅或 Sing-box 订阅。更改配置后，在客户端更新订阅；仅刷新管理页面不会更新客户端已导入的节点。

客户端需要支持所选协议、传输及 ECH 等参数。本仓库没有对全部平台和客户端版本完成逐项验收，因此不提供“全平台完美适配”的承诺。部分订阅格式依赖面板配置的外部订阅转换服务；转换服务会处理节点连接参数，使用前应确认服务来源可信。

<a id="online-optimize"></a>

## 在线优选 IP 和域名

1. 可自行输入地址，也可在“在线优选域名”打开的[外部站点](https://bestcf.fxxk.dedyn.io/)复制结果，回到“在线优选 IP”，粘贴到 **待选列表（IP / 域名）**。支持每行一个 `example.com`、`example.com:443#备注`，也可混合 IPv4、IPv6、CIDR 和 IP 区间。请输入地址，不要粘贴整段网页或带 `https://` 的网页 URL。域名未指定端口时默认使用 443；高级设置指定其他端口时使用该端口。
2. 点击 **HTTPS 初筛**。域名经 Cloudflare DNS（失败时尝试 Google DNS）解析 A / AAAA 记录，最多尝试四个地址，取首个可测地址继续测速，同一轮复用解析结果。结果标注“域名解析 IP”：数值代表当时解析 IP 经优选服务的路径，不等于域名自身网页、未来 DNS 结果或完整代理连接的性能。
3. 对初筛结果执行 **一键测速**，点击延迟或速度表头排序，勾选需要的结果（可全选），点击 **导入到优选列表**。原域名和端口会追加到管理面板的“自定义优选地址”，此时还没有保存到 KV。
4. 将 **优选订阅模式** 设为 **自定义订阅（支持汇聚订阅）**，检查列表并保存，再到客户端更新订阅。

IP 库独立于线路检测显示。**CF 官方网段 v4/v6（内置）**可直接导入，快照核对日期为 2026-11-07，来源为 [Cloudflare IPv4](https://www.cloudflare.com/ips-v4) 和 [IPv6](https://www.cloudflare.com/ips-v6)；导入网段不表示其中所有地址均可用。检测失败时仍可编辑、导入和使用本地 Clash 实测；点击 HTTPS 初筛可重试。在线初筛与下载测速依赖外部优选服务，服务失败不能据此判断本机线路不可用，也不会被标成测速成功。

**本地 Clash 实测**通过本机 mihomo 的 external-controller 接口测试真实节点延迟，与在线优选服务的下载测速不同。需要自行运行并配置内核控制接口、密钥和允许的网页来源，且可能需要浏览器本地网络访问授权；按面板内说明操作，不要将控制接口开放到公网。在线测速有速度不代表客户端代理连接一定可用，必要时使用此入口及客户端日志检查实际连接。

<a id="windows-cfdata"></a>

## Windows 本地优选（CFData-WEB）

“本地优选IP”会唤起 Windows 本机的 **CFData-WEB v1.8.5**，并在浏览器打开 `http://127.0.0.1:13336`。

1. 首次使用[下载 Windows 启动包](https://github.com/Chengeeker/forkedgetunnel/releases/download/local-cfdata-v1.0.0/CFData-Local-Windows-1.0.0.zip)，解压后双击 `install.cmd`。安装完成会自动打开本地页面。
2. 以后直接点管理面板的“本地优选IP”。浏览器首次询问是否打开本机程序时需要确认；网页不能代替首次安装。
3. 在本地页面完成优选，将结果**手动复制**回管理面板的“自定义优选地址”，选择自定义订阅模式并保存，再在客户端更新订阅。当前不会自动回传 CFData 结果。

支持 Windows x64 / ARM64，安装到当前用户的 `%LOCALAPPDATA%\forkedgetunnel\CFData`，只监听本机，不设置开机自启。重复点击复用已有服务，使用结束可运行启动包中的 `stop.cmd`。Android 直接导入配置好的订阅链接，不提供 Android 本机启动器。安装、停止、卸载及构建详见 [本地启动器说明](./local-cfdata/README.md)。

## 可选免费家宽链式

在独立的「🏠 免费家宽链式」模块开启并保存，顶部会显示单独的「Clash 家宽订阅」。将它作为配置文件或订阅配置导入 **mihomo / Clash Meta 1.19.25+**，在「🚀 节点选择」中选择「🏠 家宽自动」，也可进入「🏠 家宽节点」手动选择；不要将它作为普通 VLESS 节点链接导入。

链路为客户端 → 当前 CF 节点 → VPN Gate 志愿者共享 OpenVPN 节点 → 目标站，使用 `dialer-proxy`，当前只生成 TCP 链路。它不保证出口是家庭宽带，也不保证稳定性；志愿者节点可能掉线、拥挤或观察经过的流量。默认关闭，不开启时不请求 VPN Gate 清单，普通订阅不受影响。

<a id="environment-variables"></a>

## 环境变量

首次部署优先按上面的四项变量表操作，其余通常可以留空。变量属于对应的生产或预览环境，修改后需要新部署生效。下表中的示例均为占位说明。

| 变量名 | 用途与当前行为 |
| --- | --- |
| `ADMIN` | 后台登录密码，请自行设置长密码；建议以加密变量保存。只填此项不能提供持久化存储。 |
| `CLOUDFLARE_ACCOUNT_ID` | 无原生 `KV` 绑定时使用的账号 ID，必须与 Token 授权账号一致。 |
| `CLOUDFLARE_API_TOKEN` | 无原生绑定时使用的 Token 完整值，需 Workers KV Storage 编辑权限；必须加密保存。 |
| `KV_NAMESPACE_NAME` | 新项目自定的固定、专用名称，如 `forkedgetunnel-myproject-production-KV`；自动创建或复用，预览环境使用另一名称。 |
| `KV_NAMESPACE_ID` | 使用原数据时填写原命名空间 ID；优先于名称，不自动替换失效 ID。与名称二选一即可。 |
| `KEY` | 可选的快速订阅路径密钥，也参与默认 UUID 派生；自定值可通过 `/<KEY的值>` 获取节点，应当作为凭据保管。 |
| `UUID` | 可选的有效 UUIDv4，用来固定节点凭据；未填写或格式无效时按 `ADMIN` 与 `KEY` 派生。 |
| `HOST` | 可选的节点主机名覆盖，首个主机参与订阅 Token 派生；一般留空使用访问域名，不要填写带路径的网页 URL。 |
| `PROXYIP` | 可选的反代地址覆盖；面板新配置的初始值是 `proxyip.cmliussss.net`，不代表该公共服务始终可用。 |
| `EDT_PAGES_URL` | 可选的外部面板根地址，不含 `/admin`。本教程的同仓库 Pages 部署应留空；指定外部面板可能缺少本 fork 的 UI 功能。 |
| `URL` | 可选的公开回退页面 URL，也支持 `nginx`、`1101` 特殊值；留空时普通访问和无效传输请求返回普通 404。外部页面以 GET 获取，不转发请求凭据和正文。 |
| `GO2SOCKS5` | 标准链式代理模式的目标域名匹配名单，逗号分隔，支持通配符，`*` 表示所有目标。需配合已配置的链式代理使用。 |
| `DEBUG` | `1` 或 `true` 开启调试日志；默认关闭。 |
| `OFF_LOG` | `1` 或 `true` 关闭本项目的 KV 请求日志，不代表关闭 Cloudflare 平台日志。 |
| `PRELOAD_RACE_DIAL` | `1` 或 `true` 开启预加载竞速拨号；默认关闭，不保证一定加速。 |
| `TCP_CONCURRENT_DIAL` | 默认 `2`；未显式设置时，中国移动网络会自动降为 `1`，显式设置后不自动降路数。 |
| `PROXY_CONCURRENT_DIAL` | 反代并发拨号数，默认 `1`；增加并发会增加连接尝试，不保证更快。 |

兼容变量 `BEST_SUB` 仅供特定上游优选生成器请求使用，还会检查请求参数及 User-Agent；普通订阅和本教程无需设置它。布尔开关按字符串 `1` / `true` 识别。

### 修改密码、UUID 与订阅链接

- 未固定有效 `UUID` 时，UUID 根据 `ADMIN` 与 `KEY` **确定性派生**；更改它们可能使现有节点凭据失效，并非每次随机生成。
- 设置有效 `UUID` 后，修改 `ADMIN` / `KEY` 不再改变该 UUID。订阅 Token 还取决于主机名，即使 UUID 固定，访问域名或 `HOST` 改变也可能改变链接。
- 修改后从面板重新复制链接并更新客户端；存储名称 / ID 应继续保持原值，不要通过换 KV 来轮换凭据。

### 路径中的链式参数

通常直接在面板中设置反代并生成链接即可。手动配置时，当前解析器也支持以下路径形式（地址和凭据需替换为自己的）：

```text
/proxyip=proxy.example.net:443
/?proxyip=proxy.example.net:443
/socks5=user:password@proxy.example.net:1080
/socks5://user:password@proxy.example.net:1080
/http=user:password@proxy.example.net:8080
/http://user:password@proxy.example.net:8080
```

`socks5=` / `http=` 使用标准模式，`socks5://` / `http://` 使用对应协议的全局模式。这里的代理由 Cloudflare 运行环境连接，填 `127.0.0.1` 不会连接到你的 Windows 电脑；本机 CFData 和 Clash 控制接口则是浏览器访问本机的独立功能。

<a id="maintenance"></a>

## 升级与排错

Pages 关联的是你自己的 GitHub 仓库和生产分支。更新代码后，检查 Pages 新部署是否成功，再刷新管理页面；客户端仍需更新订阅。持续使用同一 KV 名称 / ID，不要删除旧命名空间。不要直接用上游 `_worker.js` 或面板覆盖本 fork：那会丢失本版本修改；同步上游时需要审查冲突及功能差异。

| 现象 | 检查方法 |
| --- | --- |
| 首页 404 | 未设置 `URL` 时属于预期行为，后台入口是 `/admin`。 |
| “尚未配置持久化存储” | 按 [已有项目补救步骤](#existing-pages-recovery) 检查四项变量、生产/预览环境及新部署；普通文本变量 `KV` 不是原生绑定。 |
| 存储请求失败或 503 | 查看具体错误，核对 Token 权限、账号及有效期；失败不能当作已保存，不要删除原 KV。 |
| 优选库可见，但在线初筛失败 | 库不依赖线路检测；在线检测依赖第三方服务。可重试或使用本地方式，保留实际错误，不代表本机必然无网络。 |
| 已导入优选，但订阅没变 | 确认使用自定义订阅模式并保存，再在客户端更新订阅。 |
| 本地优选点击无反应 | 确认已在 Windows 安装启动包并允许浏览器唤起；按 [启动器说明](./local-cfdata/README.md) 排查端口及启动日志。 |
| 在线有速度，客户端连接超时 | 在线测试没有验证本项目的 TLS/ECH、WS、UUID 或代理出口；用客户端日志或本地 Clash 实测定位失败阶段。 |
| Cloudflare Error 1101 | 查看该次请求的运行异常及日志。上游同名更新已纳入，但不能仅凭版本标题认定全部 1101 已解决，详见 [开发记录](./DEVELOPMENT.md)。 |

反馈问题时提供版本/提交、部署环境、操作步骤、错误文字、HTTP 状态码和变量**名称**即可；请遮盖密码、Token、Cookie、节点凭据及完整订阅链接。

## 来源、许可证与开发记录

- Worker 与网页基于上游 `edgetunnel`，继续使用 [GNU GPL-2.0](./LICENSE)。本 fork 修改记录见 [DEVELOPMENT.md](./DEVELOPMENT.md)；[CHANGELOG](./CHANGELOG) 保留上游记录，不是完整的 fork 更新日志。
- 独立 Windows 启动器 `local-cfdata` 使用 [GPL-3.0-or-later](./local-cfdata/LICENSE)，CFData-WEB 来源、对应源码与构建见 [组件说明](./local-cfdata/README.md)。
- 上游历史引用及本 fork 的组件来源见 [ACKNOWLEDGEMENTS.md](./ACKNOWLEDGEMENTS.md)。第三方组件、数据和外部服务遵循各自许可证或条款。

使用者应遵守适用法律及平台服务条款。软件按许可证提供，不承诺网络可用率、隐私或代理不可识别性。
