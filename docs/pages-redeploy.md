# Windows 删除重建 Pages 脚本

用于本项目需要“删除原 Pages 项目后重新部署”的使用方式。首次部署仍按 [README](../README.md#pages-github-setup) 完成；**保留现有项目，让脚本读取配置，不要先手动删掉。**

以后运行根目录的 **`redeploy-pages.cmd`**：脚本读取原配置 → 核验原 KV → 保存本地加密备份 → 确认目标 → 删除 Pages 项目 → 重建同名 GitHub 项目 → 恢复配置和域名关联 → 构建生产分支并等待结果。构建在 Cloudflare 执行，电脑不需要安装 Git、Node.js 或 Wrangler。

## 第一次运行

1. [下载当前仓库 ZIP](https://github.com/Chengeeker/forkedgetunnel/archive/refs/heads/main.zip)，完整解压。不要只下载 `.cmd`，它需要同目录的 `scripts/redeploy-pages.ps1`。
2. 为部署脚本准备一个 API Token。按 [新版 Token 创建教程](../README.md#kv-api-token) 进入账号策略，限定到项目所属账号，勾选 **Cloudflare Pages → 编辑** 和 **Workers KV 存储 → 读取**。英文名称为 `Cloudflare Pages → Edit`、`Workers KV Storage → Read`。如果已有同账号 KV 编辑权限，也包含所需读取权限。
3. 双击 `redeploy-pages.cmd`，按提示填写 **Account ID、现有 Pages 项目名、部署 Token**。项目名填控制台名称，例如 `my-tunnel`，不要填写网址。
4. 脚本逐个提示 Cloudflare 中的加密变量，例如生产环境的 `ADMIN`、`CLOUDFLARE_API_TOKEN`。填写它们的**原值**，输入不会明文回显。这些值无法从 Cloudflare 可靠读回；没有原值时直接回车停止，原项目不会删除。普通变量和原生 KV 绑定自动读取。
5. 检查显示的项目、GitHub 仓库、分支、KV ID。输入项目名确认后自动执行余下操作。确认前已检查原 KV 存在，删除前必须成功保存并读回加密备份。

部署 Token 与 Worker 中用于读写 KV 的 `CLOUDFLARE_API_TOKEN` 用途不同：前者只保存在本机，不会写进项目环境变量；后者继续恢复为原值。原有仅 KV 编辑权限的 Token 不能管理 Pages，需另建部署 Token 或为它添加 Pages 编辑权限。

## 后续更新

先把代码更新到 **Pages 原来关联的 GitHub 仓库及生产分支**。如果你关联的是自己的 fork，需要先将新代码同步到自己的仓库；脚本不会修改 GitHub 仓库，也不会上传电脑上的未提交代码。

双击 `redeploy-pages.cmd`，检查目标并输入项目名确认即可。账号、Token 和已备份的密钥无需重复填写；生产/预览的普通变量、原生 KV ID、构建设置、GitHub 来源会重新读取并恢复。仅通过 `KV_NAMESPACE_NAME` 访问存储时，脚本会查找原命名空间并固定其 ID；找不到或存在歧义时停止，不另建一份空 KV。

如果你在 Cloudflare 控制台改过加密变量，脚本无法识别被隐藏的新值，**下次重建前必须刷新本地备份**。在仓库目录打开 PowerShell 执行：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\redeploy-pages.ps1 -RefreshSecrets
```

部署 Token 过期时双击 **`refresh-pages-token.cmd`**，输入新 Token 后继续。存在未完成重建时也可用这个入口更新部署 Token。

## 备份与中断恢复

状态及每次重建前的备份位于 `%LOCALAPPDATA%\forkedgetunnel\PagesRedeploy`，使用 Windows DPAPI 加密，只有原电脑、原 Windows 用户能够解密。脚本不会把明文 Token、密码或项目配置写进仓库，也不会调用 KV 删除、创建或键值写入接口。**这是项目配置备份，不是 KV 数据快照；原 KV 及其内容保留在 Cloudflare。**

- 断网、关闭窗口或创建失败：再次运行普通入口，从记录的步骤恢复；已确认的新项目不会被重复删除。
- 创建请求可能成功但响应丢失：脚本显示发现的新项目 ID，需在控制台核对并输入这个 ID 后继续；不会直接删除这个项目。
- 构建失败：在 Pages 查看构建日志，修复原 GitHub 分支或构建配置，再运行脚本。会重新展示删除重建确认，不把失败当成部署成功。
- 等待超过 15 分钟：保留状态，下一次继续检查该部署。
- 备份损坏或丢失：停止操作，保留备份目录。不要删除剩余项目或 KV 尝试修复。

当前保存一组账号/项目配置。请保留整个备份目录；换电脑需要重新提供密钥，不能把加密文件当作跨电脑密码备份。

## 重建范围与影响

适用于已经关联 GitHub、使用本 README 的原生 KV 或同账号 KV API 存储的 Pages 项目。遇到 D1、R2、Durable Objects、Wrangler 配置托管等未支持的非空配置时，在删除前停止，避免丢失绑定。

删除重建会中断服务，并丢失旧部署历史、旧预览链接和部署挂钩；新项目 ID 会改变。脚本恢复 GitHub 来源、生产分支、构建设置、生产/预览变量、KV 绑定和自定义域名关联。Access、项目外的策略和其他服务集成不在自动恢复范围内，使用这些配置的项目应先另行核对恢复办法。

自定义域名重新关联后，DNS / 证书可能需要等待或在控制台处理；脚本不改 DNS 记录，不承诺无中断切换或一定立即释放同名项目。必须等到部署阶段返回成功才会显示“部署完成”；这也不代替实际代理连接验证。

本地回归覆盖 Windows PowerShell 5.1、加密备份、密钥恢复、KV ID 保留、删除/创建中断恢复、域名恢复和失败部署。尚未在真实 Cloudflare 账号上执行删除重建验收。

接口依据：[项目创建](https://developers.cloudflare.com/api/resources/pages/subresources/projects/methods/create/)、[项目删除](https://developers.cloudflare.com/api/resources/pages/subresources/projects/methods/delete/)、[Git 分支部署](https://developers.cloudflare.com/api/resources/pages/subresources/projects/subresources/deployments/methods/create/)、[域名关联](https://developers.cloudflare.com/api/resources/pages/subresources/projects/subresources/domains/methods/create/)。加密方式见 [Microsoft Export-Clixml 说明](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/export-clixml?view=powershell-5.1)。
