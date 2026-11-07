<!--
forkedgetunnel is a modified fork of the upstream edgetunnel project.
Upstream source: https://github.com/cmliu/edgetunnel
Fork modifications and additions by Chengeeker, 2026-09-30.
The project's own source and fork modifications are distributed under the
GNU General Public License, version 2. See LICENSE for the complete text.
-->

# 🚀 forkedgetunnel 2.1
![后台页面](./img.png)

[![Stars](https://img.shields.io/github/stars/Chengeeker/forkedgetunnel?style=flat-square&logo=github)](https://github.com/Chengeeker/forkedgetunnel/stargazers)
[![Forks](https://img.shields.io/github/forks/Chengeeker/forkedgetunnel?style=flat-square&logo=github)](https://github.com/Chengeeker/forkedgetunnel/network/members)
[![License](https://img.shields.io/github/license/Chengeeker/forkedgetunnel?style=flat-square)](https://github.com/Chengeeker/forkedgetunnel/blob/main/LICENSE)
[![Telegram](https://img.shields.io/badge/Telegram-Group-blue?style=flat-square&logo=telegram)](https://t.me/+FA4BSZ0P0uQwZDI1)
[![YouTube](https://img.shields.io/badge/YouTube-Channel-red?style=flat-square&logo=youtube)](https://www.youtube.com/watch?v=LeT4jQUh8ok)
[![zread](https://img.shields.io/badge/Ask_Zread-_.svg?style=flat-square&color=00b0aa&labelColor=000000&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQuOTYxNTYgMS42MDAxSDIuMjQxNTZDMS44ODgxIDEuNjAwMSAxLjYwMTU2IDEuODg2NjQgMS42MDE1NiAyLjI0MDFWNC45NjAxQzEuNjAxNTYgNS4zMTM1NiAxLjg4ODEgNS42MDAxIDIuMjQxNTYgNS42MDAxSDQuOTYxNTZDNS4zMTUwMiA1LjYwMDEgNS42MDE1NiA1LjMxMzU2IDUuNjAxNTYgNC45NjAxVjIuMjQwMUM1LjYwMTU2IDEuODg2NjQgNS4zMTUwMiAxLjYwMDEgNC45NjE1NiAxLjYwMDFaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00Ljk2MTU2IDEwLjM5OTlIMi4yNDE1NkMxLjg4ODEgMTAuMzk5OSAxLjYwMTU2IDEwLjY4NjQgMS42MDE1NiAxMS4wMzk5VjEzLjc1OTlDMS42MDE1NiAxNC4xMTM0IDEuODg4MSAxNC4zOTk5IDIuMjQxNTYgMTQuMzk5OUg0Ljk2MTU2QzUuMzE1MDIgMTQuMzk5OSA1LjYwMTU2IDE0LjExMzQgNS42MDE1NiAxMy43NTk5VjExLjAzOTlDNS42MDE1NiAxMC42ODY0IDUuMzE1MDIgMTAuMzk5OSA0Ljk2MTU2IDEwLjM5OTlaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik0xMy43NTg0IDEuNjAwMUgxMS4wMzg0QzEwLjY4NSAxLjYwMDEgMTAuMzk4NCAxLjg4NjY0IDEwLjM5ODQgMi4yNDAxVjQuOTYwMUMxMC4zOTg0IDUuMzEzNTYgMTAuNjg1IDUuNjAwMSAxMS4wMzg0IDUuNjAwMUgxMy43NTg0QzE0LjExMTkgNS42MDAxIDE0LjM5ODQgNS4zMTM1NiAxNC4zOTg0IDQuOTYwMVYyLjI0MDFDMTQuMzk4NCAxLjg4NjY0IDE0LjExMTkgMS42MDAxIDEzLjc1ODQgMS42MDAxWiIgZmlsbD0iI2ZmZiIvPgo8cGF0aCBkPSJNNCAxMkwxMiA0TDQgMTJaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00IDEyTDEyIDQiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K&logoColor=ffffff)](https://zread.ai/cmliu/edgetunnel)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/cmliu/edgetunnel)

---

## 📖 项目简介

**forkedgetunnel** 是一个基于 CF Workers/Pages 平台的边缘计算隧道解密方案。它能够高效地处理网络流量，并提供强大的管理面板和灵活的节点配置能力。

- 🖥️ **Demo 演示站点**：[https://EDT-Pages.github.io/admin](https://EDT-Pages.github.io/admin)

### ✨ 核心特性

- 🛡️ **协议支持**：支持 VLESS、Trojan、Shadowsocks 等主流协议，深度集成加密传输。
- 📊 **管理面板**：内置可视化后台，支持实时配置修改、日志查看及流量统计。
- 🛠️ **Pages + GitHub 部署**：仓库已内置管理面板，首次部署前填齐配置变量，首次使用后台配置时自动准备存储。
- 🔄 **订阅系统**：内置自动订阅生成及混淆转换，适配主流客户端（Clash, Sing-box, Surge 等）。
- ⚡ **性能加速**：支持自定义 ProxyIP、SOCKS5/HTTP 链式代理及优选 API，优化网络延迟。
- 🏠 **可选家宽链式**：可在管理面板生成仅供 mihomo / Clash Meta 使用的 VPN Gate 志愿者节点链式订阅；它不保证住宅属性或稳定性，默认关闭。
- 🌐 **多台适配**：完美适配 Windows, Android, iOS, MacOS 及各种软路由固件。

---

## 💡 快速部署

本 README 只保留 [Pages 关联 GitHub 的部署教程](#pages-github-setup)。先准备账号 ID、API Token 和固定的存储名称，在**首次保存并部署前**与 `ADMIN` 一起填齐，再发布项目，首次使用配置时自动准备 KV。

**已经部署且只填了 `ADMIN` 的项目，请看 [已有项目补救步骤](#existing-pages-recovery)。** 补加变量后仍需重新部署，这属于旧部署缺少配置的补救流程，不是新项目的首次部署步骤。

>[!WARNING]
> ⚠️ **Error 1101问题**：[视频解析](https://www.youtube.com/watch?v=r4uVTEJptdE)

<a id="pages-github-setup"></a>

### 🛠 Pages + GitHub 部署方法（首次填变量，无需手动绑定 KV）

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
   - 在 Github 上先 Fork 本项目，并点上 Star !!!
   - 在 CF Pages 控制台中选择 `连接到 Git` 后，选中你自己的 `forkedgetunnel` 仓库，进入构建设置。框架选择 `None`，构建命令填写 `node scripts/prepare-pages.cjs`，构建输出目录填写 `dist`，根目录保留仓库根目录；使用 V2 或更新的构建系统及 Node.js 20 或以上版本。
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

3. 给 Pages绑定 CNAME自定义域：[视频教程](https://www.youtube.com/watch?v=LeT4jQUh8ok&t=851s)
   - 在 Pages控制台的 `自定义域`选项卡，下方点击 `设置自定义域`。
   - 填入你的自定义次级域名，注意不要使用你的根域名，例如：
     您分配到的域名是 `fuck.cloudns.biz`，则添加自定义域填入 `lizi.fuck.cloudns.biz`即可；
   - 按照 CF 的要求将返回你的域名DNS服务商，添加 该自定义域 `lizi`的 CNAME记录 `forkedgetunnel.pages.dev` 后，点击 `激活域`即可。

4. 访问后台：
   - 访问 `https://lizi.fuck.cloudns.biz/admin` 输入管理员密码即可登录后台。
   - 进入后台后修改一个设置并保存，重新打开后台确认仍被保留，即可检查存储是否工作。不要用“能打开登录页”来判断 KV 已创建，因为登录页不调用存储 API。

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

---

## 🌐 在线优选 IP 和域名

1. 在“在线优选域名”外部站点复制结果，回到“在线优选 IP”，粘贴到**待选列表（IP / 域名）**。支持每行一个 `example.com`、`example.com:443#备注`，也可混合 IPv4、IPv6、CIDR 和 IP 区间；域名未指定端口时默认使用 443（高级设置指定其他端口时使用该端口）。
2. 点击 **HTTPS 初筛**。域名通过 Cloudflare DNS（失败时尝试 Google DNS）的 A / AAAA 记录解析后，最多尝试四个地址，取首个可测地址继续现有测速流程；同一轮复用解析结果。结果会标注“域名解析 IP”，延迟和下载速度代表当时解析到的 IP 经优选服务的路径，不等于域名自身网页、以后 DNS 结果或完整代理连接的性能。
3. 对初筛结果执行**一键测速**，点击延迟或速度表头排序，勾选需要的结果（可全选），点击 **导入到优选列表**。原域名和端口会追加到管理面板的“自定义优选地址”；检查后按面板原有方式保存配置。

IP 库独立于线路检测显示。**CF 官方网段 v4/v6（内置）**可直接导入，网段快照核对日期为 2026-11-07，来源为 [Cloudflare IPv4](https://www.cloudflare.com/ips-v4) 和 [IPv6](https://www.cloudflare.com/ips-v6)。检测失败时仍可编辑、导入和使用本地 Clash 实测；点击 HTTPS 初筛可重试。在线初筛与下载测速仍需至少一个优选服务可访问，失败不会被标成测速成功。

---

## 🏠 可选免费家宽链式

部署完成并登录管理面板后，打开单独的「🏠 免费家宽链式」设置模块，勾选「开启免费家宽链式」并保存，顶部的订阅链接区域会显示单独的「Clash 家宽订阅」。复制这条链接，在 mihomo / Clash Meta 1.19.25+ 中作为配置文件或订阅配置导入；不要把它当作普通 VLESS 节点链接使用。导入后，在「🚀 节点选择」中选择「🏠 家宽自动」即可开始使用，需要手动挑选时再进入「🏠 家宽节点」。这个订阅使用当前 CF 节点作为前置，通过 mihomo 的 `dialer-proxy` 将 TCP OpenVPN 连接转发到 VPN Gate 的公开志愿者节点。

请注意：这里的“免费家宽”不是 Cloudflare 提供的住宅网络，也不保证出口一定是家庭宽带；VPN Gate 节点由志愿者共享，可能掉线、拥挤或属于非住宅网络，运营者也可能观察经过其节点的流量。它只面向 mihomo / Clash Meta 1.19.25 及以上版本，当前只生成 TCP 链路，普通订阅和其他客户端订阅不受影响。不开启时，Worker 不会请求 VPN Gate 节点清单。

---

## 🔑 环境变量说明

| 变量名 | 必填 | 示例 | 详细备注 |
| :--- | :---: | :--- | :--- |
| **ADMIN** | ✅ | `123456` | 后台管理面板登录密码 |
| **KEY** | ❌ | `CMLiussss` | 快速订阅路径密钥，访问 `/CMLiussss` 即可快速获取节点 |
| **UUID** | ❌ | `90cd4a77-141a-43c9-991b-08263cfe9c10` | 强制固定UUID，只支持**UUIDv4**标准格式 |
| **CLOUDFLARE_ACCOUNT_ID** | 无原生 KV 时填写 | 当前账号 ID | 与 API Token 配套，供运行时配置存储使用 |
| **CLOUDFLARE_API_TOKEN** | 无原生 KV 时填写 | 加密变量 | 当前账号的 Workers KV Storage 编辑权限，不填写 Global API Key |
| **KV_NAMESPACE_NAME** | 与 ID 二选一 | `forkedgetunnel-myproject-production-KV` | 固定且项目专用的名称，首次读取配置时自动创建或复用；预览使用另一名称 |
| **KV_NAMESPACE_ID** | 与名称二选一 | 已有命名空间 ID | 保留原数据时填写；优先于名称，不自动替换失效 ID |
| **EDT_PAGES_URL** | ❌ | `https://your-pages.example.com` | 可选的外部管理面板回退地址（不要包含 `/admin`）；合并后的 Pages 部署无需填写，只有在使用普通 Worker 或想切换到外部面板时才需要 |
| **PROXYIP** | ❌ | `proxyip.cmliussss.net` | 全局自定义反代 IP，默认值 |
| **URL** | ❌ | `https://your-public-site.example` | 公开回退页面；留空时普通访问和无效传输请求返回相同的普通 404。可填网页 URL、`nginx` 或 `1101`；无效传输只以 GET 获取外部首页，不转发请求凭据和正文 |
| **GO2SOCKS5** | ❌ | `blog.cmliussss.com`,`*.ip111.cn`,`*google.com` | 强制走 SOCKS5 的名单 (`*` 为全局，域名用逗号分隔) |
| **DEBUG** | ❌ | `1`或`true` | **开发者模式**，默认**关闭**调试日志功能（console.log），设置`1`或`true`则**开启**调试日志功能 |
| **OFF_LOG** | ❌ | `1`或`true` | 默认**开启**KV日志记录功能，设置`1`或`true`则**关闭**日志记录功能 |
| **BEST_SUB** | ❌ | `1`或`true` | 默认**关闭**作为**优选订阅生成器**的功能，设置`1`或`true`则**开启**该功能 |
| **PRELOAD_RACE_DIAL** | ❌ | `1`或`true` | 默认**关闭**作为**预加载竞速拨号**的功能，设置`1`或`true`则**开启**该功能 |
| **TCP_CONCURRENT_DIAL**   | ❌ | `2` | **TCP 并发拨号数**，默认值为`2`；设置后不再根据中国移动网络自动降为单路 |
| **PROXY_CONCURRENT_DIAL** | ❌ | `1` | **反代并发拨号数**，默认值为`1`；数值越高连接速度越快，但 IP 切换也越频繁 |

---

## 🔧 高级实用技巧
如需修改 **订阅地址里的TOKEN** 和 **用于节点验证的UUID** ，可通过修改变量
1. 修改`ADMIN`或`KEY`变量的值，可以随机修改 **订阅地址里的TOKEN** 和 **用于节点验证的UUID**
2. 设置`UUID`变量可以强制固定 **订阅地址里的TOKEN** 和 **用于节点验证的UUID**，注意必须是**UUIDv4**标准格式，否则会导致节点无法使用。

本工具支持通过 **PATH路径** 动态切换底层代理方案：

- 指定 `PROXYIP` 案例
   ```url
   /proxyip=proxyip.cmliussss.net
   /?proxyip=proxyip.cmliussss.net
   ```

- 指定 `SOCKS5` 案例
   ```url
   /socks5=user:password@127.0.0.1:1080
   /?socks5=user:password@127.0.0.1:1080
   /socks://dXNlcjpwYXNzd29yZA==@127.0.0.1:1080 (默认激活全局SOCKS5)
   /socks5://user:password@127.0.0.1:1080 (默认激活全局SOCKS5)
   ```

- 指定 `HTTP代理` 案例
   ```url
   /http=user:password@127.0.0.1:1080
   /http://user:password@127.0.0.1:8080 (默认激活全局SOCKS5)
   ```

- 指定 `Trojan fallback` 案例（由于使用场景为自建对接, 仅 Trojan 入站，fallback 服务需为同密码、非 WebSocket、非 TLS. 此时 UDP 透传给 fallback, 性能优秀, 功能完整）
   ```url
   /trojan=1.1.1.1:1234
   ```

---

## 💻 客户端适配情况

| 平台 | 推荐客户端 |
| :--- | :--- |
| **Windows** | [v2rayN](https://github.com/2dust/v2rayN/releases)、[Hiddify](https://github.com/hiddify/hiddify-app/releases)、[FlClash](https://github.com/chen08209/FlClash/releases)、[mihomo-party](https://github.com/mihomo-party-org/clash-party/releases)、[Clash Verge Rev](https://github.com/clash-verge-rev/clash-verge-rev/releases)、[Clashmi](https://github.com/KaringX/clashmi/releases)、[FlyClash](https://github.com/GtxFury/FlyClash/releases)、[Karing](https://github.com/KaringX/karing/releases)、[Bettbox](https://github.com/appshubcc/Bettbox/releases) |
| **Android** | [v2rayNG](https://github.com/2dust/v2rayNG/releases)、[ClashMetaForAndroid](https://github.com/MetaCubeX/ClashMetaForAndroid/releases/)、[FlClash](https://github.com/chen08209/FlClash/releases)、[Clashmi](https://github.com/KaringX/clashmi/releases)、[Hiddify](https://github.com/hiddify/hiddify-app/releases)、[NekoBox](https://github.com/MatsuriDayo/NekoBoxForAndroid/releases)、[FlyClash](https://github.com/GtxFury/FlyClash/releases)、[Karing](https://github.com/KaringX/karing/releases)、[Bettbox](https://github.com/appshubcc/Bettbox/releases) |
| **iOS** | Surge、Shadowrocket、Stash、[Hiddify](https://github.com/hiddify/hiddify-app/releases)、Loon、Egern、[Clashmi](https://clashmi.app/download)、[Karing](https://karing.app/)、Quantumult X |
| **macOS** | [FlClash](https://github.com/chen08209/FlClash/releases)、[mihomo-party](https://github.com/mihomo-party-org/clash-party/releases)、[Clash Verge Rev](https://github.com/clash-verge-rev/clash-verge-rev/releases)、Surge、[Clashmi](https://clashmi.app/download)、[Karing](https://karing.app/)、[FlyClash](https://github.com/GtxFury/FlyClash/releases) |
| **鸿蒙** | [ClashBox](https://github.com/xiaobaigroup/ClashBox/releases) |
---

## ⭐ 项目热度

![GitHub stars](https://img.shields.io/github/stars/Chengeeker/forkedgetunnel?style=flat-square)

---

## 🙏 特别鸣谢
### 💖 赞助支持 - 提供云服务器维持[订阅转换服务](https://sub.cmliussss.net/)
- [Yuusei Network](https://yuusei.io/)
- [VMRack](https://www.vmrack.net?ref_code=5Zk7eNhbgL7)

### 🛠 开源代码引用
- [zizifn/edgetunnel](https://github.com/zizifn/edgetunnel)
- [3Kmfi6HP/EDtunnel](https://github.com/6Kmfi6HP/EDtunnel)
- [SHIJS1999/cloudflare-worker-vless-ip](https://github.com/SHIJS1999/cloudflare-worker-vless-ip)
- [Stanley-baby](https://github.com/Stanley-baby)
- [ACL4SSR](https://github.com/ACL4SSR/ACL4SSR/tree/master/Clash/config)
- [股神](https://t.me/CF_NAT/38889)
- [Workers/Pages Metrics](https://t.me/zhetengsha/3382)
- [白嫖哥](https://t.me/bestcfipas)
- [Mingyu](https://github.com/ymyuuu/workers-vless)
- [ToiCF/CF-Workers-HTTPS](https://github.com/ToiCF/CF-Workers-HTTPS)
- [ToiCF/CF-Workers-TURN](https://github.com/ToiCF/CF-Workers-TURN)
- [ToiCF/CF-Workers-SoftEther](https://github.com/ToiCF/CF-Workers-SoftEther)
- [eooce](https://github.com/eooce/Cloudflare-proxy)
- [Sukka](https://ip.skk.moe/)
- [zhangtaile](https://github.com/cmliu/edgetunnel/pull/999)
- [1345695](https://github.com/1345695/edcloudwasm)
- [ToiCF/GrainTCP](https://github.com/ToiCF/GrainTCP)
- [xream](https://github.com/cmliu/edgetunnel/pull/1359)

---

## 📄 许可证与修改说明

本仓库是上游 `edgetunnel` 项目的修改版，保留并继续使用 GNU GPL-2.0。当前 fork 的新增和修改内容也按 GPL-2.0 发布；第三方组件、数据和外部服务仍以其各自的许可证或服务条款为准。完整许可证文本见仓库中的 [LICENSE](./LICENSE) 文件。

---

## ⚠️ 免责声明与使用提示

1. 作者建议将本项目用于**教育、科学研究及个人安全测试**；这是一项风险提示，不构成对 GPL-2.0 所授予权利的额外限制。
2. 使用者在下载或使用本项目代码时，必须严格遵守所在地区的法律法规。
3. 上游作者 **cmliu** 对任何滥用本项目代码导致的行为或后果均不承担任何责任。
4. 本项目不对因使用代码引起的任何直接或间接损害负责。
5. 建议在测试完成后及时删除不再需要的相关部署，以减少安全风险；这只是安全建议，不构成许可证条件。

---

**如果您觉得项目对您有帮助，请给一个 Star 🌟，这是对我最大的鼓励！**
