# Windows 初次 / 再次部署 Pages 脚本

双击根目录的 **`redeploy-pages.cmd`**，先选择：

```text
1：初次部署（创建新项目）
2：再次部署（保留 KV，删除并重建已有项目）
```

选 1 会创建新 Pages 项目，自动创建/复用 KV 并绑定；选 2 会先备份原配置，再删除并重建同名项目。**再次部署不要提前手动删除项目。** 选 1 却发现同名项目，或选 2 却找不到项目时，都会停止并提示，不会擅自切换模式。发现未完成的操作时优先恢复，不重新选择，避免丢失恢复记录。

构建在 Cloudflare 执行，电脑不需要安装 Git、Node.js 或 Wrangler。也可以继续使用 [README 的控制台首次部署教程](../README.md#pages-github-setup)。

## 项目名称应该填什么

例如控制台中的项目名称是 **`my-tunnel`**，就只填 **`my-tunnel`**。

| 输入 | 是否正确 |
| --- | --- |
| `my-tunnel` | 正确：小写字母、数字和短横线，最长 58 位 |
| `https://my-tunnel.pages.dev/admin` | 错误：这是完整网址 |
| `my-tunnel.pages.dev` | 错误：这是域名 |
| `My_Tunnel`、`我的项目` | 错误：不能使用大写、下划线或中文 |

初次部署时自己起名；再次部署时看 **Cloudflare → Workers & Pages** 中原项目的名称。它不一定与 GitHub 仓库名相同。格式错误时脚本会提示重新输入；再次部署可直接回车使用本机保存的项目名。

## 第一次运行

1. [下载当前仓库 ZIP](https://github.com/Chengeeker/forkedgetunnel/archive/refs/heads/main.zip)，完整解压。不要只下载 `.cmd`，它需要同目录的 `scripts/redeploy-pages.ps1`。
2. 为部署脚本准备 API Token。按 [新版 Token 创建教程](../README.md#kv-api-token) 进入账号策略，限定到目标账号。**初次部署需要 Cloudflare Pages → 编辑，以及 Workers KV 存储 → 编辑**，用于创建 KV；再次部署只需 Pages 编辑和 KV 读取（已有 KV 编辑权限也可）。英文对应 `Cloudflare Pages → Edit`、`Workers KV Storage → Edit / Read`。
3. 双击脚本，选择 **1 或 2**，按提示填写项目名、Account ID 和部署 Token。已有本地配置时沿用原账号和 Token。
4. 根据下述初次/再次流程补齐信息，检查目标后输入项目名确认，随后自动执行并等待部署结果。

### 账号令牌和个人令牌选哪个

两个入口都可以使用，但它们的列表各自独立：`/profile/api-tokens` 是个人令牌，`/<账号ID>/api-tokens` 是该账号的令牌。README 的逐步教程采用个人入口；已经在账号入口创建的令牌，只要归属和权限符合要求，也可继续使用。官方已列出账号令牌支持 Pages 与 Workers KV，不能把“账号令牌”直接当作 403 的原因。详见 [README 的入口对照](../README.md#kv-api-token) 和 [Cloudflare 官方说明](https://developers.cloudflare.com/fundamentals/api/get-started/account-owned-tokens/)。

授权要包含**项目所属账号**的 **Cloudflare Pages 编辑 / Pages Write**。`Page Rules` 是页面规则，不是 Pages 项目权限；Workers 编辑权限也不能替代 Pages 权限。个人令牌从用户权限中获得授权，账号令牌也受创建者能够授予的权限范围限制。[Pages 权限说明](https://developers.cloudflare.com/workers/authorization/workers/#cloudflare-pages)

### 选择 1：初次部署

先确保自己的 fork 仓库已在 Cloudflare 的 GitHub 应用授权范围内。首次连接 GitHub 需在 Cloudflare 控制台完成授权；API Token 不能代替 GitHub 授权，脚本不会替你登录 GitHub。

脚本接着询问：

- **GitHub 用户名/仓库名**：例如 `your-name/forkedgetunnel`，不要填完整网址；使用包含本 fork 代码和构建脚本的仓库。
- **部署分支**：一般直接回车使用 `main`。
- **后台 ADMIN 密码**：输入两次确认，以加密变量写入新项目。
- **原 KV 命名空间 ID**：有旧数据时填写原 ID；没有则回车，脚本按固定名称 `forkedgetunnel-项目名-production-KV` 查找，存在则复用，不存在才创建。

脚本在创建 Pages 项目时直接提供名称为 `KV` 的原生绑定，无需再去控制台补绑，也无需把部署 Token 放进 Worker 的环境变量。新项目默认只开启生产分支部署，避免预览环境与生产配置混用。自定义域名可在首次成功后按 README 添加。

### 选择 2：再次部署

脚本读取原配置，逐个询问尚无本地备份的加密变量，例如 `ADMIN`、运行时 `CLOUDFLARE_API_TOKEN`。填写它们的**原值**；输入不明文回显。这些值无法从 Cloudflare 可靠读回，没有原值时直接回车停止，原项目不会删除。普通变量、原生 KV 绑定、GitHub 来源和构建设置自动读取。

确认前检查原 KV 存在；删除前成功保存并读回加密备份，再删除项目、重建、恢复配置/域名关联和部署代码。再次部署不会创建或删除 KV。

部署 Token 与 Worker 中用于读写 KV 的 `CLOUDFLARE_API_TOKEN` 用途不同：前者只保存在本机，不会写进项目环境变量；后者继续恢复为原值。原有仅 KV 编辑权限的 Token 不能管理 Pages，需另建部署 Token 或为它添加 Pages 编辑权限。

## 后续更新

先把代码更新到 **Pages 原来关联的 GitHub 仓库及生产分支**。如果你关联的是自己的 fork，需要先将新代码同步到自己的仓库；脚本不会修改 GitHub 仓库，也不会上传电脑上的未提交代码。

双击 `redeploy-pages.cmd`，选择 **2**，回车沿用原项目名，再检查目标并确认即可。账号、Token 和已备份的密钥无需重复填写；生产/预览的普通变量、原生 KV ID、构建设置、GitHub 来源会重新读取并恢复。仅通过 `KV_NAMESPACE_NAME` 访问存储时，脚本会查找原命名空间并固定其 ID；找不到或存在歧义时停止，不另建一份空 KV。

如果你在 Cloudflare 控制台改过加密变量，脚本无法识别被隐藏的新值，**下次重建前必须刷新本地备份**。在仓库目录打开 PowerShell 执行：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\redeploy-pages.ps1 -RefreshSecrets
```

部署 Token 过期时双击 **`refresh-pages-token.cmd`**，输入新 Token 后继续。存在未完成重建时也可用这个入口更新部署 Token。

## HTTP 403 / 10000 与 KV ID 错误的区别

脚本先读取 Pages 项目，再检查 KV。如果刚输入 Token、打印目标项目后就出现 `HTTP 403，错误码 10000`，表示**读取 Pages 项目的请求被拒绝**；此时尚未检查 KV ID，也未删除项目。不要通过换 KV ID 或删除命名空间来处理。

按下面顺序核对：

1. 实际输入的完整 Token 是否就是刚修改权限的那一条；不要混用两个入口下的同名令牌，不要粘贴 Token ID 或 Global API Key。
2. 该令牌是否包含 **Cloudflare Pages 编辑 / Pages Write**，资源范围是否包含输入的 **Account ID**。只增加 KV 权限不能授权 Pages。
3. 令牌是否已生效、过期、被撤销，或有不匹配的客户端 IP 限制。部署脚本从本机网络发出请求，运行时 KV API 则从 Cloudflare 发出，两个调用来源不同。
4. 若重新生成或改用了另一条 Token，通过 `refresh-pages-token.cmd` 更新本机保存的值；如果是这条令牌本身的权限调整，不需要更换 KV ID。

`403 / 10000` 本身不足以判定上述哪一项有误；新版错误会标明是 Pages 还是 KV 接口失败，不显示敏感响应。若明确提示“KV ID 格式不正确”，才检查原命名空间 ID 是否为 32 位十六进制字符串。旧版本还存在将 `kv_namespaces: null` 当成一个空 ID 的误判，本版已修复，未设置原生绑定时会正常检查运行时 KV 配置。

## 备份与中断恢复

状态及每次重建前的备份位于 `%LOCALAPPDATA%\forkedgetunnel\PagesRedeploy`，使用 Windows DPAPI 加密，只有原电脑、原 Windows 用户能够解密。脚本不会把明文 Token、密码或项目配置写进仓库，不调用 KV 删除或键值写入接口；仅初次部署且无匹配原存储时创建 KV。**这是项目配置备份，不是 KV 数据快照；原 KV 及其内容保留在 Cloudflare。**

- 断网、关闭窗口或创建失败：再次运行普通入口，从记录的步骤恢复；已确认的新项目不会被重复删除。
- 初次创建 KV 后中断：再次运行按固定名称找回原 ID，继续创建项目，不重复新建存储。权限不足时可用 `refresh-pages-token.cmd` 更换 Token 后继续。
- 创建请求可能成功但响应丢失：脚本显示发现的新项目 ID，需在控制台核对并输入这个 ID 后继续；不会直接删除这个项目。
- 构建失败：在 Pages 查看构建日志，修复原 GitHub 分支或构建配置，再运行脚本。会重新展示删除重建确认，不把失败当成部署成功。
- 等待超过 15 分钟：保留状态，下一次继续检查该部署。
- 备份损坏或丢失：停止操作，保留备份目录。不要删除剩余项目或 KV 尝试修复。

当前保存一组账号/项目配置。请保留整个备份目录；换电脑需要重新提供密钥，不能把加密文件当作跨电脑密码备份。

## 适用范围与重建影响

两种模式均使用已获 Cloudflare 授权的 GitHub 仓库。初次自动配置原生 KV；再次部署兼容原生 KV 或本 README 的同账号 KV API 存储。遇到 D1、R2、Durable Objects、Wrangler 配置托管等未支持的非空配置时，在删除前停止，避免丢失绑定。

删除重建会中断服务，并丢失旧部署历史、旧预览链接和部署挂钩；新项目 ID 会改变。脚本恢复 GitHub 来源、生产分支、构建设置、生产/预览变量、KV 绑定和自定义域名关联。Access、项目外的策略和其他服务集成不在自动恢复范围内，使用这些配置的项目应先另行核对恢复办法。

自定义域名重新关联后，DNS / 证书可能需要等待或在控制台处理；脚本不改 DNS 记录，不承诺无中断切换或一定立即释放同名项目。必须等到部署阶段返回成功才会显示“部署完成”；这也不代替实际代理连接验证。

本地回归覆盖 Windows PowerShell 5.1、1/2 选择、项目名格式、选错模式不修改项目、首次 KV 创建/复用及中断恢复，并继续覆盖加密备份、密钥恢复、KV ID 保留、删除/创建中断恢复、域名恢复和失败部署。尚未在真实 Cloudflare 账号上执行首次创建或删除重建验收。

接口依据：[项目创建](https://developers.cloudflare.com/api/resources/pages/subresources/projects/methods/create/)、[项目删除](https://developers.cloudflare.com/api/resources/pages/subresources/projects/methods/delete/)、[Git 分支部署](https://developers.cloudflare.com/api/resources/pages/subresources/projects/subresources/deployments/methods/create/)、[域名关联](https://developers.cloudflare.com/api/resources/pages/subresources/projects/subresources/domains/methods/create/)。加密方式见 [Microsoft Export-Clixml 说明](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/export-clixml?view=powershell-5.1)。
