# SPDX-License-Identifier: GPL-2.0
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../scripts/redeploy-pages.ps1')
function Assert($值, $消息) { if (-not $值) { throw $消息 } }
function Throws($执行, $文本) {
    try { & $执行 } catch { Assert ($_.Exception.Message -like "*$文本*") "Unexpected: $($_.Exception.Message)"; return }
    throw "Expected failure: $文本"
}
function Project {
    return (@{
        id='old-project'; name='demo'; production_branch='main'; subdomain='demo.pages.dev'; domains=@('demo.pages.dev','demo.example.com')
        source=@{type='github'; config=@{owner='owner'; repo_name='repo'; production_branch='main'}}
        build_config=@{build_command='node scripts/prepare-pages.cjs'; destination_dir='dist'}
        deployment_configs=@{
            production=@{env_vars=@{ADMIN=@{type='secret_text'; value='MASKED'}}; kv_namespaces=@{KV=@{namespace_id=('b'*32)}}; compatibility_date='2025-11-04'}
            preview=@{env_vars=@{DEBUG=@{type='plain_text'; value='false'}}; kv_namespaces=@{KV=@{namespace_id=('c'*32)}}}
        }
    } | ConvertTo-Json -Depth 20 | ConvertFrom-Json)
}
function State {
    return [pscustomobject]@{account=('a'*32); name='demo'; token=('x'*40); phase='prepared'; oldId='old-project'; newId=$null; deploymentId=$null; plan=$null; domains=@('demo.example.com')}
}
$临时目录 = Join-Path $PSScriptRoot ('../tmp/redeploy-test-' + [guid]::NewGuid().ToString('N'))
$null = New-Item -ItemType Directory -Path $临时目录 -Force
$文件 = Join-Path $临时目录 'state.clixml'
$状态 = State
$状态.plan = 生成重建计划 (Project)
保存部署状态 $文件 $状态
$读回 = 读取部署状态 $文件
Assert ($读回.token -ceq $状态.token) 'DPAPI roundtrip failed'
Assert (-not (Get-Content -LiteralPath $文件 -Raw).Contains($状态.token)) 'Token stored in cleartext'
$错误状态 = State
Throws { 调用CF接口 $错误状态 DELETE "/accounts/$($错误状态.account)/storage/kv/namespaces/$('b'*32)" } '禁止删除'
$错误状态.account='https://invalid.example'
Throws { 调用CF接口 $错误状态 GET '/bad' } '格式不正确'
$权限错误 = 生成接口错误 GET "/accounts/$('a'*32)/pages/projects/demo" 403 @(10000,'secret-response')
Assert ($权限错误.Data['status'] -eq 403) 'HTTP status was lost'
Assert ($权限错误.Message.Contains('读取 Pages 项目配置') -and $权限错误.Message.Contains('不是 KV ID 格式错误')) 'Pages failure misclassified as KV'
Assert (-not $权限错误.Message.Contains('secret-response') -and -not $权限错误.Message.Contains(('a'*32))) 'API details leaked'
$KV权限错误 = 生成接口错误 GET "/accounts/$('a'*32)/storage/kv/namespaces" 403 @(10000)
Assert ($KV权限错误.Message.Contains('KV 读取权限') -and -not $KV权限错误.Message.Contains('Pages 编辑')) 'KV permission guidance is wrong'
Assert ((生成接口错误 GET '/accounts/example/pages/projects/demo' 404 @(8000007)).Data['status'] -eq 404) 'Not-found status was lost'
$域名错误 = 生成接口错误 DELETE '/accounts/example/pages/projects/demo' 400 @(8000028)
Assert ($域名错误.Message.Contains('需先解除关联') -and -not $域名错误.Message.Contains('检查对应接口的权限')) 'Custom domain prerequisite was hidden'
Assert ((生成接口错误 DELETE '/accounts/example/pages/projects/demo/domains/demo.example.com' 403 @(10000)).Message.Contains('解除 Pages 自定义域名关联')) 'Domain request misclassified as project deletion'
$范围状态=State
$项目路径="/accounts/$($范围状态.account)/pages/projects/demo"
检查删除范围 $范围状态 $项目路径
检查删除范围 $范围状态 "$项目路径/domains/demo.example.com"
foreach ($拒绝路径 in @("$项目路径/domains/other.example.com", "$项目路径/domains/demo.pages.dev", "$项目路径/deployments/example", "$项目路径/domains/demo.example.com?force=true", "$项目路径/domains/demo.example.com/../other.example.com", "/accounts/$($范围状态.account)/pages/projects/other/domains/demo.example.com")) {
    Throws { 检查删除范围 $范围状态 $拒绝路径 } '禁止删除'
}
$范围状态.domains=@('../escape.example.com')
Throws { 检查删除范围 $范围状态 "$项目路径/domains/..%2Fescape.example.com" } '禁止删除'
$范围状态=State; $范围状态.phase='created'
Throws { 检查删除范围 $范围状态 "$项目路径/domains/demo.example.com" } '禁止删除'
$项目 = Project
$项目.deployment_configs.production | Add-Member d1_databases @{DB=@{id='existing'}}
Throws { 生成重建计划 $项目 } '未支持'
$项目 = Project
$项目.source.type='gitlab'
Throws { 生成重建计划 $项目 } '仅支持'
function Read-Host { param($Prompt, [switch]$AsSecureString); if ($AsSecureString) { return (ConvertTo-SecureString 'original-admin' -AsPlainText -Force) }; return 'no' }
$项目 = Project
补齐配置密钥 $项目 $null
Assert ($项目.deployment_configs.production.env_vars.ADMIN.value -ceq 'original-admin') 'Secret mask was reused'
$缓存计划 = 生成重建计划 $项目
function Read-Host { throw 'Unexpected secret prompt' }
补齐配置密钥 (Project) $缓存计划
function Read-Host { param($Prompt, [switch]$AsSecureString); return ([Security.SecureString]::new()) }
Throws { 补齐配置密钥 (Project) $null } '缺少可恢复'
$项目=Project
$项目.deployment_configs.PSObject.Properties.Remove('preview')
$null=生成重建计划 $项目
function Read-Host { throw 'Unexpected prompt' }

# Stub the only HTTP boundary: the suite never contacts Cloudflare or mutates a real account.
$script:请求 = [Collections.Generic.List[string]]::new()
$script:远端 = Project
$script:拒绝创建 = $false
$script:丢失删除响应 = $false
$script:部署失败 = $false
$script:拒绝Pages = $false
$script:拒绝域名 = $false
$script:丢失域名响应 = $false
$script:读取域名后替换项目 = $false
$script:命名空间 = @([pscustomobject]@{id=('b'*32); title='stable-KV'})
$script:丢失KV响应 = $false
function 调用CF接口 {
    param($状态, [string]$方法, [string]$路径, $内容=$null, [switch]$表单)
    $script:请求.Add("$方法 $路径")
    $基础="/accounts/$($状态.account)/pages/projects/demo"
    if ($路径 -like '*/storage/kv/namespaces[?]*') { return $script:命名空间 }
    if ($方法 -eq 'POST' -and $路径 -like '*/storage/kv/namespaces') {
        $新存储=[pscustomobject]@{id=('f'*32); title=$内容.title}
        $script:命名空间 += $新存储
        if ($script:丢失KV响应) { $script:丢失KV响应=$false; throw 'lost KV response' }
        return $新存储
    }
    if ($路径 -like '*/storage/kv/namespaces/*') { return @{id=$路径.Split('/')[-1]} }
    if ($方法 -eq 'GET' -and $路径 -eq $基础) {
        if ($script:拒绝Pages) { throw (生成接口错误 $方法 $路径 403 @(10000)) }
        return $script:远端
    }
    if ($方法 -eq 'GET' -and $路径 -eq "$基础/domains") {
        $列表=@($script:远端.domains | Where-Object { $_ -notlike '*.pages.dev' } | ForEach-Object { @{name=$_} })
        if ($script:读取域名后替换项目) { $script:远端.id='unrelated-project' }
        return $列表
    }
    if ($方法 -eq 'DELETE' -and $路径.StartsWith("$基础/domains/")) {
        检查删除范围 $状态 $路径
        $备份=读取部署状态 $文件
        Assert ($备份.phase -eq 'prepared') 'Domain detached before encrypted backup'
        foreach ($现有域名 in @($script:远端.domains | Where-Object { $_ -notlike '*.pages.dev' })) {
            Assert ($现有域名 -in $备份.domains) 'Domain missing from saved recovery plan'
        }
        if ($script:拒绝域名) { throw (生成接口错误 $方法 $路径 403 @(10000)) }
        $域名=[Uri]::UnescapeDataString($路径.Split('/')[-1])
        $script:远端.domains=@($script:远端.domains | Where-Object { $_ -cne $域名 })
        if ($script:丢失域名响应) { $script:丢失域名响应=$false; throw 'lost domain response' }
        return $null
    }
    if ($方法 -eq 'DELETE') {
        Assert ($路径 -eq $基础) 'Deleted non-project resource'
        Assert ((读取部署状态 $文件).phase -eq 'prepared') 'Delete happened before encrypted backup'
        if (@($script:远端.domains | Where-Object { $_ -notlike '*.pages.dev' }).Count) { throw (生成接口错误 $方法 $路径 400 @(8000028)) }
        $script:远端=$null
        if ($script:丢失删除响应) { $script:丢失删除响应=$false; throw 'lost delete response' }
        return $null
    }
    if ($方法 -eq 'POST' -and $路径 -eq "/accounts/$($状态.account)/pages/projects") {
        if ($script:拒绝创建) { throw 'create rejected' }
        $script:远端=Project; $script:远端.id='new-project'; $script:远端.domains=@('demo.pages.dev')
        $script:远端.deployment_configs=$内容.deployment_configs
        return $script:远端
    }
    if ($路径 -like '*/domains') { $script:远端.domains+= $内容.name; return @{name=$内容.name} }
    if ($路径 -like '*/deployments[?]*') { return @() }
    if ($方法 -eq 'POST' -and $路径 -like '*/deployments') { Assert $表单 'Missing multipart'; Assert ($内容 -eq 'main') 'Wrong branch'; return @{id='deployment'} }
    if ($路径 -like '*/deployments/deployment') { return @{latest_stage=@{name='deploy'; status=$(if ($script:部署失败) {'failure'} else {'success'})}; is_skipped=$false} }
    throw "Unexpected request: $方法 $路径"
}
$项目=Project
$原ID=@(检查原KV (State) $项目)
Assert ($原ID.Count -eq 2) 'Native KV not verified for both environments'
$项目.deployment_configs.production.kv_namespaces=[pscustomobject]@{}
$项目.deployment_configs.production.env_vars | Add-Member CLOUDFLARE_ACCOUNT_ID @{type='plain_text';value=('a'*32)}
$项目.deployment_configs.production.env_vars | Add-Member KV_NAMESPACE_NAME @{type='plain_text';value='stable-KV'}
$项目.deployment_configs.production.env_vars | Add-Member CLOUDFLARE_API_TOKEN @{type='secret_text';value='runtime-kv-token'}
$null=检查原KV (State) $项目
Assert ($项目.deployment_configs.production.env_vars.KV_NAMESPACE_ID.value -eq ('b'*32)) 'Runtime KV not pinned'
$项目.deployment_configs.production.kv_namespaces=$null
Assert (@(检查原KV (State) $项目).Count -eq 2) 'Null native KV treated as an invalid ID'
$项目.deployment_configs.production.PSObject.Properties.Remove('kv_namespaces')
Assert (@(检查原KV (State) $项目).Count -eq 2) 'Missing native KV treated as an invalid ID'
$项目.deployment_configs.preview.kv_namespaces=$null
Assert (@(检查原KV (State) $项目).Count -eq 1) 'Empty preview binding became an invalid ID'
$畸形项目=Project
$畸形项目.deployment_configs.production.kv_namespaces.KV.namespace_id=''
Throws { 检查原KV (State) $畸形项目 } '缺少 namespace_id'
$项目.deployment_configs.production.env_vars.CLOUDFLARE_ACCOUNT_ID.value=('d'*32)
Throws { 检查原KV (State) $项目 } '不同'
$script:拒绝Pages=$true
$请求数=$script:请求.Count
Throws { 获取现有项目 (State) } '读取 Pages 项目配置'
Assert ($script:请求.Count -eq $请求数+1) 'Pages denial proceeded to KV or mutation'
$script:拒绝Pages=$false

$状态=State; $状态.plan=$缓存计划
保存部署状态 $文件 $状态
执行重建 $状态 $文件
Assert ($状态.phase -eq 'complete') 'Rebuild did not complete'
Assert ($script:远端.domains -contains 'demo.example.com') 'Custom domain not restored'
Assert ($script:远端.deployment_configs.production.env_vars.ADMIN.value -eq 'original-admin') 'ADMIN not restored'
Assert (@($script:请求 | Where-Object { $_ -like 'DELETE *' }).Count -eq 2) 'Expected one domain detach and one project delete'

# The provider rejects project deletion while domains are attached; failed/uncertain detaches must resume safely.
$状态=State; $状态.plan=$缓存计划; $script:远端=Project; $script:拒绝域名=$true
保存部署状态 $文件 $状态
$项目删除数=@($script:请求 | Where-Object { $_ -eq "DELETE $项目路径" }).Count
Throws { 执行重建 $状态 $文件 } '解除 Pages 自定义域名关联'
Assert ((读取部署状态 $文件).phase -eq 'prepared') 'Domain rejection lost prepared checkpoint'
Assert ($script:远端.id -eq 'old-project' -and $script:远端.domains -contains 'demo.example.com') 'Domain rejection mutated project'
Assert (@($script:请求 | Where-Object { $_ -eq "DELETE $项目路径" }).Count -eq $项目删除数) 'Project deletion continued after domain rejection'
$script:拒绝域名=$false
执行重建 (读取部署状态 $文件) $文件
Assert ($script:远端.domains -contains 'demo.example.com') 'Domain rejection recovery lost domain'

$状态=State; $状态.plan=$缓存计划; $script:远端=Project; $script:远端.domains += 'second.example.com'; $script:丢失域名响应=$true
保存部署状态 $文件 $状态
Throws { 执行重建 $状态 $文件 } 'lost domain response'
$中断状态=读取部署状态 $文件
Assert ($中断状态.phase -eq 'prepared' -and $中断状态.domains.Count -eq 2) 'Partial detach lost domain recovery set'
Assert ($script:远端.id -eq 'old-project' -and $script:远端.domains -notcontains 'demo.example.com') 'Lost domain response not simulated'
$已解除次数=@($script:请求 | Where-Object { $_ -eq "DELETE $项目路径/domains/demo.example.com" }).Count
执行重建 $中断状态 $文件
Assert (@($script:请求 | Where-Object { $_ -eq "DELETE $项目路径/domains/demo.example.com" }).Count -eq $已解除次数) 'Detached domain was deleted again'
Assert ($script:远端.domains -contains 'demo.example.com' -and $script:远端.domains -contains 'second.example.com') 'Partial detach recovery lost a domain'

$状态=State; $状态.plan=$缓存计划; $script:远端=Project; $script:读取域名后替换项目=$true
保存部署状态 $文件 $状态
$删除数=@($script:请求 | Where-Object { $_ -like 'DELETE *' }).Count
Throws { 执行重建 $状态 $文件 } '停止解除域名关联'
Assert (@($script:请求 | Where-Object { $_ -like 'DELETE *' }).Count -eq $删除数) 'Domain detach touched a replacement project'
$script:读取域名后替换项目=$false

$状态=State; $状态.plan=$缓存计划; $script:远端=Project; $script:远端.domains += '../escape.example.com'
保存部署状态 $文件 $状态
Throws { 执行重建 $状态 $文件 } '禁止删除'
Assert (@($script:请求 | Where-Object { $_ -like 'DELETE *' }).Count -eq $删除数) 'Malformed domain caused partial deletion'

$状态=State; $状态.plan=$缓存计划; $状态.domains=@($null); $script:远端=Project; $script:远端.domains=@('demo.pages.dev')
保存部署状态 $文件 $状态
执行重建 $状态 $文件
Assert ($状态.phase -eq 'complete' -and $状态.domains.Count -eq 0) 'Empty legacy domain list failed recovery'
Assert (@($script:请求 | Where-Object { $_ -like 'DELETE *' }).Count -eq ($删除数+1)) 'Empty domain list detached a domain'

$状态=State; $状态.plan=$缓存计划; $script:远端=Project; $script:拒绝创建=$true
保存部署状态 $文件 $状态
Throws { 执行重建 $状态 $文件 } 'create rejected'
Assert ((读取部署状态 $文件).phase -eq 'deleted') 'Delete checkpoint lost'
$删除数=@($script:请求 | Where-Object { $_ -like 'DELETE *' }).Count
$script:拒绝创建=$false
执行重建 (读取部署状态 $文件) $文件
Assert (@($script:请求 | Where-Object { $_ -like 'DELETE *' }).Count -eq $删除数) 'Recovery repeated deletion'

$状态=State; $状态.plan=$缓存计划; $script:远端=Project; $script:丢失删除响应=$true
保存部署状态 $文件 $状态
Throws { 执行重建 $状态 $文件 } 'lost delete response'
$删除数=@($script:请求 | Where-Object { $_ -like 'DELETE *' }).Count
执行重建 (读取部署状态 $文件) $文件
Assert (@($script:请求 | Where-Object { $_ -like 'DELETE *' }).Count -eq $删除数) 'Uncertain delete repeated'

$状态=State; $状态.plan=$缓存计划; $script:远端=Project; $script:远端.id='unrelated-project'
保存部署状态 $文件 $状态
Throws { 执行重建 $状态 $文件 } 'ID 已变化'
$状态=State; $状态.plan=$缓存计划; $script:远端=Project; $script:部署失败=$true
保存部署状态 $文件 $状态
Throws { 执行重建 $状态 $文件 } '构建未成功'
Assert ((读取部署状态 $文件).phase -eq 'failed') 'Failed build incorrectly completed'
$script:部署失败=$false
$script:远端=Project
$script:远端.id='new-project'
$状态=State; $状态.plan=$缓存计划; $状态.phase='created'; $状态.newId='new-project'; $状态.deploymentId='deployment'
$script:远端.deployment_configs=$缓存计划.deployment_configs
保存部署状态 $文件 $状态
$删除数=@($script:请求 | Where-Object { $_ -like 'DELETE *' }).Count
执行重建 (读取部署状态 $文件) $文件
Assert (@($script:请求 | Where-Object { $_ -like 'DELETE *' }).Count -eq $删除数) 'Created checkpoint repeated deletion'
$状态.phase='created'
$script:远端.deployment_configs.production.kv_namespaces.KV.namespace_id=('e'*32)
$状态.plan=生成重建计划 (Project)
保存部署状态 $文件 $状态
Throws { 执行重建 $状态 $文件 } 'KV 绑定不一致'

# Interactive choices are exercised with queued answers, without touching the user's saved profile.
$script:回答=[Collections.Generic.Queue[object]]::new()
function Read-Host {
    param($Prompt, [switch]$AsSecureString)
    if (-not $script:回答.Count) { throw "Unexpected prompt: $Prompt" }
    $答案=$script:回答.Dequeue()
    if ($AsSecureString) { return (ConvertTo-SecureString $答案 -AsPlainText -Force) }
    return $答案
}
foreach ($答案 in @('3','1')) { $script:回答.Enqueue($答案) }
Assert ((选择部署方式) -eq '1') 'Initial menu choice failed'
foreach ($答案 in @('https://demo.pages.dev/admin','demo.pages.dev','Demo','my_demo','我的项目','demo')) { $script:回答.Enqueue($答案) }
Assert ((输入项目名称) -ceq 'demo') 'Project name validation failed'
$script:回答.Enqueue('')
Assert ((输入项目名称 'demo') -ceq 'demo') 'Existing name default failed'
$状态=State
foreach ($答案 in @('owner/repo','','new-admin','new-admin','')) { $script:回答.Enqueue($答案) }
$首次计划=输入首次部署计划 $状态
Assert ($首次计划.deployment_configs.production.env_vars.ADMIN.value -ceq 'new-admin') 'Initial password missing'
Assert (-not $首次计划.deployment_configs.production.env_vars.CLOUDFLARE_API_TOKEN) 'Deploy token leaked into runtime'
Assert ($首次计划.source.config.preview_deployment_setting -eq 'none') 'Preview must not share production storage'
Assert ($首次计划.build_config.build_command -eq 'node scripts/prepare-pages.cjs') 'Wrong build command'
$状态.plan=$首次计划; $状态.oldId=$null; $状态.phase='initializing'; $状态.domains=@(); $script:远端=$null
保存部署状态 $文件 $状态
$删除数=@($script:请求 | Where-Object { $_ -like 'DELETE *' }).Count
执行重建 $状态 $文件
Assert ($状态.phase -eq 'complete') 'Initial deploy did not complete'
Assert ($script:远端.deployment_configs.production.kv_namespaces.KV.namespace_id -eq ('f'*32)) 'Initial native KV not bound'
Assert (@($script:请求 | Where-Object { $_ -like 'DELETE *' }).Count -eq $删除数) 'Initial deployment deleted a project'
$状态.phase='initializing'
Throws { 执行重建 $状态 $文件 } '同名项目已存在'

$script:远端=$null; $状态.kvId=''; $script:命名空间=@(); $script:丢失KV响应=$true
保存部署状态 $文件 $状态
Throws { 执行重建 $状态 $文件 } 'lost KV response'
$KV创建数=@($script:请求 | Where-Object { $_ -like 'POST */storage/kv/namespaces' }).Count
执行重建 (读取部署状态 $文件) $文件
Assert (@($script:请求 | Where-Object { $_ -like 'POST */storage/kv/namespaces' }).Count -eq $KV创建数) 'Lost response created another namespace'

$状态.phase='initializing'; $状态.kvId=('b'*32); $script:远端=$null
保存部署状态 $文件 $状态
执行重建 $状态 $文件
Assert ($状态.plan.deployment_configs.production.kv_namespaces.KV.namespace_id -eq ('b'*32)) 'Explicit existing KV replaced'
Assert (@($script:请求 | Where-Object { $_ -like 'POST */storage/kv/namespaces' }).Count -eq $KV创建数) 'Explicit KV ID created new storage'

$原应用数据=$env:LOCALAPPDATA
try {
    $env:LOCALAPPDATA=$临时目录
    foreach ($答案 in @('1','demo',('a'*32),('x'*40))) { $script:回答.Enqueue($答案) }
    Throws { 启动重建程序 } '同名项目已经存在'
    $script:远端=$null
    foreach ($答案 in @('2','demo',('a'*32),('x'*40))) { $script:回答.Enqueue($答案) }
    Throws { 启动重建程序 } '找不到这个项目'
    Assert (@($script:请求 | Where-Object { $_ -like 'DELETE *' }).Count -eq $删除数) 'Wrong mode caused deletion'
    $文件=Join-Path $临时目录 'forkedgetunnel/PagesRedeploy/state.clixml'
    foreach ($答案 in @('1','demo',('a'*32),('x'*40),'owner/repo','','first-password','first-password','','demo')) { $script:回答.Enqueue($答案) }
    启动重建程序
    Assert ((读取部署状态 $文件).phase -eq 'complete') 'Interactive initial flow did not finish'
    Assert (@($script:请求 | Where-Object { $_ -like 'DELETE *' }).Count -eq $删除数) 'Interactive first deploy deleted project'
    $首次ID=$script:远端.deployment_configs.production.kv_namespaces.KV.namespace_id
    foreach ($取消确认 in @('取消', $null)) {
        $请求起点=$script:请求.Count
        foreach ($答案 in @('2','',$取消确认)) { $script:回答.Enqueue($答案) }
        启动重建程序
        Assert (@($script:请求 | Select-Object -Skip $请求起点 | Where-Object { $_ -notlike 'GET *' }).Count -eq 0) 'Rejected confirmation changed Cloudflare resources'
        Assert ((读取部署状态 $文件).phase -eq 'complete') 'Rejected confirmation changed saved deployment state'
    }
    foreach ($答案 in @('2','','')) { $script:回答.Enqueue($答案) }
    启动重建程序
    Assert ($script:远端.deployment_configs.production.kv_namespaces.KV.namespace_id -eq $首次ID) 'Interactive repeat replaced storage'
    Assert ($script:远端.deployment_configs.production.env_vars.ADMIN.value -ceq 'first-password') 'Interactive repeat lost cached password'
    Assert ($script:回答.Count -eq 0) 'Unused interactive answers'
} finally { $env:LOCALAPPDATA=$原应用数据 }
Assert (@($script:请求 | Where-Object { $_ -like 'DELETE *' }).Count -eq ($删除数+1)) 'Repeat should delete exactly once'
Write-Host 'PASS: first/repeat selection, KV reuse, encrypted backup, domain detach/restore, deletion boundaries and interrupted recovery.'
