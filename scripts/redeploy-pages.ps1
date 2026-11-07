# SPDX-License-Identifier: GPL-2.0
# Windows PowerShell 5.1; save with UTF-8 BOM.
param([switch]$RefreshSecrets, [switch]$RefreshToken)
$ErrorActionPreference = 'Stop'

function 转为明文([Security.SecureString]$值) {
    return [Net.NetworkCredential]::new('', $值).Password
}

function 保存部署状态($路径, $状态) {
    $密文 = ConvertTo-SecureString ($状态 | ConvertTo-Json -Depth 100 -Compress) -AsPlainText -Force
    $临时路径 = "$路径.new"
    $密文 | Export-Clixml -LiteralPath $临时路径 -Encoding UTF8
    # Read back before replacing the previous recoverable state.
    $校验 = 转为明文 (Import-Clixml -LiteralPath $临时路径)
    if (-not ($校验 | ConvertFrom-Json).account) { throw '本地加密备份校验失败，已停止。' }
    Move-Item -LiteralPath $临时路径 -Destination $路径 -Force
}

function 读取部署状态($路径) {
    try { return (转为明文 (Import-Clixml -LiteralPath $路径) | ConvertFrom-Json) }
    catch { throw '无法读取本地加密备份。请使用原 Windows 用户和电脑，不要删除备份后重试。' }
}

function 调用CF接口($状态, [string]$方法, [string]$路径, $内容 = $null, [switch]$表单) {
    if ($状态.account -notmatch '^[a-fA-F0-9]{32}$' -or $状态.name -notmatch '^[a-z0-9][a-z0-9-]{0,57}$') { throw '账号 ID 或项目名格式不正确。' }
    if ($状态.token -notmatch '^[A-Za-z0-9_-]{20,256}$') { throw '部署 Token 格式不正确。' }
    $项目前缀 = "/accounts/$($状态.account)/pages/projects"
    if (-not $路径.StartsWith("/accounts/$($状态.account)/")) { throw '接口账号不匹配。' }
    if ($方法 -eq 'DELETE' -and $路径 -cne "$项目前缀/$($状态.name)") { throw '禁止删除项目之外的资源。' }
    if ($方法 -notin @('GET', 'POST', 'DELETE')) { throw '不支持的接口操作。' }
    Add-Type -AssemblyName System.Net.Http
    $处理器 = [Net.Http.HttpClientHandler]::new()
    $处理器.AllowAutoRedirect = $false
    $客户端 = [Net.Http.HttpClient]::new($处理器)
    $客户端.Timeout = [TimeSpan]::FromSeconds(45)
    $请求 = [Net.Http.HttpRequestMessage]::new([Net.Http.HttpMethod]::new($方法), "https://api.cloudflare.com/client/v4$路径")
    $请求.Headers.Authorization = [Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer', $状态.token)
    if ($表单) {
        $请求.Content = [Net.Http.MultipartFormDataContent]::new()
        $请求.Content.Add([Net.Http.StringContent]::new([string]$内容), 'branch')
    } elseif ($null -ne $内容) {
        $请求.Content = [Net.Http.StringContent]::new(($内容 | ConvertTo-Json -Depth 100 -Compress), [Text.Encoding]::UTF8, 'application/json')
    }
    try {
        try { $响应 = $客户端.SendAsync($请求).GetAwaiter().GetResult() }
        catch { throw 'Cloudflare 请求超时或网络失败，结果可能尚未确认。备份已保留，请再次运行恢复。' }
        $状态码 = [int]$响应.StatusCode
        try { $数据 = $响应.Content.ReadAsStringAsync().GetAwaiter().GetResult() | ConvertFrom-Json }
        catch { $数据 = $null }
        if (-not $响应.IsSuccessStatusCode -or $null -eq $数据 -or $数据.success -ne $true) {
            $错误码 = @($数据.errors | ForEach-Object { if ([string]$_.code -match '^\d+$') { [string]$_.code } }) -join ','
            $错误 = [Exception]::new("Cloudflare API 失败（HTTP $状态码，错误码 $错误码）。请检查部署 Token 权限或控制台；未输出响应中的凭据。")
            $错误.Data['status'] = $状态码
            throw $错误
        }
        return $数据.result
    } finally {
        if ($响应) { $响应.Dispose() }
        $请求.Dispose(); $客户端.Dispose()
    }
}

function 获取现有项目($状态) {
    try { return 调用CF接口 $状态 GET "/accounts/$($状态.account)/pages/projects/$($状态.name)" }
    catch { if ($_.Exception.Data['status'] -eq 404) { return $null }; throw }
}

function 补齐配置密钥($项目, $原计划, [switch]$刷新) {
    foreach ($环境 in @('production', 'preview')) {
        $配置 = $项目.deployment_configs.$环境
        foreach ($变量 in @($配置.env_vars.PSObject.Properties)) {
            if (-not $变量) { continue }
            if ($变量.Value.type -notin @('plain_text','secret_text')) { throw '发现未知环境变量类型，尚未删除项目。' }
            if ($变量.Value.type -eq 'plain_text' -and $null -eq $变量.Value.value) { throw '普通变量值无法读取，尚未删除项目。' }
            if ($变量.Value.type -ne 'secret_text') { continue }
            $已有 = $原计划.deployment_configs.$环境.env_vars.($变量.Name).value
            if ($刷新 -or [string]::IsNullOrEmpty($已有)) {
                Write-Host "请填写 $环境 环境中 $($变量.Name) 的原值；Cloudflare 的密钥无法可靠读回。"
                $已有 = 转为明文 (Read-Host '原密钥（输入隐藏，直接回车则停止）' -AsSecureString)
            }
            if ([string]::IsNullOrEmpty($已有)) { throw '缺少可恢复的密钥，尚未删除项目。' }
            $变量.Value | Add-Member -NotePropertyName value -NotePropertyValue $已有 -Force
        }
    }
}

function 检查原KV($状态, $项目) {
    if (-not $项目.deployment_configs.production) { throw '缺少生产环境配置，尚未删除项目。' }
    $已检查 = @{}
    foreach ($环境 in @('production', 'preview')) {
        $配置 = $项目.deployment_configs.$环境
        if (-not $配置) { continue }
        $命名空间列表 = @($配置.kv_namespaces.PSObject.Properties | ForEach-Object { $_.Value.namespace_id })
        $变量 = $配置.env_vars
        if (-not $配置.kv_namespaces.KV) {
            $存储账号 = [string]$变量.CLOUDFLARE_ACCOUNT_ID.value
            $存储ID = [string]$变量.KV_NAMESPACE_ID.value
            $存储名称 = [string]$变量.KV_NAMESPACE_NAME.value
            if ($环境 -eq 'production' -or $存储ID -or $存储名称) {
                if ($存储账号 -ne $状态.account) { throw "$环境 的 KV 账号缺失或不同，本脚本只支持同账号恢复。" }
                if ([string]::IsNullOrEmpty($变量.CLOUDFLARE_API_TOKEN.value)) { throw "$环境 缺少运行时 KV Token，尚未删除项目。" }
                if (-not $存储ID) {
                    if (-not $存储名称) { throw "$环境 未配置原 KV，不能保证保留数据，尚未删除项目。" }
                    $匹配 = @()
                    for ($页 = 1; $页 -le 100; $页++) {
                        $列表 = @(调用CF接口 $状态 GET "/accounts/$($状态.account)/storage/kv/namespaces?page=$页&per_page=100")
                        $匹配 += @($列表 | Where-Object { $_.title -ceq $存储名称 })
                        if ($列表.Count -lt 100) { break }
                        if ($页 -eq 100) { throw 'KV 列表超出检查范围，尚未删除项目。' }
                    }
                    if ($匹配.Count -ne 1) { throw "$环境 的原 KV 名称不存在或不唯一，尚未删除项目。" }
                    $存储ID = $匹配[0].id
                    # Pin the resolved ID so a later rename cannot silently select empty storage.
                    $变量 | Add-Member -NotePropertyName KV_NAMESPACE_ID -NotePropertyValue ([pscustomobject]@{type='plain_text'; value=$存储ID}) -Force
                }
                $命名空间列表 += $存储ID
            }
        }
        foreach ($命名空间 in $命名空间列表) {
            if ($命名空间 -notmatch '^[a-fA-F0-9]{32}$') { throw 'KV ID 无效，尚未删除项目。' }
            if (-not $已检查.ContainsKey($命名空间)) {
                $null = 调用CF接口 $状态 GET "/accounts/$($状态.account)/storage/kv/namespaces/$命名空间"
                $已检查[$命名空间] = $true
            }
        }
    }
    return @($已检查.Keys)
}

function 生成重建计划($项目) {
    if ($项目.source.type -ne 'github' -or -not $项目.source.config.repo_name -or -not $项目.production_branch) {
        throw '当前脚本仅支持已关联 GitHub 的 Pages 项目，尚未删除项目。'
    }
    # Only configurations documented by the create API are copied. Unknown bindings stop deletion.
    $允许配置 = @('env_vars','kv_namespaces','compatibility_date','compatibility_flags','always_use_latest_compatibility_date','build_image_major_version','fail_open','usage_model','limits','placement')
    foreach ($环境 in @('production', 'preview')) {
        if (-not $项目.deployment_configs.$环境) { continue }
        foreach ($字段 in @($项目.deployment_configs.$环境.PSObject.Properties)) {
            if ($null -eq $字段.Value) { $项目.deployment_configs.$环境.PSObject.Properties.Remove($字段.Name); continue }
            if ($字段.Name -in $允许配置) { continue }
            if ($null -ne $字段.Value -and ($字段.Value | ConvertTo-Json -Compress) -notin @('{}','[]','""','false')) {
                throw "发现未支持的项目配置 $环境/$($字段.Name)，尚未删除项目。"
            }
            $项目.deployment_configs.$环境.PSObject.Properties.Remove($字段.Name)
        }
    }
    return [pscustomobject]@{
        name=$项目.name; production_branch=$项目.production_branch; source=$项目.source
        build_config=$项目.build_config; deployment_configs=$项目.deployment_configs
    }
}

function 等待部署完成($状态, $状态路径) {
    $接口 = "/accounts/$($状态.account)/pages/projects/$($状态.name)"
    if (-not $状态.deploymentId) {
        # Recover a deployment already started by project creation or a timed-out POST.
        $部署列表 = @(调用CF接口 $状态 GET "$接口/deployments?per_page=20")
        $部署 = $部署列表 | Where-Object { $_.environment -eq 'production' } | Select-Object -First 1
        if (-not $部署) { $部署 = 调用CF接口 $状态 POST "$接口/deployments" $状态.plan.production_branch -表单 }
        if (-not $部署.id) { throw '未取得部署 ID；恢复记录已保存。' }
        $状态.deploymentId = $部署.id
        保存部署状态 $状态路径 $状态
    }
    $截止时间 = [DateTime]::UtcNow.AddMinutes(15)
    do {
        $部署 = 调用CF接口 $状态 GET "$接口/deployments/$($状态.deploymentId)"
        $阶段 = $部署.latest_stage
        Write-Host "部署状态：$($阶段.name) / $($阶段.status)"
        if ($阶段.status -in @('failure','canceled','skipped') -or $部署.is_skipped) {
            $状态.phase = 'failed'
            保存部署状态 $状态路径 $状态
            throw '构建未成功。请在 Pages 查看日志并修复 GitHub 代码/配置；再次运行会重新展示删除重建确认。'
        }
        if ($阶段.name -eq 'deploy' -and $阶段.status -eq 'success') { return }
        Start-Sleep -Seconds 8
    } while ([DateTime]::UtcNow -lt $截止时间)
    throw '等待部署超过 15 分钟，尚未确认成功；再次运行将继续检查，不会再次删除项目。'
}

function 执行重建($状态, $状态路径) {
    $接口 = "/accounts/$($状态.account)/pages/projects/$($状态.name)"
    $当前 = 获取现有项目 $状态
    if ($状态.phase -eq 'prepared') {
        if ($当前 -and $当前.id -ne $状态.oldId) { throw '同名项目 ID 已变化，停止删除。' }
        if ($当前) { $null = 调用CF接口 $状态 DELETE $接口 }
        $状态.phase = 'deleted'
        保存部署状态 $状态路径 $状态
        $当前 = $null
    }
    if ($状态.phase -eq 'deleted') {
        if ($当前) {
            if ($当前.id -eq $状态.oldId -or $当前.source.config.repo_name -cne $状态.plan.source.config.repo_name -or $当前.source.config.owner -cne $状态.plan.source.config.owner) {
                throw '同名项目与待恢复的新项目不匹配，停止，不删除它。'
            }
            Write-Host "发现可能因上次响应丢失而未记录的新项目 ID：$($当前.id)"
            if ((Read-Host '请在控制台核对后输入该新项目 ID 以继续恢复；其他输入停止') -cne $当前.id) { throw '尚未确认恢复目标，停止。' }
            $新项目 = $当前
        } else { $新项目 = 调用CF接口 $状态 POST "/accounts/$($状态.account)/pages/projects" $状态.plan }
        if (-not $新项目.id) { throw '未取得新项目 ID，停止。' }
        $状态.newId = $新项目.id
        $状态.phase = 'created'
        保存部署状态 $状态路径 $状态
    }
    $当前 = 获取现有项目 $状态
    if ($当前.id -ne $状态.newId) { throw '重建后的项目 ID 不匹配，停止恢复。' }
    foreach ($环境 in @('production','preview')) {
        $期望 = $状态.plan.deployment_configs.$环境
        if (-not $期望) { continue }
        foreach ($绑定 in @($期望.kv_namespaces.PSObject.Properties)) {
            if (-not $绑定) { continue }
            if ($当前.deployment_configs.$环境.kv_namespaces.($绑定.Name).namespace_id -ne $绑定.Value.namespace_id) { throw '重建后的 KV 绑定不一致，停止。' }
        }
        foreach ($变量 in @($期望.env_vars.PSObject.Properties)) {
            if (-not $变量) { continue }
            $实际 = $当前.deployment_configs.$环境.env_vars.($变量.Name)
            if (-not $实际 -or $实际.type -ne $变量.Value.type -or ($变量.Value.type -eq 'plain_text' -and $实际.value -cne $变量.Value.value)) { throw "重建后的 $环境 环境变量不一致，停止。" }
        }
    }
    foreach ($域名 in $状态.domains) {
        if ($域名 -notin $当前.domains) { $null = 调用CF接口 $状态 POST "$接口/domains" @{name=$域名} }
    }
    等待部署完成 $状态 $状态路径
    $状态.phase = 'complete'
    保存部署状态 $状态路径 $状态
    Write-Host "部署完成：https://$($当前.subdomain)/admin"
    if ($状态.domains.Count) { Write-Host '已恢复自定义域名关联；证书/DNS 生效状态请在 Pages 自定义域中查看。' }
}

function 启动重建程序 {
    if ($env:OS -ne 'Windows_NT') { throw '此入口仅支持 Windows。' }
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $目录 = Join-Path $env:LOCALAPPDATA 'forkedgetunnel\PagesRedeploy'
    $null = New-Item -ItemType Directory -Path $目录 -Force
    $状态路径 = Join-Path $目录 'state.clixml'
    if (Test-Path -LiteralPath $状态路径) {
        $状态 = 读取部署状态 $状态路径
        if ($RefreshToken) {
            $新令牌 = 转为明文 (Read-Host '新的部署 API Token（输入隐藏）' -AsSecureString)
            if ($新令牌 -notmatch '^[A-Za-z0-9_-]{20,256}$') { throw '新 Token 格式不正确，原备份未改动。' }
            $状态.token = $新令牌
            保存部署状态 $状态路径 $状态
        }
    } else {
        $状态 = [pscustomobject]@{
            account=(Read-Host 'Cloudflare Account ID').Trim(); name=(Read-Host '原 Pages 项目名（不是完整域名）').Trim()
            token=(转为明文 (Read-Host '部署 API Token（Pages 编辑 + Workers KV 读取，输入隐藏）' -AsSecureString))
            phase='new'; oldId=$null; newId=$null; deploymentId=$null; plan=$null; domains=@()
        }
    }
    if ($状态.phase -notin @('new','prepared','deleted','created','complete','failed') -or ($状态.plan -and $状态.plan.name -cne $状态.name)) { throw '恢复记录不一致，停止。' }
    if ($RefreshSecrets -and $状态.phase -notin @('new','complete','failed')) { throw '存在未完成重建，请先用普通入口恢复；不要在恢复中途替换配置密钥。' }
    Write-Host "目标 Pages 项目：$($状态.name)"
    if ($状态.phase -in @('new','complete','failed')) {
        $项目 = 获取现有项目 $状态
        if (-not $项目) { throw '未找到原项目及恢复计划。请先按 README 完成首次部署，不要手动删除原项目。' }
        补齐配置密钥 $项目 $状态.plan -刷新:$RefreshSecrets
        $存储列表 = 检查原KV $状态 $项目
        $计划 = 生成重建计划 $项目
        Write-Host "GitHub 来源：$($计划.source.config.owner)/$($计划.source.config.repo_name)，分支：$($计划.production_branch)"
        Write-Host "保留 KV：$($存储列表 -join ', ')"
        Write-Host '即将删除并重建同名 Pages 项目。期间服务中断，旧部署历史和部署挂钩不会保留。'
        Write-Host '自定义域名会重新关联，DNS 记录不改动，证书可能需要等待重新签发。'
        Write-Host '恢复范围为下述 Git 构建、环境变量、KV 与域名关联；Access 等项目外策略需另行核对。'
        if ((Read-Host '确认继续请输入项目名；其他输入取消') -cne $状态.name) { Write-Host '已取消，原项目未删除。'; return }
        $状态.plan = $计划; $状态.domains = @($项目.domains | Where-Object { $_ -notlike '*.pages.dev' })
        $状态.oldId = $项目.id; $状态.newId = $null; $状态.deploymentId = $null; $状态.phase = 'prepared'
        保存部署状态 $状态路径 $状态
        Copy-Item -LiteralPath $状态路径 -Destination (Join-Path $目录 ("backup-" + [DateTime]::UtcNow.ToString('yyyyMMddHHmmssfff') + '.clixml'))
    } else { Write-Host '发现未完成操作，将从加密备份继续，不重复删除已确认的新项目。' }
    执行重建 $状态 $状态路径
}

if ($MyInvocation.InvocationName -ne '.') {
    $锁 = [Threading.Mutex]::new($false, 'Local\forkedgetunnel-pages-redeploy')
    $已加锁 = $false
    try {
        try { $已加锁 = $锁.WaitOne(0) } catch [Threading.AbandonedMutexException] { $已加锁 = $true }
        if (-not $已加锁) { throw '已有部署程序正在运行。' }
        启动重建程序
    } catch {
        Write-Host "操作停止：$($_.Exception.Message)" -ForegroundColor Red
        exit 1
    } finally { if ($已加锁) { $锁.ReleaseMutex() }; $锁.Dispose() }
}
