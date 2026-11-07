# SPDX-License-Identifier: GPL-2.0
$ErrorActionPreference = 'Stop'
$根目录 = Split-Path $PSScriptRoot -Parent
& (Join-Path $根目录 'scripts/build-pages-deploy.ps1')
$输出目录 = Join-Path $根目录 'build/pages-deploy/release'
$压缩包路径 = Join-Path $输出目录 'Pages-Deploy-Windows.zip'
$预期文件 = @{
    'redeploy-pages.cmd' = 'redeploy-pages.cmd'
    'refresh-pages-token.cmd' = 'refresh-pages-token.cmd'
    'scripts/redeploy-pages.ps1' = 'scripts/redeploy-pages.ps1'
    '使用说明.txt' = 'docs/pages-deploy-package.txt'
    'LICENSE' = 'LICENSE'
}
$压缩包 = [IO.Compression.ZipFile]::OpenRead($压缩包路径)
try {
    if ($压缩包.Entries.Count -ne $预期文件.Count) { throw 'Unexpected package files' }
    foreach ($文件 in $压缩包.Entries) {
        if (-not $预期文件.ContainsKey($文件.FullName)) { throw 'Unexpected package entry' }
        $流 = $文件.Open()
        $散列 = [Security.Cryptography.SHA256]::Create()
        try { $实际 = [BitConverter]::ToString($散列.ComputeHash($流)).Replace('-', '') }
        finally { $流.Dispose(); $散列.Dispose() }
        if ($实际 -ne (Get-FileHash -LiteralPath (Join-Path $根目录 $预期文件[$文件.FullName])).Hash) { throw 'Packaged source differs from repository' }
    }
    $部署脚本 = $压缩包.GetEntry('scripts/redeploy-pages.ps1').Open()
    try { if ($部署脚本.ReadByte() -ne 239 -or $部署脚本.ReadByte() -ne 187 -or $部署脚本.ReadByte() -ne 191) { throw 'PowerShell 5.1 UTF-8 BOM missing' } }
    finally { $部署脚本.Dispose() }
} finally { $压缩包.Dispose() }
foreach ($入口 in @('redeploy-pages.cmd','refresh-pages-token.cmd')) {
    if (-not ([IO.File]::ReadAllText((Join-Path $根目录 $入口))).Contains('%~dp0scripts\redeploy-pages.ps1')) { throw 'CMD dependency path changed' }
}
$预期校验 = (Get-FileHash -LiteralPath $压缩包路径).Hash.ToLowerInvariant() + '  Pages-Deploy-Windows.zip'
if ((Get-Content -LiteralPath (Join-Path $输出目录 'SHA256SUMS.txt') -Raw).Trim() -cne $预期校验) { throw 'Checksum mismatch' }
Write-Host 'PASS: complete CMD package, exact file allowlist, source hashes, PowerShell BOM and ZIP checksum.'
