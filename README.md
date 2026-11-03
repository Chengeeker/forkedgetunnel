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
- 🛠️ **部署灵活**：完整适配 CF Workers 及 CF Pages (GitHub / 上传)，仓库已内置管理面板，Pages 部署无需再创建第二个项目。
- 🔄 **订阅系统**：内置自动订阅生成及混淆转换，适配主流客户端（Clash, Sing-box, Surge 等）。
- ⚡ **性能加速**：支持自定义 ProxyIP、SOCKS5/HTTP 链式代理及优选 API，优化网络延迟。
- 🏠 **可选家宽链式**：可在管理面板生成仅供 mihomo / Clash Meta 使用的 VPN Gate 志愿者节点链式订阅；它不保证住宅属性或稳定性，默认关闭。
- 🌐 **多台适配**：完美适配 Windows, Android, iOS, MacOS 及各种软路由固件。

---

## 💡 快速部署
>[!TIP]
> 📖 **详尽图文教程**：[edgetunnel 部署指南](https://cmliussss.com/p/edt2/)

>[!WARNING]
> ⚠️ **Error 1101问题**：[视频解析](https://www.youtube.com/watch?v=r4uVTEJptdE)

### ⚙️ Workers 部署

<details>
<summary><code><strong>「 Workers 部署文字教程 」</strong></code></summary>

1. 部署 CF Worker：
   - 在 CF Worker 控制台中创建一个新的 Worker。
   - 将 [worker.js](https://github.com/Chengeeker/forkedgetunnel/blob/main/_worker.js) 的内容粘贴到 Worker 编辑器中。
   - 在左侧的 `设置`选项卡中，选择 `变量` > `添加变量`。
     变量名称填写**ADMIN**，值则为你的管理员密码，后点击 `保存`即可。

2. 绑定 KV 命名空间：
   - 在 `绑定`选项卡中选择 `添加绑定 +` > `KV 命名空间` > `添加绑定`，然后选择一个已有的命名空间或创建一个新的命名空间进行绑定。
   - `变量名称`填写**KV**，然后点击 `添加绑定`即可。
   - 也可不添加原生绑定，改为按下方环境变量表填写账号、API Token 和固定的 `KV_NAMESPACE_NAME`，由程序首次使用配置时自动准备存储。

3. 给 Workers绑定 自定义域： 
   - 在 workers控制台的 `触发器`选项卡，下方点击 `添加自定义域`。
   - 填入你已转入 CF 域名解析服务的次级域名，例如:`vless.google.com`后 点击`添加自定义域`，等待证书生效即可。

4. 访问后台：
   - 访问 `https://vless.google.com/admin` 输入管理员密码即可登录后台。

</details>

### 🛠 Pages 上传部署方法（手动绑定 KV） [图文教程](https://cmliussss.com/p/edt2/)

<details>
<summary><code><strong>「 Pages 上传文件部署文字教程 」</strong></code></summary>

1. 部署 CF Pages：
   - 下载 [main.zip](https://github.com/Chengeeker/forkedgetunnel/archive/refs/heads/main.zip) 文件，并点上 Star !!!
   - 在 CF Pages 控制台中选择 `上传资产`后，为你的项目取名后点击 `创建项目`，然后上传你下载好的 [main.zip](https://github.com/Chengeeker/forkedgetunnel/archive/refs/heads/main.zip) 文件后点击 `部署站点`。
   - 部署完成后点击 `继续处理站点` 后，选择 `设置` > `环境变量` > **制作**为生产环境定义变量 > `添加变量`。
     变量名称填写**ADMIN**，值则为你的管理员密码，后点击 `保存`即可。
   - 返回 `部署` 选项卡，在右下角点击 `创建新部署` 后，重新上传 [main.zip](https://github.com/Chengeeker/forkedgetunnel/archive/refs/heads/main.zip) 文件后点击 `保存并部署` 即可。

2. 绑定 KV 命名空间：
   - 在 `设置`选项卡中选择 `绑定` > `+ 添加` > `KV 命名空间`，然后选择一个已有的命名空间或创建一个新的命名空间进行绑定。
   - `变量名称`填写**KV**，然后点击 `保存`后重试部署即可。

3. 给 Pages绑定 CNAME自定义域：[视频教程](https://www.youtube.com/watch?v=LeT4jQUh8ok&t=851s)
   - 在 Pages控制台的 `自定义域`选项卡，下方点击 `设置自定义域`。
   - 填入你的自定义次级域名，注意不要使用你的根域名，例如：
     您分配到的域名是 `fuck.cloudns.biz`，则添加自定义域填入 `lizi.fuck.cloudns.biz`即可；
   - 按照 CF 的要求将返回你的域名DNS服务商，添加 该自定义域 `lizi`的 CNAME记录 `forkedgetunnel.pages.dev` 后，点击 `激活域`即可。
   
4. 访问后台：
   - 访问 `https://lizi.fuck.cloudns.biz/admin` 输入管理员密码即可登录后台。

</details>

### 🛠 Pages + GitHub 部署方法（首次填变量，无需手动绑定 KV）

<details>
<summary><code><strong>「 Pages + GitHub 部署文字教程 」</strong></code></summary>

1. 部署 CF Pages：
   - 在 Github 上先 Fork 本项目，并点上 Star !!!
   - 在 CF Pages 控制台中选择 `连接到 Git` 后，选中你自己的 `forkedgetunnel` 仓库，进入构建设置。框架选择 `None`，构建命令填写 `node scripts/prepare-pages.cjs`，构建输出目录填写 `dist`，根目录保留仓库根目录；使用 V2 或更新的构建系统及 Node.js 20 或以上版本。
   - 在**首次保存并部署前**添加以下环境变量。无需在这个页面创建绑定，也不要新增名为 `KV` 的普通文本变量：

     | 变量 | 内容 |
     | --- | --- |
     | `ADMIN` | 管理员密码，建议加密保存 |
     | `CLOUDFLARE_ACCOUNT_ID` | 当前 Pages 项目所在账号的 Account ID |
     | `CLOUDFLARE_API_TOKEN` | 加密保存的 API Token，限定当前账号，包含 **Workers KV Storage：Edit** 权限 |
     | `KV_NAMESPACE_NAME` | 本项目固定的存储名称，例如 `forkedgetunnel-myproject-production-KV`；程序自动创建或复用该名称的命名空间 |

   - Token 必须由账号所有者预先授权；仓库代码无法自行获得创建资源的权限。不要使用或提交 Global API Key。预览环境使用不同的名称，例如 `forkedgetunnel-myproject-preview-KV`，以免修改生产数据。名称不要随域名、管理员密码或部署批次改变，否则会选到另一份配置。
   - **已有数据时优先填写 `KV_NAMESPACE_ID` 为原命名空间 ID，代替按名称新建**。上一个构建脚本已创建过资源的，也可填它的原 ID，或把 `KV_NAMESPACE_NAME` 填为它的准确名称。
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

</details>

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
