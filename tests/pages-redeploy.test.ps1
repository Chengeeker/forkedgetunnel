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
function 调用CF接口 {
    param($状态, [string]$方法, [string]$路径, $内容=$null, [switch]$表单)
    $script:请求.Add("$方法 $路径")
    $基础="/accounts/$($状态.account)/pages/projects/demo"
    if ($路径 -like '*/storage/kv/namespaces[?]*') { return @([pscustomobject]@{id=('b'*32); title='stable-KV'}) }
    if ($路径 -like '*/storage/kv/namespaces/*') { return @{id=$路径.Split('/')[-1]} }
    if ($方法 -eq 'GET' -and $路径 -eq $基础) { return $script:远端 }
    if ($方法 -eq 'DELETE') {
        Assert ($路径 -eq $基础) 'Deleted non-project resource'
        Assert ((读取部署状态 $文件).phase -eq 'prepared') 'Delete happened before encrypted backup'
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
$项目.deployment_configs.production.env_vars.CLOUDFLARE_ACCOUNT_ID.value=('d'*32)
Throws { 检查原KV (State) $项目 } '不同'

$状态=State; $状态.plan=$缓存计划
保存部署状态 $文件 $状态
执行重建 $状态 $文件
Assert ($状态.phase -eq 'complete') 'Rebuild did not complete'
Assert ($script:远端.domains -contains 'demo.example.com') 'Custom domain not restored'
Assert ($script:远端.deployment_configs.production.env_vars.ADMIN.value -eq 'original-admin') 'ADMIN not restored'
Assert (@($script:请求 | Where-Object { $_ -like 'DELETE *' }).Count -eq 1) 'Unexpected deletes'

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
Write-Host 'PASS: encrypted backup, secrets, KV preservation, domain recovery, failure and interrupted rebuild cases.'
